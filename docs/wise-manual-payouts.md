# Admin-assisted Wise payouts

Kenyan creators keep Paystack/M-Pesa. International creators configure Wise at `/dashboard/creator/payouts`. No Wise API token is required, and Rivera does not send or fund Wise transfers automatically.

## Creator setup

1. Supply the full legal name and email on the creator's own Wise account; accept the ownership declaration.
2. Enter the 8-digit code delivered to that email. Codes expire after 30 minutes, allow five attempts, and are replaced on resend. Codes are stored only as creator-bound SHA-256 hashes, compared timing-safely, and are not returned by APIs or logged in mail content.
3. Email verification leaves the account pending. It is not proof of Wise eligibility or a valid receiving account.
4. An admin checks the legal name, email route and USD receiving support in Wise, records a review note, and approves the account. Approved payout details are locked; changes require support rather than silently changing a queued recipient.

## Admin payout desk

Open `/admin/wise-payouts` (ADMIN role required).

- Before funding, the creator must have approved, verified Wise details. Paystack still collects the business's payment in KES at USD 1 = KES 130. Collections do not fund Wise: treasury must fund the Wise account separately.
- Only the Business may release funded compensation after required work is approved and the collaboration is completed. Pending refunds block release. Release creates one `WISE` transfer with immutable email, legal-name and USD-amount snapshots. The original contract amount stays in the ledger.
- `PENDING` = queued, **not sent**. `PROCESSING` = claimed by an admin, **not confirmed paid**. `SUCCEEDED` = an administrator has attested that Wise shows the matching transfer as completed; it is not independent API verification.
- Claim exactly one payout at a time. Only the claiming admin may confirm it. Open Wise separately, check recipient eligibility, and send the exact USD recipient amount, covering sender fees separately. Do not substitute a recipient if the email route is unavailable.
- Never resend a transfer with an uncertain or pending outcome. Keep the queue item claimed and contact support. There is deliberately no automatic reset/retry or reassignment that could cause a second payment.
- After Wise shows completion, record the numeric Wise transfer ID and re-enter the queued email. Confirm the exact recipient USD amount. A unique database constraint prevents using one Wise transfer ID twice. Payout settlement, audit and notifications are atomic and duplicate confirmations are idempotent.
- Both creator and business receive in-app notifications (eligible registered devices also use the existing payment push pipeline). No passwords, Wise OTPs, API tokens, or card details are collected.

The desk shows the oldest 100 account reviews, up to 100 pending and 100 claimed transfers, and the latest 20 completions. Complete older work to advance the queue. Claimed transfers are listed separately from pending work.

## Verification and deployment

`wise-payouts.test.ts` covers DTO validation, role metadata, readiness and secret-safe serialization. `wise-payouts.integration.test.ts` requires `WISE_TEST_DATABASE_URL` pointing **only** to `127.0.0.1/rivera_wise_test` and exercises actual PostgreSQL migrations, verification, locking, duplicate protection, concurrent claims/completions, reference collisions, notifications and unchanged M-Pesa setup. Use a disposable PostgreSQL container. Mail and payment-provider operations are mocked: tests never send real money or email.

Back up production PostgreSQL before applying `20261019_wise_manual_payouts`. Build API/web, apply migrations, then restart API followed by web. No full/demo database seed is needed. The migration is additive; do not remove Wise records, enum values, or audit evidence to roll back. Before any Wise account/queue is used, the previous images may be restored while retaining additive columns. After use, keep the Wise-aware API and disable new onboarding/releases operationally while making a forward repair; never revert to an API that might treat Wise queue references as Paystack transfers.

## Weekly scheduling update

New Business releases are scheduled for the following week's Monday at 09:00 Kenya time. They cannot be claimed until the worker passes safety checks and makes them ready. Wise remains manual; see [weekly payout operations](weekly-payouts.md) for cutoff, holds, catch-up, monitoring and rollback. Historical unscheduled payouts retain their existing handling.
