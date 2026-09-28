import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreditGrantDto, FeeRuleDto, ProposalDto } from '../src/applications/dto';
import { currencyDigits, formatMoney, majorToMinor, minorToMajor } from '../src/applications/money';
import { StripePaymentProvider } from '../src/applications/payment.provider';
import { ApplicationFeeService } from '../src/applications/fee.service';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

test('money utilities respect currency fraction digits', () => {
  assert.equal(currencyDigits('USD'), 2);
  assert.equal(majorToMinor(3.25, 'USD'), 325);
  assert.equal(minorToMajor(325, 'USD'), 3.25);
  assert.equal(currencyDigits('JPY'), 0);
  assert.equal(majorToMinor(500, 'JPY'), 500);
  assert.match(formatMoney(300, 'USD'), /3\.00/);
});

test('proposal validation requires integer minor units, currency and substantive pitch', async () => {
  const invalid = plainToInstance(ProposalDto, { proposedAmountMinor: 10.5, proposedCurrencyCode: 'US', pitch: 'Too short' });
  const errors = await validate(invalid);
  assert.ok(errors.some(error => error.property === 'proposedAmountMinor'));
  assert.ok(errors.some(error => error.property === 'proposedCurrencyCode'));
  assert.ok(errors.some(error => error.property === 'pitch'));
});

test('fee and credit administration inputs are bounded', async () => {
  const fee = plainToInstance(FeeRuleDto, { name: 'x', amountMinor: -1, currencyCode: 'dollars', priority: 5000, active: true });
  const credit = plainToInstance(CreditGrantDto, { quantity: 101, reason: 'x' });
  assert.ok((await validate(fee)).length >= 4);
  assert.ok((await validate(credit)).length >= 2);
});

test('fee resolution prefers country and category specificity before priority', async () => {
  const rules = [
    { id: 'global', countryCode: null, categoryId: null, amountMinor: 300, currencyCode: 'USD', priority: 100 },
    { id: 'country', countryCode: 'QA', categoryId: null, amountMinor: 900, currencyCode: 'QAR', priority: 1 },
    { id: 'specific', countryCode: 'QA', categoryId: 'tech', amountMinor: 1000, currencyCode: 'QAR', priority: 0 },
  ];
  const db = {
    creatorProfile: { findUniqueOrThrow: async () => ({ country: 'QA' }) },
    campaign: { findUniqueOrThrow: async () => ({ categories: [{ categoryId: 'tech' }] }) },
    applicationFeeRule: { findMany: async () => rules },
  };
  const fee = await new ApplicationFeeService(db as never).resolve('campaign', 'creator');
  assert.deepEqual(fee, { amountMinor: 1000, currencyCode: 'QAR', ruleId: 'specific' });
});

test('Stripe webhook verification accepts a current HMAC signature and rejects tampering', () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_phase5_test';
  const provider = new StripePaymentProvider();
  const body = Buffer.from(JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1' } } }));
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex');
  assert.equal(provider.verifyWebhook(body, `t=${timestamp},v1=${digest}`).id, 'evt_1');
  assert.throws(() => provider.verifyWebhook(Buffer.from(`${body}x`), `t=${timestamp},v1=${digest}`));
  assert.throws(() => provider.verifyWebhook(body, `t=${timestamp - 301},v1=${digest}`));
});

test('payment activation verifies amount and currency and webhook events are idempotent', () => {
  const service = source('src/applications/applications.service.ts');
  assert.match(service, /state\.amountMinor\s*!==\s*payment\.amountMinor/);
  assert.match(service, /state\.currencyCode\s*!==\s*payment\.currencyCode/);
  assert.match(service, /provider_providerEventId/);
  assert.match(service, /duplicate:\s*true/);
  assert.match(source('prisma/schema.prisma'), /@@unique\(\[provider, providerEventId\]\)/);
});

test('credits and successful submission are committed in one serializable transaction', () => {
  const service = source('src/applications/applications.service.ts');
  assert.match(service, /freeApplicationCredits:\s*\{\s*gt:\s*0\s*\}/);
  assert.match(service, /freeApplicationCredits:\s*\{\s*decrement:\s*1\s*\}/);
  assert.match(service, /ApplicationCreditTransaction|applicationCreditTransaction\.create/);
  assert.match(service, /TransactionIsolationLevel\.Serializable/);
});

test('business APIs hide unpaid work and public DTOs omit private contacts', () => {
  const service = source('src/applications/applications.service.ts');
  assert.match(service, /const visible:\s*ApplicationStatus\[\]\s*=\s*\[[\s\S]*?"SUBMITTED"[\s\S]*?"VIEWED"[\s\S]*?"WITHDRAWN"[\s\S]*?\]/);
  assert.doesNotMatch(service.slice(service.indexOf('private safeBusiness'), service.indexOf('const campaignForApplication')), /email|phone|address|adminNotes/i);
  assert.doesNotMatch(service.slice(service.indexOf('private safeCreator'), service.indexOf('private ownDto')), /email|phone|password|session/i);
});

test('checkout amount is server resolved and never accepted in its request body', () => {
  const controller = source('src/applications/applications.controllers.ts');
  const checkout = controller.slice(controller.indexOf("@Post('creators/me/applications/:id/checkout')"), controller.indexOf("@Get('creators/me/applications/:id/payment-status')"));
  assert.doesNotMatch(checkout, /@Body/);
  assert.match(source('src/applications/applications.service.ts'), /this\.fees\.resolve\(\s*app\.campaignId,\s*app\.creatorId,?\s*\)/);
});
