import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WiseAccountDto, WiseApproveDto, WiseCompleteDto, WiseVerifyDto } from '../src/payments/wise-payout.dto';
import { WisePayoutService } from '../src/payments/wise-payout.service';
import { wiseReady, wisePayoutQuote } from '../src/payments/wise-payout.policy';
import { MarketplacePaymentAdminController, CreatorPayoutController } from '../src/payments/marketplace-payment.controllers';

test('Wise payout DTOs require ownership, verification, eligibility and completed-transfer attestation',async()=>{
  for(const [type,value] of [[WiseAccountDto,{email:'bad',legalName:'x',ownsAccount:false}],[WiseVerifyDto,{code:'123'}],[WiseApproveDto,{recipientSupported:false,reviewNote:'x'}],[WiseCompleteDto,{reference:'000012345',email:'bad',amountUsdMinor:0,confirmedCompleted:false}]] as const){
    assert.ok((await validate(plainToInstance(type as any,value))).length>0);
  }
  assert.equal((await validate(plainToInstance(WiseCompleteDto,{reference:'12345678',email:'creator@example.com',amountUsdMinor:10000,confirmedCompleted:true}))).length,0);
});
test('email access alone does not activate Wise payouts; USD conversion stays separate from KES collection',()=>{
  assert.equal(wiseReady({provider:'WISE',payoutsEnabled:false,onboardingStatus:'PENDING',wiseEmailVerifiedAt:new Date()}),false);
  assert.equal(wiseReady({provider:'WISE',payoutsEnabled:true,onboardingStatus:'ACTIVE',wiseEmailVerifiedAt:null}),false);
  assert.equal(wiseReady({provider:'WISE',payoutsEnabled:true,onboardingStatus:'ACTIVE',wiseEmailVerifiedAt:new Date()}),true);
  assert.equal(wisePayoutQuote(1300000,'KES').amountMinor,10000);assert.equal(wisePayoutQuote(10000,'USD').currencyCode,'USD');
});
test('creator and admin Wise routes retain separate server-enforced roles',()=>{
  assert.deepEqual(Reflect.getMetadata('roles',MarketplacePaymentAdminController),['ADMIN']);
  assert.deepEqual(Reflect.getMetadata('roles',CreatorPayoutController),['CREATOR']);
});
test('payout responses cannot expose Wise verification hashes or attempts',()=>{
  const service=new WisePayoutService({} as never,{} as never);
  const value=service.safeAccount({id:'a',provider:'WISE',wiseCodeHash:'SECRET_HASH',wiseCodeAttempts:4,wiseEmail:'creator@example.com',onboardingStatus:'PENDING',payoutsEnabled:false,wiseCodeExpiresAt:new Date(Date.now()+1000)});
  assert.equal('wiseCodeHash' in value,false);assert.equal('wiseCodeAttempts' in value,false);assert.equal(JSON.stringify(value).includes('SECRET_HASH'),false);
});
