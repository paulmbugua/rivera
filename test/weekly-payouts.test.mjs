import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('weekly payout screens disclose timing, holds, manual Wise and no instant withdrawal',()=>{
  const finance=source('components/rivera/financial.tsx'),wise=source('components/rivera/wise-payouts.tsx');
  for(const label of ['Approve Monday payout','following Monday at 09:00 EAT','There is no instant withdrawal','scheduledFor','failureCode'])assert.ok(finance.includes(label));
  assert.ok(wise.includes('SCHEDULED · DO NOT SEND YET'));assert.ok(wise.includes("item.status==='PENDING'&&<button"));
  assert.ok(source('lib/payout-schedule.ts').includes("timeZone:'Africa/Nairobi'"));
});
