import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PaystackPaymentProvider } from '../src/applications/paystack-payment.provider';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

test('Paystack webhooks require SHA512 signatures and normalize successful charges', () => {
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_rivera_paystack';
  const provider = new PaystackPaymentProvider();
  const body = Buffer.from(JSON.stringify({
    event: 'charge.success',
    data: {
      id: 12345,
      reference: 'rivera-collab-payment-1',
      amount: 125000,
      currency: 'KES',
      metadata: { collaborationPaymentId: 'payment-1' },
    },
  }));
  const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex');
  const event = provider.verifyWebhook(body, signature);
  assert.equal(event.type, 'checkout.session.completed');
  assert.equal(event.object.amount_total, 125000);
  assert.equal((event.object.metadata as Record<string, string>).collaborationPaymentId, 'payment-1');
  assert.throws(() => provider.verifyWebhook(body, 'bad-signature'));
});

test('Paystack hosted checkout needs only the secret key and preserves server metadata', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_rivera_paystack';
  process.env.PAYSTACK_CURRENCY = 'KES';
  const originalFetch = global.fetch;
  let submitted: Record<string, unknown> = {};
  global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    submitted = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ status: true, data: { authorization_url: 'https://checkout.paystack.com/test', reference: 'rivera-app-payment-1' } }), { status: 200 });
  }) as typeof fetch;
  try {
    const checkout = await new PaystackPaymentProvider().createCheckout({
      paymentId: 'payment-1', applicationId: 'application-1', creatorId: 'creator-1', campaignId: 'campaign-1',
      campaignTitle: 'Campaign', payerEmail: 'creator@example.com', amountMinor: 30000, currencyCode: 'KES', expiresAt: new Date(),
    });
    assert.equal(checkout.url, 'https://checkout.paystack.com/test');
    assert.equal(submitted.email, 'creator@example.com');
    assert.equal(submitted.amount, '30000');
    assert.match(String(submitted.reference), /^RIVERA-APP-/);
    assert.match(String(submitted.metadata), /payment-1/);
    assert.equal(JSON.parse(String(submitted.metadata)).product, 'Rivera');
  } finally {
    global.fetch = originalFetch;
  }
});

test('Paystack payout recipients enforce Kenyan M-Pesa numbers before provider calls', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_rivera_paystack';
  await assert.rejects(
    new PaystackPaymentProvider().createConnectedAccount({ creatorId: 'creator-1', countryCode: 'KE', email: 'creator@example.com', displayName: 'Creator', phoneNumber: '123' }),
    (error: unknown) => (error as { getResponse?: () => {code?: string} }).getResponse?.().code === 'INVALID_PAYOUT_PHONE',
  );
});

test('Paystack is represented in the database, deployment and webhook contracts', () => {
  assert.match(source('prisma/schema.prisma'), /enum PaymentProvider\s*\{[\s\S]*PAYSTACK/);
  assert.match(source('prisma/schema.prisma'), /providerPaymentId\s+String\?\s+@unique/);
  assert.match(source('prisma/schema.prisma'), /providerCheckoutSessionId\s+String\?\s+@unique/);
  assert.match(source('../../docker-compose.yml'), /PAYSTACK_SECRET_KEY/);
  assert.match(source('../../docker-compose.yml'), /PAYSTACK_REFERENCE_PREFIX/);
  assert.match(source('src/applications/applications.controllers.ts'), /webhooks\/paystack/);
  assert.match(source('src/module.ts'), /new PaystackPaymentProvider/);
});

test('Rivera rejects amount or currency mismatches and retries failed webhook events safely', () => {
  const applications = source('src/applications/applications.service.ts');
  const collaboration = source('src/payments/marketplace-payment.service.ts');
  assert.match(applications, /PAYMENT_AMOUNT_MISMATCH/);
  assert.match(applications, /PAYMENT_CURRENCY_MISMATCH/);
  assert.match(collaboration, /PAYMENT_AMOUNT_MISMATCH/);
  assert.match(collaboration, /PAYMENT_CURRENCY_MISMATCH/);
  assert.match(applications, /existing\?\.status !== "FAILED"/);
  assert.match(applications, /status: "PROCESSING", processedAt: null, errorCode: null/);
  assert.match(applications, /WEBHOOK_PROCESSING_FAILED/);
});
