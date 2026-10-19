import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { accountCurrency, convertMinor, settlementQuote } from '../src/applications/currency-policy';
import { PaystackPaymentProvider } from '../src/applications/paystack-payment.provider';
import { ApplicationFeeService } from '../src/applications/fee.service';
import { MarketplacePaymentService } from '../src/payments/marketplace-payment.service';
import { ApplicationsService } from '../src/applications/applications.service';
import { AuthService } from '../src/auth/auth.service';

const errorCode = (code: string) => (error: any) => error.getResponse?.().code === code;
test('country preferences use KES only for Kenya, USD elsewhere', () => {
  assert.equal(accountCurrency('KE'), 'KES'); assert.equal(accountCurrency('ke'), 'KES');
  for(const country of ['US','QA','UG',undefined,null,'']) assert.equal(accountCurrency(country), 'USD');
});
test('account country falls back to the business or creator registration profile',async()=>{
  const row:any={id:'u1',roles:[{role:'CREATOR'}],countryCode:null,creator:{country:'QA',onboardingCompleted:true}};
  const service=new AuthService({user:{findUniqueOrThrow:async()=>row}} as never,{} as never);
  assert.equal((await service.me('u1')).countryCode,'QA');
  row.creator=null;row.business={country:'KE',onboardingCompleted:true};row.roles=[{role:'BUSINESS'}];
  assert.equal((await service.me('u1')).countryCode,'KE');
  row.countryCode='US';assert.equal((await service.me('u1')).countryCode,'US');
});
test('fixed rate uses integer subunits, rounds half up, rejects unsafe values', () => {
  assert.equal(convertMinor(300,'USD','KES'),39000);
  assert.equal(convertMinor(39000,'KES','USD'),300);
  assert.equal(convertMinor(1,'USD','KES'),130);
  assert.equal(convertMinor(65,'KES','USD'),1);
  assert.equal(convertMinor(0,'USD','KES'),0);
  for(const amount of [-1,NaN,Infinity,0.2,Number.MAX_SAFE_INTEGER]) assert.throws(()=>convertMinor(amount,'USD','KES'));
  assert.throws(()=>convertMinor(100,'EUR','KES'));
  assert.deepEqual(settlementQuote(300,'USD','PAYSTACK'), {amountMinor:39000,currencyCode:'KES',originalAmountMinor:300,originalCurrencyCode:'USD',usdKesRate:130});
  assert.equal(settlementQuote(300,'USD','STRIPE').amountMinor,300);
});
test('USD application fees, collaboration funding, refunds and payouts reach Paystack as KES', async () => {
  process.env.PAYSTACK_SECRET_KEY='sk_test_currency'; process.env.PAYSTACK_CURRENCY='KES';
  const originalFetch=global.fetch;
  const requests: {path:string;body:any}[]=[];
  global.fetch=(async(url:any,init?:RequestInit)=>{
    requests.push({path:String(url),body:JSON.parse(String(init?.body))});
    return new Response(JSON.stringify({status:true,data:{reference:'reference-1',authorization_url:'https://checkout.paystack.com/test',id:123,status:'pending'}}));
  }) as typeof fetch;
  try {
    const provider=new PaystackPaymentProvider();
    await provider.createCheckout({paymentId:'p1',applicationId:'a1',creatorId:'c1',campaignId:'k1',campaignTitle:'Test',payerEmail:'test@example.com',amountMinor:300,currencyCode:'USD',expiresAt:new Date()});
    await provider.createCollaborationPayment({collaborationPaymentId:'cp1',participantId:'pt1',businessId:'b1',campaignTitle:'Test',creatorName:'Test',payerEmail:'test@example.com',amountMinor:11000,currencyCode:'USD',expiresAt:new Date(),attemptKey:'1'});
    await provider.createTransfer({collaborationPaymentId:'cp1',accountId:'recipient1',amountMinor:10000,currencyCode:'USD',idempotencyKey:'release-cp1'});
    await provider.refund('123',300,'refund-p1','USD');
    assert.equal(requests[0].body.amount,'39000'); assert.equal(requests[0].body.currency,'KES');
    assert.equal(JSON.parse(requests[0].body.metadata).settlement.usdKesRate,130);
    assert.equal(JSON.parse(requests[0].body.metadata).settlement.originalAmountMinor,300);
    assert.equal(requests[1].body.amount,'1430000'); assert.equal(requests[1].body.currency,'KES');
    assert.equal(requests[2].body.amount,1300000); assert.equal(requests[2].body.currency,'KES');
    assert.equal(requests[3].body.amount,39000);
    await provider.refund('123',130,'refund-kes','KES'); assert.equal(requests[4].body.amount,130);
    await assert.rejects(provider.createTransfer({collaborationPaymentId:'cp1',accountId:'recipient1',amountMinor:100,currencyCode:'EUR',idempotencyKey:'x'}),errorCode('PAYMENT_CURRENCY_UNSUPPORTED'));
  } finally {global.fetch=originalFetch;}
});
test('Paystack settlement cannot accidentally switch to USD',async()=>{
  process.env.PAYSTACK_CURRENCY='USD';
  try {await assert.rejects(new PaystackPaymentProvider().createTransfer({collaborationPaymentId:'x',accountId:'x',amountMinor:1,currencyCode:'USD',idempotencyKey:'x'}),errorCode('PAYMENT_CURRENCY_CONFIGURATION'));}
  finally {process.env.PAYSTACK_CURRENCY='KES';}
});
test('default and legacy application fee rules are quoted in USD',async()=>{
  const previousAmount=process.env.DEFAULT_APPLICATION_FEE_MINOR,previousCurrency=process.env.DEFAULT_APPLICATION_FEE_CURRENCY;
  process.env.DEFAULT_APPLICATION_FEE_MINOR='300';process.env.DEFAULT_APPLICATION_FEE_CURRENCY='USD';
  let rules:any[]=[];
  const db={creatorProfile:{findUniqueOrThrow:async()=>({country:'KE'})},campaign:{findUniqueOrThrow:async()=>({categories:[]})},applicationFeeRule:{findMany:async()=>rules}};
  try {
    const service=new ApplicationFeeService(db as never);
    assert.deepEqual(await service.resolve('k1','c1'),{amountMinor:300,currencyCode:'USD',ruleId:null});
    rules=[{id:'legacy',amountMinor:39000,currencyCode:'KES',priority:0}];
    assert.deepEqual(await service.resolve('k1','c1'),{amountMinor:300,currencyCode:'USD',ruleId:'legacy'});
    rules=[{id:'usd',amountMinor:300,currencyCode:'USD',priority:0}];
    assert.equal((await service.resolve('k1','c1')).amountMinor,300);
  } finally {
    if(previousAmount===undefined)delete process.env.DEFAULT_APPLICATION_FEE_MINOR;else process.env.DEFAULT_APPLICATION_FEE_MINOR=previousAmount;
    if(previousCurrency===undefined)delete process.env.DEFAULT_APPLICATION_FEE_CURRENCY;else process.env.DEFAULT_APPLICATION_FEE_CURRENCY=previousCurrency;
  }
});
test('USD fixed platform fee converts to KES without changing creator compensation',()=>{
  const service=new MarketplacePaymentService({} as never,{} as never) as any;
  assert.deepEqual(service.calculate(10000,{basisPoints:1000,fixedMinor:100},'USD'),{grossAmountMinor:11100,platformFeeMinor:1100,creatorNetMinor:10000});
  assert.deepEqual(service.calculate(1300000,{basisPoints:1000,fixedMinor:100},'KES'),{grossAmountMinor:1443000,platformFeeMinor:143000,creatorNetMinor:1300000});
});
function fundingFixture(currency='USD',gross=11000){
  const row:any={id:'p1',provider:'PAYSTACK',grossAmountMinor:gross,currencyCode:currency,fundedAt:null,campaignParticipantId:'pt1',creatorId:'c1',businessId:'b1',campaignParticipant:{applicationId:'a1',creator:{userId:'cu1'},business:{userId:'bu1'},application:{conversation:null}}};
  let notifications=0,audits=0;
  const tx={collaborationPayment:{updateMany:async({data}:any)=>{if(row.fundedAt)return{count:0};Object.assign(row,data);return{count:1};}},campaignParticipant:{updateMany:async()=>({count:1})},notification:{createMany:async({data}:any)=>{notifications+=data.length;}},applicationAuditLog:{create:async()=>{audits++;}}};
  const db={collaborationPayment:{findUnique:async()=>row},$transaction:async(fn:any)=>fn(tx)};
  return{service:new MarketplacePaymentService(db as never,{providerName:'PAYSTACK'} as never) as any,row,counts:()=>({notifications,audits})};
}
test('KES funding settles the USD ledger once; duplicates cannot repeat activation or notifications',async()=>{
  const f=fundingFixture();
  await f.service.confirmFunding('p1',1430000,'KES','provider-id');
  assert.equal(f.row.fundedAmountMinor,11000);assert.equal(f.row.currencyCode,'USD');
  await f.service.confirmFunding('p1',1430000,'KES','provider-id');
  assert.deepEqual(f.counts(),{notifications:2,audits:1});
});
test('funding rejects wrong settlement amount or currency, legacy KES stays unchanged',async()=>{
  const f=fundingFixture();
  await assert.rejects(f.service.confirmFunding('p1',11000,'USD'),errorCode('PAYMENT_AMOUNT_MISMATCH'));
  await assert.rejects(f.service.confirmFunding('p1',1430000,'USD'),errorCode('PAYMENT_CURRENCY_MISMATCH'));
  assert.deepEqual(f.counts(),{notifications:0,audits:0});
  const legacy=fundingFixture('KES',1430000);await legacy.service.confirmFunding('p1',1430000,'KES');assert.equal(legacy.row.fundedAmountMinor,1430000);
});
test('application activation requires converted settlement and original reference',async()=>{
  const row:any={provider:'PAYSTACK',amountMinor:300,currencyCode:'USD',status:'PENDING',providerCheckoutSessionId:'RIVERA-APP-p1',application:{campaign:{status:'OPEN'}}};
  let writes=0;
  const db={applicationPayment:{findUniqueOrThrow:async()=>row,update:async()=>{writes++;}},$transaction:async()=>{throw new Error('EXPECTED_SETTLEMENT_ACCEPTED');}};
  const service=new ApplicationsService(db as never,{} as never,{} as never,{} as never,{} as never,{} as never) as any;
  const state={status:'paid',amountMinor:39000,currencyCode:'KES',checkoutSessionId:'RIVERA-APP-p1'};
  await assert.rejects(service.activatePayment('p1',{...state,amountMinor:300},'user'),errorCode('PAYMENT_AMOUNT_MISMATCH'));
  await assert.rejects(service.activatePayment('p1',{...state,currencyCode:'USD'},'user'),errorCode('PAYMENT_CURRENCY_MISMATCH'));
  await assert.rejects(service.activatePayment('p1',{...state,checkoutSessionId:'different'},'user'),errorCode('PAYMENT_REFERENCE_MISMATCH'));
  await assert.rejects(service.activatePayment('p1',state,'user'),/EXPECTED_SETTLEMENT_ACCEPTED/);
  assert.equal(writes,2);
});
test('successful funding webhooks independently verify Paystack, not just metadata',async()=>{
  const f=fundingFixture();f.row.providerCheckoutSessionId='RIVERA-COLLAB-p1';
  let verified=0;
  f.service.provider={providerName:'PAYSTACK',retrievePayment:async()=>{verified++;return{status:'paid',amountMinor:1430000,currencyCode:'KES',checkoutSessionId:'RIVERA-COLLAB-p1',paymentId:'123'};}};
  const event={id:'evt1',type:'checkout.session.completed',object:{id:'RIVERA-COLLAB-p1',amount_total:1,currency:'USD',metadata:{collaborationPaymentId:'p1'}}};
  assert.equal(await f.service.processWebhook(event),true);assert.equal(verified,1);assert.equal(f.row.fundedAmountMinor,11000);
  await assert.rejects(f.service.processWebhook({...event,object:{...event.object,id:'other-reference'}}),errorCode('PAYMENT_REFERENCE_MISMATCH'));
});
test('test/live mismatches in provider verification are rejected',async()=>{
  const previous=global.fetch;process.env.PAYSTACK_SECRET_KEY='sk_test_currency';
  global.fetch=(async()=>new Response(JSON.stringify({status:true,data:{status:'success',reference:'ref1',amount:39000,currency:'KES',domain:'live'}}))) as typeof fetch;
  try{await assert.rejects(new PaystackPaymentProvider().retrievePayment({checkoutSessionId:'ref1'}),errorCode('PAYMENT_ENVIRONMENT_MISMATCH'));}finally{global.fetch=previous;}
});
test('refund callbacks convert KES to the original USD ledger and ignore pending refunds',async()=>{
  const row:any={amountMinor:300,currencyCode:'USD',provider:'PAYSTACK',refundedAmountMinor:0,applicationId:'a1'};
  const writes:any[]=[];
  const db={applicationPayment:{findUniqueOrThrow:async()=>row,update:async({data}:any)=>{writes.push(data);Object.assign(row,data);}},campaignApplication:{update:async()=>{}},$transaction:async(values:any[])=>Promise.all(values)};
  const service=new ApplicationsService(db as never,{} as never,{} as never,{} as never,{} as never,{} as never) as any;
  await service.reconcileRefund('p1',{status:'pending',amount:39000});assert.equal(writes.length,0);
  await service.reconcileRefund('p1',{status:'succeeded',amount:19500});assert.equal(row.refundedAmountMinor,150);assert.equal(row.status,'PARTIALLY_REFUNDED');
  await service.reconcileRefund('p1',{status:'succeeded',amount:39000});assert.equal(row.refundedAmountMinor,300);assert.equal(row.status,'REFUNDED');
  await service.reconcileRefund('p1',{status:'succeeded',amount:39000});assert.equal(row.refundedAmountMinor,300);
});
test('application activation atomically claims payment once before notifying',async()=>{
  const row:any={provider:'PAYSTACK',amountMinor:300,currencyCode:'USD',status:'PENDING',providerCheckoutSessionId:'ref1',applicationId:'a1',application:{campaign:{status:'OPEN',business:{userId:'business-user'}}}};
  let notifications=0,audits=0;
  const tx={applicationPayment:{updateMany:async({data}:any)=>{if(row.status==='PAID')return{count:0};Object.assign(row,data);return{count:1};}},campaignApplication:{update:async()=>({id:'a1',creator:{userId:'creator-user',displayName:'Creator'},campaign:{title:'Test'}})},notification:{createMany:async({data}:any)=>{notifications+=data.length;}},applicationAuditLog:{create:async()=>{audits++;}}};
  const db={applicationPayment:{findUniqueOrThrow:async()=>row},$transaction:async(fn:any)=>fn(tx)};
  const service=new ApplicationsService(db as never,{} as never,{} as never,{} as never,{} as never,{} as never) as any;
  service.sendSubmissionEmails=async()=>{};
  const state={status:'paid',checkoutSessionId:'ref1',amountMinor:39000,currencyCode:'KES'};
  await service.activatePayment('p1',state,'user');await service.activatePayment('p1',state,'user');
  assert.equal(row.status,'PAID');assert.equal(notifications,2);assert.equal(audits,2);
});
test('unsupported international payouts block funding before any payment-provider call',async()=>{
  let charged=false;
  const service=new MarketplacePaymentService({} as never,{providerName:'PAYSTACK',createCollaborationPayment:async()=>{charged=true;}} as never) as any;
  service.ownedParticipant=async()=>({creator:{country:'QA'},agreedCompensationMinor:10000,status:'AWAITING_FUNDING'});
  await assert.rejects(service.fund('u1','p1'),errorCode('PAYOUT_COUNTRY_UNSUPPORTED'));assert.equal(charged,false);
});
