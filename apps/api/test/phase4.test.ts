import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CampaignDto, CampaignQueryDto } from '../src/campaigns/dto';

test('campaign budget uses non-negative integer minor units', async () => {
  const dto=plainToInstance(CampaignDto,{budgetMinMinor:-1,budgetMaxMinor:10.5,currencyCode:'usd'});
  const errors=await validate(dto);
  assert.ok(errors.some(error=>error.property==='budgetMinMinor'));
  assert.ok(errors.some(error=>error.property==='budgetMaxMinor'));
  assert.ok(errors.some(error=>error.property==='currencyCode'));
});

test('campaign limits nested categories and deliverables', async () => {
  const dto=plainToInstance(CampaignDto,{categoryIds:['1','2','3','4','5','6'],deliverables:Array.from({length:21},(_,index)=>({title:`Item ${index}`,quantity:1}))});
  const errors=await validate(dto);
  assert.ok(errors.some(error=>error.property==='categoryIds'));
  assert.ok(errors.some(error=>error.property==='deliverables'));
});

test('campaign URLs require an HTTP protocol', async () => {
  const dto=plainToInstance(CampaignDto,{productUrl:'javascript:alert(1)'});
  assert.ok((await validate(dto)).some(error=>error.property==='productUrl'));
});

test('discovery pagination is bounded', async () => {
  const dto=plainToInstance(CampaignQueryDto,{page:0,limit:100});
  const errors=await validate(dto);
  assert.ok(errors.some(error=>error.property==='page'));
  assert.ok(errors.some(error=>error.property==='limit'));
});

test('campaign public serializer is an explicit allowlist', () => {
  const source=readFileSync(join(process.cwd(),'src/campaigns/campaigns.service.ts'),'utf8');
  const serializer=source.slice(source.indexOf('private publicDto'),source.indexOf('private ownerDto'));
  for(const forbidden of ['fullDescription','targetAudience','expectedOutcomes','specialInstructions','businessEmail','businessPhone'])assert.doesNotMatch(serializer,new RegExp(forbidden));
});

test('discovery excludes expired and non-open campaigns', () => {
  const source=readFileSync(join(process.cwd(),'src/campaigns/campaigns.service.ts'),'utf8');
  assert.match(source,/status: 'OPEN', visibility: 'PUBLIC'/);
  assert.match(source,/applicationDeadline: \{ gt: now \}/);
});

test('owner mutations require campaign ownership', () => {
  const source=readFileSync(join(process.cwd(),'src/campaigns/campaigns.service.ts'),'utf8');
  assert.match(source,/id, businessId: business\.id, deletedAt: null/);
  assert.match(source,/CAMPAIGN_OWNERSHIP_REQUIRED/);
});

test('recommendations are deterministic and profile based', () => {
  const source=readFileSync(join(process.cwd(),'src/campaigns/campaigns.service.ts'),'utf8');
  for(const signal of ['Matches your categories','Matches your platforms','Matches your location','Matches your languages'])assert.match(source,new RegExp(signal));
  assert.doesNotMatch(source,/openai|embedding|vector/i);
});
