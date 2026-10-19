import { createHash } from 'node:crypto';

/** Approval during a Kenya-time calendar week pays the NEXT Monday at 09:00 EAT. */
export function nextPayoutMonday(approvedAt = new Date()): Date {
  const local = new Date(approvedAt.getTime() + 3 * 60 * 60_000);
  const days = (8 - local.getUTCDay()) % 7 || 7;
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + days, 6));
}

export function paystackTransferReference(key: string): string {
  const prefix = (process.env.PAYSTACK_REFERENCE_PREFIX ?? 'RIVERA-').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10).toLowerCase();
  return `${prefix}transfer-${createHash('sha256').update(key).digest('hex').slice(0, 30)}`;
}

export const payoutDateLabel = (date: Date) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Nairobi', weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
}).format(date) + ' at 09:00 EAT';
