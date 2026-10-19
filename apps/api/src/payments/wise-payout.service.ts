/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../common/prisma.service';
import { ApiException } from '../common/api-error';
import { MailService } from '../auth/mail.service';
import { convertMinor } from '../applications/currency-policy';
import { WiseAccountDto, WiseApproveDto, WiseCompleteDto } from './wise-payout.dto';
import { wiseReady } from './wise-payout.policy';
import { nextPayoutMonday, payoutDateLabel } from './payout-schedule';

const digest = (creatorId:string,code:string) => createHash('sha256').update(`wise-email:${creatorId}:${code}`).digest('hex');
@Injectable()
export class WisePayoutService {
  constructor(private db:PrismaService, private mail:MailService) {}
  private async transaction<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T> {
    for(let attempt=0;;attempt++){
      try{return await this.db.$transaction(work,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
      catch(error){if((error as {code?:string}).code!=='P2034')throw error;if(attempt>=2)this.fail('WISE_REQUEST_BUSY','This record changed while you were working. Refresh and try again.');}
    }
  }
  private fail(code:string,message:string,status=HttpStatus.CONFLICT):never {throw new ApiException(status,code,message);}
  safeAccount(row:any) {
    return {id:row.id,provider:'WISE',setupMode:'WISE_MANUAL',onboardingStatus:row.onboardingStatus,payoutsEnabled:wiseReady(row),
      payoutCountrySupported:true,wiseEmail:row.wiseEmail,wiseLegalName:row.wiseLegalName,wiseEmailVerified:!!row.wiseEmailVerifiedAt,
      verificationPending:!!row.wiseCodeHash && !!row.wiseCodeExpiresAt && row.wiseCodeExpiresAt>new Date(),
      defaultCurrencyCode:'USD',manualPayouts:true};
  }
  private audit(tx:Prisma.TransactionClient,actorId:string,action:string,targetType:string,targetId:string,metadata?:Prisma.InputJsonValue) {
    return tx.adminAuditLog.create({data:{actorId,action,targetType,targetId,metadata}});
  }
  private async notifyAdmins(tx:Prisma.TransactionClient,type:string,title:string,body:string) {
    const admins=await tx.user.findMany({where:{status:'ACTIVE',roles:{some:{role:'ADMIN'}}},select:{id:true},take:100});
    if(admins.length)await tx.notification.createMany({data:admins.map(user=>({userId:user.id,type,title,body}))});
  }
  async save(userId:string,dto:WiseAccountDto) {
    if(!dto.ownsAccount)this.fail('WISE_ACCOUNT_CONSENT_REQUIRED','Confirm that this is your own Wise account.',HttpStatus.BAD_REQUEST);
    const code=String(randomInt(10_000_000,100_000_000));
    const row=await this.transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`wise-account:${userId}`}))::text`;
      const creator=await tx.creatorProfile.findUnique({where:{userId},include:{payoutAccount:true}});
      if(!creator)this.fail('CREATOR_PROFILE_REQUIRED','Complete your Creator profile first.',HttpStatus.FORBIDDEN);
      if(creator.country==='KE'&&!creator.payoutAccount)this.fail('WISE_COUNTRY_ROUTE','Kenyan creators should use the M-Pesa payout setup.');
      const existing=creator.payoutAccount;
      if(existing && existing.provider!=='WISE')this.fail('PAYOUT_PROVIDER_MIGRATION_REQUIRED','Contact support to change payout providers safely.');
      if(existing?.onboardingStatus==='ACTIVE')this.fail('WISE_ACCOUNT_LOCKED','Your approved Wise details are locked. Contact support to change them safely.');
      if(existing?.wiseCodeExpiresAt && existing.wiseCodeExpiresAt.getTime()>Date.now()+29*60_000)
        this.fail('WISE_CODE_RATE_LIMIT','Wait one minute before requesting another code.',HttpStatus.TOO_MANY_REQUESTS);
      const data={wiseEmail:dto.email,wiseLegalName:dto.legalName,wiseEmailVerifiedAt:null,wiseCodeHash:digest(creator.id,code),
        wiseCodeExpiresAt:new Date(Date.now()+30*60_000),wiseCodeAttempts:0,wiseReviewedBy:null,wiseReviewedAt:null,
        onboardingStatus:'PENDING' as const,payoutsEnabled:false,detailsSubmitted:true,defaultCurrencyCode:'USD'};
      const account=await tx.creatorPayoutAccount.upsert({where:{creatorId:creator.id},
        create:{creatorId:creator.id,provider:'WISE',providerAccountId:`wise-manual:${creator.id}`,countryCode:creator.country,...data},update:data});
      await this.audit(tx,userId,'WISE_PAYOUT_DETAILS_SAVED','CreatorPayoutAccount',account.id);
      return account;
    });
    try{await this.mail.sendWiseVerificationEmail(row.wiseEmail!,code);}catch{
      await this.db.creatorPayoutAccount.updateMany({where:{id:row.id,wiseCodeHash:row.wiseCodeHash},data:{wiseCodeHash:null,wiseCodeExpiresAt:null}});
      this.fail('WISE_VERIFICATION_EMAIL_FAILED','We could not send the verification code. Please try again.',HttpStatus.SERVICE_UNAVAILABLE);
    }
    return {account:this.safeAccount(row),message:'Check your Wise email for an 8-digit code. It expires in 30 minutes.'};
  }
  async verify(userId:string,code:string) {
    const result=await this.transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`wise-account:${userId}`}))::text`;
      const creator=await tx.creatorProfile.findUnique({where:{userId},include:{payoutAccount:true}});
      const account=creator?.payoutAccount;
      if(!creator||!account||account.provider!=='WISE'||!account.wiseCodeHash||!account.wiseCodeExpiresAt||account.wiseCodeExpiresAt<=new Date())
        return {error:'This code is invalid or expired. Request a new code.'};
      if(account.wiseCodeAttempts>=5)return {error:'Too many incorrect attempts. Request a new code.'};
      const expected=Buffer.from(account.wiseCodeHash,'hex'), supplied=Buffer.from(digest(creator.id,code),'hex');
      if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied)){
        await tx.creatorPayoutAccount.update({where:{id:account.id},data:{wiseCodeAttempts:{increment:1}}});
        return {error:'That code is not correct. Check your Wise email.'};
      }
      const row=await tx.creatorPayoutAccount.update({where:{id:account.id},data:{wiseEmailVerifiedAt:new Date(),wiseCodeHash:null,wiseCodeExpiresAt:null,wiseCodeAttempts:0}});
      await this.audit(tx,userId,'WISE_EMAIL_VERIFIED','CreatorPayoutAccount',account.id);
      await tx.notification.create({data:{userId,creatorId:creator.id,type:'WISE_PAYOUT_REVIEW_PENDING',title:'Wise email verified',body:'Rivera will review your payout details before your Wise account can receive released earnings.'}});
      await this.notifyAdmins(tx,'WISE_PAYOUT_REVIEW_REQUESTED','Wise payout details need review','A creator verified their Wise email. Open the Wise payout desk to review recipient eligibility.');
      return {account:this.safeAccount(row)};
    });
    if(result.error)this.fail('WISE_CODE_INVALID',result.error,HttpStatus.BAD_REQUEST);
    return result;
  }
  async approve(adminId:string,id:string,dto:WiseApproveDto) {
    if(!dto.recipientSupported)this.fail('WISE_REVIEW_REQUIRED','Check recipient eligibility in Wise before approving.',HttpStatus.BAD_REQUEST);
    return this.transaction(async tx=>{
      const owner=await tx.creatorPayoutAccount.findUnique({where:{id},select:{creator:{select:{userId:true}}}});
      if(!owner)this.fail('WISE_ACCOUNT_NOT_FOUND','Wise account not found.',HttpStatus.NOT_FOUND);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`wise-account:${owner.creator.userId}`}))::text`;
      const row=await tx.creatorPayoutAccount.findUnique({where:{id},include:{creator:{select:{userId:true}}}});
      if(!row||row.provider!=='WISE')this.fail('WISE_ACCOUNT_NOT_FOUND','Wise account not found.',HttpStatus.NOT_FOUND);
      if(!row.wiseEmailVerifiedAt||!row.wiseEmail||!row.wiseLegalName)this.fail('WISE_EMAIL_NOT_VERIFIED','The creator must verify their Wise email first.');
      if(row.onboardingStatus==='ACTIVE')return this.safeAccount(row);
      const updated=await tx.creatorPayoutAccount.update({where:{id},data:{onboardingStatus:'ACTIVE',payoutsEnabled:true,wiseReviewedAt:new Date(),wiseReviewedBy:adminId}});
      await this.audit(tx,adminId,'WISE_ACCOUNT_APPROVED','CreatorPayoutAccount',id,{reviewNote:dto.reviewNote,recipientSupported:dto.recipientSupported});
      await tx.notification.create({data:{userId:row.creator.userId,creatorId:row.creatorId,type:'WISE_PAYOUT_ACCOUNT_READY',title:'Wise payout details approved',body:'Approved earnings can now enter Rivera’s admin-assisted Wise payout queue. Payments are not automatic.'}});
      return this.safeAccount(updated);
    });
  }
  async queue(tx:Prisma.TransactionClient,payment:any,actorId:string) {
    const account=payment.campaignParticipant.creator.payoutAccount;
    if(!wiseReady(account))this.fail('WISE_ACCOUNT_NOT_READY','Verify your Wise email and complete the admin review first.');
    const usd=convertMinor(payment.creatorNetMinor,payment.currencyCode,'USD');
    if(usd<1)this.fail('WISE_PAYOUT_TOO_SMALL','Wise payouts must be at least USD 0.01.');
    const scheduledFor=nextPayoutMonday();
    const row=await tx.creatorTransfer.create({data:{collaborationPaymentId:payment.id,creatorId:payment.creatorId,provider:'WISE',
      providerTransferId:`wise-queue:${payment.id}`,amountMinor:payment.creatorNetMinor,currencyCode:payment.currencyCode,status:'SCHEDULED',scheduledFor,
      wiseEmail:account.wiseEmail,wiseLegalName:account.wiseLegalName,wiseAmountUsdMinor:usd}});
    await tx.collaborationPayment.update({where:{id:payment.id},data:{status:'PAYOUT_PENDING',eligibleForReleaseAt:scheduledFor}});
    await this.audit(tx,actorId,'WISE_PAYOUT_SCHEDULED','CreatorTransfer',row.id,{paymentId:payment.id,amountUsdMinor:usd,scheduledFor:scheduledFor.toISOString()});
    await tx.notification.create({data:{userId:payment.campaignParticipant.creator.userId,creatorId:payment.creatorId,
      type:'WISE_PAYOUT_SCHEDULED',title:'Your Wise payout is scheduled',body:`Approved earnings enter the ${payoutDateLabel(scheduledFor)} batch. An administrator must then send and confirm the Wise transfer. Scheduled does not mean paid.`}});
    return {id:row.id,provider:row.provider,status:row.status,amountMinor:row.amountMinor,currencyCode:row.currencyCode,wiseAmountUsdMinor:usd,scheduledFor};
  }
  async dashboard() {
    const include={creator:{select:{displayName:true}},collaborationPayment:{select:{campaign:{select:{title:true}}}}};
    const [accounts,processing,pending,recent,scheduled]=await Promise.all([
      this.db.creatorPayoutAccount.findMany({where:{provider:'WISE',onboardingStatus:{in:['PENDING','RESTRICTED']}},include:{creator:{select:{displayName:true,country:true}}},orderBy:{updatedAt:'asc'},take:100}),
      this.db.creatorTransfer.findMany({where:{provider:'WISE',status:'PROCESSING'},include,orderBy:{createdAt:'asc'},take:100}),
      this.db.creatorTransfer.findMany({where:{provider:'WISE',status:'PENDING'},include,orderBy:{createdAt:'asc'},take:100}),
      this.db.creatorTransfer.findMany({where:{provider:'WISE',status:'SUCCEEDED'},include,orderBy:{settledAt:'desc'},take:20}),
      this.db.creatorTransfer.findMany({where:{provider:'WISE',status:'SCHEDULED'},include,orderBy:{scheduledFor:'asc'},take:100}),
    ]);
    return {accounts:accounts.map(row=>({...this.safeAccount(row),creator:row.creator})),transfers:[...processing,...pending,...scheduled,...recent]};
  }
  async claim(adminId:string,id:string) {
    return this.transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`wise-operator:${adminId}`}))::text`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`wise-transfer:${id}`}))::text`;
      const row=await tx.creatorTransfer.findUnique({where:{id},include:{collaborationPayment:{include:{issues:true,refunds:true}},creator:{include:{payoutAccount:true,user:{select:{status:true}}}}}});
      if(!row||row.provider!=='WISE')this.fail('WISE_TRANSFER_NOT_FOUND','Wise payout not found.',HttpStatus.NOT_FOUND);
      if(row.status==='SCHEDULED'||(row.scheduledFor&&row.scheduledFor>new Date()))this.fail('PAYOUT_NOT_DUE','This payout is scheduled for the next Monday batch. Wait for the worker to release it.');
      if(row.collaborationPayment.status!=='PAYOUT_PENDING'||row.collaborationPayment.refundedAmountMinor>0||row.collaborationPayment.releasedAmountMinor>0||row.collaborationPayment.issues.some(x=>['OPEN','UNDER_REVIEW'].includes(x.status))||row.collaborationPayment.refunds.some(x=>x.status==='PENDING')||row.creator.user.status!=='ACTIVE'||!wiseReady(row.creator.payoutAccount)||row.creator.payoutAccount?.wiseEmail!==row.wiseEmail||row.creator.payoutAccount?.wiseLegalName!==row.wiseLegalName)this.fail('PAYOUT_SAFETY_HOLD','Resolve the payment or account hold before sending this payout.');
      if(row.status==='PROCESSING'&&row.wiseClaimedBy===adminId)return tx.creatorTransfer.findUniqueOrThrow({where:{id}});
      if(row.status!=='PENDING')this.fail('WISE_PAYOUT_ALREADY_CLAIMED','This payout is completed or already claimed by another admin. Do not send another payment.');
      if(await tx.creatorTransfer.findFirst({where:{provider:'WISE',status:'PROCESSING',wiseClaimedBy:adminId,id:{not:id}}}))
        this.fail('WISE_FINISH_CURRENT_PAYOUT','Finish your already-claimed Wise payout before claiming another. If its outcome is uncertain, contact support; do not send again.');
      const updated=await tx.creatorTransfer.update({where:{id},data:{status:'PROCESSING',wiseClaimedBy:adminId,wiseClaimedAt:new Date()}});
      await this.audit(tx,adminId,'WISE_PAYOUT_CLAIMED','CreatorTransfer',id);
      return updated;
    });
  }
  async complete(adminId:string,id:string,dto:WiseCompleteDto) {
    if(!dto.confirmedCompleted)this.fail('WISE_COMPLETION_CONFIRMATION_REQUIRED','Confirm that Wise shows this transfer as completed.',HttpStatus.BAD_REQUEST);
    try{return await this.transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`wise-transfer:${id}`}))::text`;
      const row=await tx.creatorTransfer.findUnique({where:{id},include:{collaborationPayment:{include:{business:{select:{userId:true}},campaignParticipant:true}},creator:{select:{userId:true}}}});
      if(!row||row.provider!=='WISE')this.fail('WISE_TRANSFER_NOT_FOUND','Wise payout not found.',HttpStatus.NOT_FOUND);
      if(row.wiseAmountUsdMinor!==dto.amountUsdMinor||row.wiseEmail!==dto.email)this.fail('WISE_CONFIRMATION_MISMATCH','Recipient email and USD amount must exactly match the queued payout.');
      if(row.status==='SUCCEEDED'){
        if(row.wiseTransferReference===dto.reference)return {id:row.id,status:row.status,duplicate:true};
        this.fail('WISE_ALREADY_PAID','This payout is already completed.');
      }
      if(row.status!=='PROCESSING'||row.wiseClaimedBy!==adminId)this.fail('WISE_CLAIM_REQUIRED','Claim this payout before sending money. Only the claiming admin can confirm it.');
      const payment=row.collaborationPayment;
      if(payment.status!=='PAYOUT_PENDING'||payment.refundedAmountMinor>0||payment.releasedAmountMinor>0||payment.creatorNetMinor!==row.amountMinor||payment.currencyCode!==row.currencyCode||payment.fundedAmountMinor<row.amountMinor)this.fail('WISE_PAYMENT_STATE_INVALID','This payment is not eligible for payout confirmation.');
      const now=new Date();
      const updated=await tx.creatorTransfer.update({where:{id},data:{status:'SUCCEEDED',wiseTransferReference:dto.reference,wiseCompletedBy:adminId,releasedAt:now,settledAt:now}});
      await tx.collaborationPayment.update({where:{id:payment.id},data:{status:'SETTLED',releasedAmountMinor:row.amountMinor,releasedAt:now,settledAt:now}});
      await this.audit(tx,adminId,'WISE_PAYOUT_MANUALLY_CONFIRMED','CreatorTransfer',id,{reference:dto.reference,amountUsdMinor:dto.amountUsdMinor,confirmationSource:'ADMIN_ATTESTATION'});
      await tx.notification.createMany({data:[
        {userId:row.creator.userId,creatorId:row.creatorId,type:'WISE_PAYOUT_COMPLETED',title:'Wise payout marked completed',body:'Rivera recorded a completed Wise transfer for your released earnings. Check Wise for the transfer. Contact support if it has not arrived.'},
        {userId:payment.business.userId,businessId:payment.businessId,type:'WISE_PAYOUT_COMPLETED',title:'Creator payout completed',body:'A Rivera administrator recorded completion of the creator’s Wise payout.'},
      ]});
      return {id:updated.id,status:updated.status};
    });}catch(error){
      if((error as {code?:string}).code==='P2002')this.fail('WISE_REFERENCE_ALREADY_USED','That Wise transfer ID has already been recorded. Do not send another payment.');
      throw error;
    }
  }
}
