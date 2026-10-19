import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextPayoutMonday, paystackTransferReference } from '../src/payments/payout-schedule';
import { PayoutWorker } from '../src/payments/payout-worker.service';

test('calendar-week approvals always pay the following Monday at 09:00 Kenya time',()=>{
  for(const [approval,expected] of [
    ['2026-10-18T20:59:59Z','2026-10-19T06:00:00.000Z'], // Sunday 23:59:59 EAT
    ['2026-10-18T21:00:00Z','2026-10-26T06:00:00.000Z'], // Monday 00:00 EAT
    ['2026-10-19T05:59:59Z','2026-10-26T06:00:00.000Z'],
    ['2026-10-19T06:00:00Z','2026-10-26T06:00:00.000Z'],
    ['2026-10-21T10:00:00Z','2026-10-26T06:00:00.000Z'],
    ['2026-12-31T22:00:00Z','2027-01-04T06:00:00.000Z'],
  ])assert.equal(nextPayoutMonday(new Date(approval)).toISOString(),expected);
});

test('provider references are stable, bounded, and do not collide on long shared ID prefixes',()=>{
  const a=paystackTransferReference('rivera-release-cm12345678901234567890aaaa');
  assert.equal(a,paystackTransferReference('rivera-release-cm12345678901234567890aaaa'));
  assert.notEqual(a,paystackTransferReference('rivera-release-cm12345678901234567890bbbb'));
  assert.match(a,/^[a-z0-9_-]{16,50}$/);
});

test('worker catches up due records, isolates failures and prevents overlapping local ticks',async()=>{
  const seen:string[]=[];let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});let queries=0,summary:any;
  const db={creatorTransfer:{findMany:async(input:any)=>{queries++;assert.equal(input.where.scheduledFor.lte.toISOString(),'2026-10-20T07:00:00.000Z');return [{id:'one'},{id:'two'}];}},operationalJobRun:{create:async(input:any)=>{summary=input.data;}}};
  const service={dispatchScheduledPayout:async(id:string)=>{seen.push(id);if(id==='one'){await gate;throw new Error('test');}}};
  const worker=new PayoutWorker(db as never,service as never);const run=worker.run(new Date('2026-10-20T07:00:00Z'));
  await worker.run();release();await run;
  assert.equal(queries,1);assert.deepEqual(seen,['one','two']);assert.equal(summary.failed,1);assert.equal(summary.processed,1);
});
