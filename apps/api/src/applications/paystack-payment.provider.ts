import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../common/api-error';
import {
  CheckoutInput,
  CheckoutResult,
  CollaborationCheckoutInput,
  ConnectedAccount,
  PaymentProviderAdapter,
  ProviderPayment,
  ProviderRefund,
  ProviderTransfer,
  VerifiedWebhook,
} from './payment.provider';

type PaystackEnvelope = {
  status?: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

export class PaystackPaymentProvider implements PaymentProviderAdapter {
  readonly providerName = 'PAYSTACK' as const;
  readonly payoutOnboardingMode = 'MPESA' as const;

  private secret() {
    const key = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!key)
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'PAYMENT_PROVIDER_UNAVAILABLE',
        'Paystack payments and payouts are temporarily unavailable while Rivera completes provider configuration.',
      );
    return key;
  }

  private currency() {
    return (process.env.PAYSTACK_CURRENCY ?? 'KES').trim().toUpperCase();
  }

  private referencePrefix() {
    const value = (process.env.PAYSTACK_REFERENCE_PREFIX ?? 'RIVERA-')
      .trim()
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toUpperCase();
    return value.endsWith('-') ? value : `${value}-`;
  }

  private productName() {
    return (process.env.PAYSTACK_PRODUCT_NAME ?? 'Rivera').trim();
  }

  private ensureCurrency(currencyCode: string) {
    const configured = this.currency();
    if (currencyCode.toUpperCase() !== configured)
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'PAYMENT_CURRENCY_UNSUPPORTED',
        `Rivera Paystack payments are currently available in ${configured} only.`,
      );
  }

  private async request(path: string, method: 'GET'|'POST' = 'GET', body?: Record<string, unknown>) {
    let response: Response;
    try {
      response = await fetch(`https://api.paystack.co/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secret()}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiException(
        HttpStatus.BAD_GATEWAY,
        'PAYMENT_PROVIDER_UNREACHABLE',
        'Paystack could not be reached. Please try again.',
      );
    }
    const envelope = await response.json().catch(() => ({})) as PaystackEnvelope;
    if (!response.ok || envelope.status !== true || !envelope.data)
      throw new ApiException(
        HttpStatus.BAD_GATEWAY,
        'PAYMENT_PROVIDER_REQUEST_FAILED',
        envelope.message || 'Paystack could not complete this request. Please try again.',
      );
    return envelope.data;
  }

  private metadata(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object') return value as Record<string, unknown>;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
      } catch { return {}; }
    }
    return {};
  }

  private phone(value?: string) {
    const compact = (value ?? '').replace(/[\s()-]/g, '');
    const normalized = compact.startsWith('0')
      ? `+254${compact.slice(1)}`
      : compact.startsWith('254')
        ? `+${compact}`
        : compact;
    if (!/^\+254(?:1|7)\d{8}$/.test(normalized))
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_PAYOUT_PHONE',
        'Enter a valid Kenyan M-Pesa number, for example +254712345678.',
      );
    // Paystack validates Kenyan mobile-money account numbers as numeric-only.
    // Keep accepting the user-friendly E.164 form, but omit the leading plus
    // when creating the transfer recipient (for example, 254712345678).
    return normalized.slice(1);
  }

  private paymentState(data: Record<string, unknown>): ProviderPayment {
    const status = String(data.status ?? '').toLowerCase();
    return {
      paymentId: data.id == null ? undefined : String(data.id),
      checkoutSessionId: typeof data.reference === 'string' ? data.reference : undefined,
      status: status === 'success' ? 'paid' : status === 'failed' || status === 'abandoned' || status === 'reversed' ? 'failed' : 'pending',
      amountMinor: Number(data.amount ?? 0),
      currencyCode: String(data.currency ?? this.currency()).toUpperCase(),
    };
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    this.ensureCurrency(input.currencyCode);
    const app = process.env.APP_URL ?? 'http://localhost:3000';
    const reference = `${this.referencePrefix()}APP-${input.paymentId}`.slice(0, 100);
    const data = await this.request('transaction/initialize', 'POST', {
      email: input.payerEmail,
      amount: String(input.amountMinor),
      currency: input.currencyCode.toUpperCase(),
      reference,
      callback_url: `${app}/dashboard/creator/applications/${input.applicationId}?payment=processing`,
      metadata: JSON.stringify({ product: this.productName(), paymentId: input.paymentId, applicationId: input.applicationId, creatorId: input.creatorId, campaignId: input.campaignId }),
    });
    return {
      checkoutSessionId: String(data.reference ?? reference),
      url: String(data.authorization_url),
    };
  }

  async retrievePayment(reference: {paymentId?: string|null; checkoutSessionId?: string|null}) {
    const value = reference.checkoutSessionId ?? reference.paymentId;
    if (!value) throw new Error('PAYMENT_REFERENCE_MISSING');
    return this.paymentState(await this.request(`transaction/verify/${encodeURIComponent(value)}`));
  }

  async refund(paymentId: string, amountMinor: number, idempotencyKey: string): Promise<ProviderRefund> {
    const data = await this.request('refund', 'POST', {
      transaction: paymentId,
      amount: amountMinor,
      merchant_note: idempotencyKey,
    });
    const status = String(data.status ?? '').toLowerCase();
    return {
      refundId: String(data.id ?? data.refund_reference),
      status: status === 'processed' || status === 'succeeded' ? 'succeeded' : status === 'failed' ? 'failed' : 'pending',
    };
  }

  async retrieveRefund(refundId: string): Promise<ProviderRefund> {
    const data = await this.request(`refund/${encodeURIComponent(refundId)}`);
    const status = String(data.status ?? '').toLowerCase();
    return {
      refundId: String(data.id ?? refundId),
      status: status === 'processed' || status === 'succeeded' ? 'succeeded' : status === 'failed' ? 'failed' : 'pending',
    };
  }

  async createConnectedAccount(input: {creatorId:string;countryCode:string;email:string;displayName:string;phoneNumber?:string}): Promise<ConnectedAccount> {
    if (input.countryCode.toUpperCase() !== 'KE')
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'PAYOUT_COUNTRY_UNSUPPORTED',
        'Rivera Paystack payouts are currently available to Kenyan creators only.',
      );
    const data = await this.request('transferrecipient', 'POST', {
      type: 'mobile_money',
      name: input.displayName,
      account_number: this.phone(input.phoneNumber),
      bank_code: 'MPESA',
      currency: this.currency(),
      description: `Rivera creator ${input.creatorId}`,
      metadata: { creatorId: input.creatorId, email: input.email },
    });
    if (!data.recipient_code)
      throw new ApiException(HttpStatus.BAD_GATEWAY, 'PAYOUT_ACCOUNT_CREATION_FAILED', 'Paystack did not create the payout recipient.');
    return {
      accountId: String(data.recipient_code),
      countryCode: 'KE',
      defaultCurrencyCode: this.currency(),
      chargesEnabled: true,
      payoutsEnabled: data.active !== false,
      detailsSubmitted: true,
      requirementsDue: data.active === false ? ['provider_activation'] : [],
    };
  }

  async createAccountOnboardingLink(_accountId: string, returnUrl: string) {
    return { url: returnUrl };
  }

  async retrieveConnectedAccount(accountId: string): Promise<ConnectedAccount> {
    const data = await this.request(`transferrecipient/${encodeURIComponent(accountId)}`);
    return {
      accountId: String(data.recipient_code ?? accountId),
      countryCode: 'KE',
      defaultCurrencyCode: String(data.currency ?? this.currency()).toUpperCase(),
      chargesEnabled: true,
      payoutsEnabled: data.active !== false && data.is_deleted !== true,
      detailsSubmitted: true,
      requirementsDue: data.active === false || data.is_deleted === true ? ['provider_activation'] : [],
    };
  }

  async createCollaborationPayment(input: CollaborationCheckoutInput): Promise<CheckoutResult> {
    this.ensureCurrency(input.currencyCode);
    const app = process.env.APP_URL ?? 'http://localhost:3000';
    const reference = `${this.referencePrefix()}COLLAB-${input.collaborationPaymentId}-${input.attemptKey}`.slice(0, 100);
    const data = await this.request('transaction/initialize', 'POST', {
      email: input.payerEmail,
      amount: String(input.amountMinor),
      currency: input.currencyCode.toUpperCase(),
      reference,
      callback_url: `${app}/dashboard/business/payments?funding=processing`,
      metadata: JSON.stringify({ product: this.productName(), collaborationPaymentId: input.collaborationPaymentId, participantId: input.participantId, businessId: input.businessId }),
    });
    return {
      checkoutSessionId: String(data.reference ?? reference),
      url: String(data.authorization_url),
    };
  }

  async createTransfer(input: {collaborationPaymentId:string;accountId:string;amountMinor:number;currencyCode:string;idempotencyKey:string}): Promise<ProviderTransfer> {
    this.ensureCurrency(input.currencyCode);
    const normalizedReference = `${this.referencePrefix()}TRANSFER-${input.idempotencyKey}`
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 50);
    const reference = normalizedReference.length >= 16
      ? normalizedReference
      : `${normalizedReference}-${createHash('sha256').update(input.idempotencyKey).digest('hex')}`.slice(0, 16);
    const data = await this.request('transfer', 'POST', {
      source: 'balance',
      amount: input.amountMinor,
      recipient: input.accountId,
      reason: `Rivera collaboration ${input.collaborationPaymentId}`,
      reference,
      currency: input.currencyCode.toUpperCase(),
    });
    const status = String(data.status ?? '').toLowerCase();
    return {
      transferId: String(data.reference ?? reference),
      status: status === 'success' ? 'succeeded' : status === 'failed' ? 'failed' : 'pending',
    };
  }

  async retrieveTransfer(reference: string): Promise<ProviderTransfer> {
    const data = await this.request(`transfer/verify/${encodeURIComponent(reference)}`);
    const status = String(data.status ?? '').toLowerCase();
    return {
      transferId: String(data.reference ?? reference),
      status: status === 'success' ? 'succeeded' : status === 'reversed' ? 'reversed' : status === 'failed' ? 'failed' : 'pending',
      failureCode: status === 'reversed' ? 'TRANSFER_REVERSED' : undefined,
      failureMessage: typeof data.reason === 'string' ? data.reason : undefined,
    };
  }

  verifyWebhook(rawBody: Buffer, signature?: string): VerifiedWebhook {
    const supplied = signature?.trim().toLowerCase();
    if (!supplied) throw new Error('INVALID_WEBHOOK_SIGNATURE');
    const expected = createHmac('sha512', this.secret()).update(rawBody).digest('hex');
    const a = Buffer.from(expected), b = Buffer.from(supplied);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('INVALID_WEBHOOK_SIGNATURE');
    const payload = JSON.parse(rawBody.toString('utf8')) as {event?: string; data?: Record<string, unknown>};
    const type = String(payload.event ?? 'unknown');
    const data = payload.data ?? {};
    const metadata = this.metadata(data.metadata);
    const transaction = data.transaction && typeof data.transaction === 'object' ? data.transaction as Record<string, unknown> : {};
    const stable = String(data.id ?? data.reference ?? data.transfer_code ?? data.refund_reference ?? createHash('sha256').update(rawBody).digest('hex'));
    const eventId = `paystack:${type}:${stable}`;

    if (type === 'charge.success') return {
      id: eventId,
      type: 'checkout.session.completed',
      object: { ...data, id: data.reference, payment_intent: data.id == null ? undefined : String(data.id), amount_total: data.amount, currency: data.currency, metadata },
    };
    if (type.startsWith('transfer.')) return {
      id: eventId,
      type: type === 'transfer.success' ? 'transfer.succeeded' : type,
      object: { ...data, id: data.reference, failure_code: type === 'transfer.reversed' ? 'TRANSFER_REVERSED' : type === 'transfer.failed' ? 'TRANSFER_FAILED' : undefined, failure_message: data.reason },
    };
    if (type.startsWith('refund.')) return {
      id: eventId,
      type: 'refund.updated',
      object: { ...data, id: data.id == null ? data.refund_reference : String(data.id), payment_intent: transaction.id == null ? undefined : String(transaction.id), status: type === 'refund.processed' ? 'succeeded' : type === 'refund.failed' ? 'failed' : 'pending', metadata },
    };
    if (type.startsWith('charge.dispute.')) return {
      id: eventId,
      type,
      object: { ...data, id: data.id == null ? stable : String(data.id), payment_intent: transaction.id == null ? undefined : String(transaction.id), metadata },
    };
    return { id: eventId, type, object: { ...data, metadata } };
  }
}
