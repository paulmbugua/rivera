import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { WisePayoutService } from '../src/payments/wise-payout.service';
import { MarketplacePaymentService } from '../src/payments/marketplace-payment.service';

const code=(expected:string)=>(error:any)=>error.getResponse?.().code===expected;
test('Wise manual payouts: real PostgreSQL lifecycle and concurrency',{skip:!process.env.WISE_TEST_DATABASE_URL},async t=>{
  const url=new URL(process.env.WISE_TEST_DATABASE_URL!);
  assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/rivera_wise_test');
  const db=new PrismaClient({datasourceUrl:url.toString()});const suffix=randomUUID();
  const user=async(role:'ADMIN'|'BUSINESS'|'CREATOR')=>db.user.create({data:{email:`${role}-${randomUUID()}@example.invalid`,firstName:'Test',lastName:role,status:'ACTIVE',emailVerifiedAt:new Date(),roles:{create:{role}}}});
  let sentCode='';const wise=new WisePayoutService(db as never,{sendWiseVerificationEmail:async(_email:string,value:string)=>{sentCode=value;}} as never);
  let providerTransferCalls=0;
  const provider={providerName:'PAYSTACK',payoutOnboardingMode:'MPESA',createTransfer:async()=>{providerTransferCalls++;throw new Error('Wise must not use Paystack transfers');},retrieveTransfer:async()=>{providerTransferCalls++;throw new Error('Wise must not use Paystack reconciliation');}};
  const market=new MarketplacePaymentService(db as never,provider as never,wise);
  try{
    const [creatorUser,businessUser,admin,otherAdmin]=await Promise.all([user('CREATOR'),user('BUSINESS'),user('ADMIN'),user('ADMIN')]);
    const creator=await db.creatorProfile.create({data:{userId:creatorUser.id,slug:`creator-${suffix}`,displayName:'International Creator',country:'US',bio:'Test bio'}});
    const business=await db.businessProfile.create({data:{userId:businessUser.id,slug:`business-${suffix}`,name:'Test Business',country:'KE',description:'Test business'}});
    const details={email:'wise-owner@example.invalid',legalName:'Test Wise Recipient',ownsAccount:true};let accountId='';
    await t.test('email ownership is single-use, rate-limited, attempt-limited and separate from approval',async()=>{
      const initial=await market.payoutAccount(creatorUser.id);assert.equal(initial.setupMode,'WISE_MANUAL');assert.equal(initial.payoutsEnabled,false);
      const saved=await wise.save(creatorUser.id,details);accountId=saved.account.id;
      assert.match(sentCode,/^\d{8}$/);assert.equal(saved.account.payoutsEnabled,false);
      const stored=await db.creatorPayoutAccount.findUniqueOrThrow({where:{id:accountId}});assert.equal(stored.wiseCodeHash?.length,64);assert.notEqual(stored.wiseCodeHash,sentCode);
      await assert.rejects(wise.save(creatorUser.id,details),code('WISE_CODE_RATE_LIMIT'));
      await assert.rejects(wise.approve(admin.id,accountId,{recipientSupported:true,reviewNote:'Checked Wise USD receiving details'}),code('WISE_EMAIL_NOT_VERIFIED'));
      await assert.rejects(wise.verify(creatorUser.id,'00000000'),code('WISE_CODE_INVALID'));
      assert.equal((await db.creatorPayoutAccount.findUniqueOrThrow({where:{id:accountId}})).wiseCodeAttempts,1);
      await db.creatorPayoutAccount.update({where:{id:accountId},data:{wiseCodeAttempts:5}});
      await assert.rejects(wise.verify(creatorUser.id,sentCode),code('WISE_CODE_INVALID'));
      await db.creatorPayoutAccount.update({where:{id:accountId},data:{wiseCodeAttempts:1}});
      const verified=await wise.verify(creatorUser.id,sentCode);assert.equal(verified.account?.payoutsEnabled,false);assert.equal(verified.account?.wiseEmailVerified,true);
      await assert.rejects(wise.verify(creatorUser.id,sentCode),code('WISE_CODE_INVALID'));
      assert.equal((await db.creatorPayoutAccount.findUniqueOrThrow({where:{id:accountId}})).wiseCodeHash,null);
    });
    async function paymentFixture(){
      const campaign=await db.campaign.create({data:{businessId:business.id,title:'Test Campaign',slug:`campaign-${randomUUID()}`,currencyCode:'USD'}});
      const application=await db.campaignApplication.create({data:{campaignId:campaign.id,creatorId:creator.id,proposedAmountMinor:10000,proposedCurrencyCode:'USD',pitch:'Test proposal'}});
      const offer=await db.collaborationOffer.create({data:{applicationId:application.id,campaignId:campaign.id,businessId:business.id,creatorId:creator.id,version:1,compensationMinor:10000,currencyCode:'USD',deliverablesSummary:'Test work'}});
      const participant=await db.campaignParticipant.create({data:{campaignId:campaign.id,businessId:business.id,creatorId:creator.id,applicationId:application.id,offerId:offer.id,status:'COMPLETED',agreedCompensationMinor:10000,currencyCode:'USD'}});
      await db.campaignWorkItem.create({data:{campaignParticipantId:participant.id,campaignId:campaign.id,creatorId:creator.id,businessId:business.id,title:'Approved test work',status:'APPROVED',required:true}});
      return db.collaborationPayment.create({data:{campaignParticipantId:participant.id,campaignId:campaign.id,creatorId:creator.id,businessId:business.id,provider:'PAYSTACK',currencyCode:'USD',grossAmountMinor:11000,creatorNetMinor:10000,platformFeeMinor:1000,fundedAmountMinor:11000,status:'FUNDED',fundedAt:new Date()}});
    }
    const payment=await paymentFixture();let transferId='',claimer='';
    await t.test('funding is blocked until review; approved details are locked',async()=>{
      await assert.rejects(market.fund(businessUser.id,payment.campaignParticipantId),code('PAYOUT_COUNTRY_UNSUPPORTED'));
      const approved=await wise.approve(admin.id,accountId,{recipientSupported:true,reviewNote:'Checked name, email route, USD receiving and eligibility in Wise'});assert.equal(approved.payoutsEnabled,true);
      await assert.rejects(wise.save(creatorUser.id,details),code('WISE_ACCOUNT_LOCKED'));
      const rows=await market.businessPayments(businessUser.id);assert.equal(rows.find(p=>p.id===payment.id)?.payoutCountrySupported,true);
    });
    await t.test('only the Business can release completed approved work; queueing does not mean paid',async()=>{
      await assert.rejects(market.release(creatorUser.id,payment.id),code('PAYMENT_RELEASE_ACCESS_DENIED'));
      const result=await market.release(businessUser.id,payment.id);transferId=result.id;
      assert.equal(result.provider,'WISE');assert.equal(providerTransferCalls,0);
      const queued=await db.creatorTransfer.findUniqueOrThrow({where:{id:transferId}});assert.equal(queued.wiseAmountUsdMinor,10000);assert.equal(queued.wiseEmail,details.email);assert.equal(queued.wiseLegalName,details.legalName);
      const state=await db.collaborationPayment.findUniqueOrThrow({where:{id:payment.id}});assert.equal(state.status,'PAYOUT_PENDING');assert.equal(state.releasedAmountMinor,0);
      await assert.rejects(market.release(businessUser.id,payment.id),code('PAYMENT_ALREADY_RELEASED'));
      await market.reconcile(payment.id);assert.equal(providerTransferCalls,0);
      await assert.rejects(market.adminRefund(admin.id,payment.id,{amountMinor:100,reason:'This payout is already queued'}),code('PAYMENT_NOT_REFUNDABLE'));
    });
    await t.test('two administrators cannot both claim one payout',async()=>{
      const outcomes=await Promise.allSettled([wise.claim(admin.id,transferId),wise.claim(otherAdmin.id,transferId)]);
      assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.filter(r=>r.status==='rejected').length,1);
      claimer=(await db.creatorTransfer.findUniqueOrThrow({where:{id:transferId}})).wiseClaimedBy!;
    });
    const confirmation={reference:`${Date.now()}1`,email:details.email,amountUsdMinor:10000,confirmedCompleted:true};
    await t.test('completion requires the claiming admin, exact amount, recipient, and explicit confirmation',async()=>{
      const notClaimer=claimer===admin.id?otherAdmin.id:admin.id;
      await assert.rejects(wise.complete(notClaimer,transferId,confirmation),code('WISE_CLAIM_REQUIRED'));
      await assert.rejects(wise.complete(claimer,transferId,{...confirmation,amountUsdMinor:9999}),code('WISE_CONFIRMATION_MISMATCH'));
      await assert.rejects(wise.complete(claimer,transferId,{...confirmation,email:'other@example.invalid'}),code('WISE_CONFIRMATION_MISMATCH'));
      await assert.rejects(wise.complete(claimer,transferId,{...confirmation,confirmedCompleted:false}),code('WISE_COMPLETION_CONFIRMATION_REQUIRED'));
    });
    await t.test('concurrent completions settle once and notify once',async()=>{
      const before=await db.notification.count({where:{type:'WISE_PAYOUT_COMPLETED'}});
      const results=await Promise.all([wise.complete(claimer,transferId,confirmation),wise.complete(claimer,transferId,confirmation)]);
      assert.ok(results.some((r:any)=>r.duplicate===true));
      assert.equal(await db.notification.count({where:{type:'WISE_PAYOUT_COMPLETED'}}),before+2);
      assert.equal(await db.adminAuditLog.count({where:{targetId:transferId,action:'WISE_PAYOUT_MANUALLY_CONFIRMED'}}),1);
      const state=await db.collaborationPayment.findUniqueOrThrow({where:{id:payment.id}});assert.equal(state.status,'SETTLED');assert.equal(state.releasedAmountMinor,10000);
    });
    await t.test('a Wise transfer ID cannot settle two payouts; collision rolls back',async()=>{
      const second=await paymentFixture();const queued=await market.release(businessUser.id,second.id);await wise.claim(admin.id,queued.id);
      await assert.rejects(wise.complete(admin.id,queued.id,confirmation),code('WISE_REFERENCE_ALREADY_USED'));
      assert.equal((await db.creatorTransfer.findUniqueOrThrow({where:{id:queued.id}})).status,'PROCESSING');
      assert.equal((await db.collaborationPayment.findUniqueOrThrow({where:{id:second.id}})).releasedAmountMinor,0);
      await wise.complete(admin.id,queued.id,{...confirmation,reference:`${Date.now()}2`});
    });
    await t.test('Wise verification codes and private recipient details do not leak to Business responses',async()=>{
      const dashboard=await wise.dashboard();assert.equal(JSON.stringify(dashboard).includes('wiseCodeHash'),false);
      const rows=await market.businessPayments(businessUser.id);assert.equal(JSON.stringify(rows).includes(details.email),false);
    });
    await t.test('Kenyan creators retain the M-Pesa setup',async()=>{
      const kenyanUser=await user('CREATOR');await db.creatorProfile.create({data:{userId:kenyanUser.id,slug:`kenyan-${suffix}`,displayName:'Kenyan Creator',country:'KE',bio:'Test'}});
      const account=await market.payoutAccount(kenyanUser.id);assert.equal(account.provider,'PAYSTACK');assert.equal(account.setupMode,'MPESA');
    });
    await t.test('expired codes and failed email delivery never enable payouts',async()=>{
      const extraUser=await user('CREATOR');const profile=await db.creatorProfile.create({data:{userId:extraUser.id,slug:`extra-${suffix}`,displayName:'Test Extra',country:'QA',bio:'Test'}});
      await wise.save(extraUser.id,details);
      await db.creatorPayoutAccount.update({where:{creatorId:profile.id},data:{wiseCodeExpiresAt:new Date(Date.now()-1000)}});
      await assert.rejects(wise.verify(extraUser.id,sentCode),code('WISE_CODE_INVALID'));
      const failing=new WisePayoutService(db as never,{sendWiseVerificationEmail:async()=>{throw new Error('SMTP test failure');}} as never);
      await assert.rejects(failing.save(extraUser.id,details),code('WISE_VERIFICATION_EMAIL_FAILED'));
      const row=await db.creatorPayoutAccount.findUniqueOrThrow({where:{creatorId:profile.id}});
      assert.equal(row.payoutsEnabled,false);assert.equal(row.wiseCodeHash,null);assert.equal(row.wiseEmailVerifiedAt,null);
    });
  }finally{await db.$disconnect();}
});
