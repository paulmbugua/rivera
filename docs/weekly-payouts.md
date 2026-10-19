# Rivera weekly payout operations

## Promise and cutoff

Only funded, completed collaborations with all required work approved can be released by their Business. Release reserves the full creator net amount; it does not immediately send money. Every new release is scheduled for **09:00 Africa/Nairobi (EAT, UTC+3) on the following calendar week's Monday**. Monday approvals always go to the next Monday, including approvals before 09:00. Sunday approvals before midnight EAT enter the immediately following Monday batch. No additional clearance period or withdrawal fee is introduced.

Example: release on Wednesday 21 October 2026 → Monday 26 October 2026 at 09:00 EAT. The saved date is authoritative, even if the server restarts. The UI distinguishes reserved, scheduled, processing, and paid. Processing time is not a guaranteed arrival time.

## Durable worker

The API hosts `PayoutWorker`, with a startup catch-up and a 60-second polling interval. `JOBS_ENABLED=true` and `PAYOUT_WORKER_ENABLED=true` enable it (Compose defaults enabled). Set the latter to `false` and recreate the API to pause new dispatches without stopping reconciliation. No new service, cron, or secrets are required.

The worker scans 50 due records at a time, including overdue batches after downtime. A five-minute recheck delay and oldest-check-first ordering prevent held records starving later batches. PostgreSQL payment advisory locks and a status compare-and-set reserve each dispatch once across replicas. Original amounts/currencies and approved recipients are snapshotted. Existing transfers without a scheduled date are never automatically replayed.

Before dispatch, checks cover full funding, original net amount/currency, completed approved work, refund/dispute holds, active creator, enabled payout account, matching provider and unchanged recipient. Failed checks retain funds in SCHEDULED with a visible safety hold; creator/admin notifications are emitted only when entering the hold. Resolved holds resume on a later check without creating a new transfer or changing its batch date.

Paystack M-Pesa: persist PROCESSING and the deterministic hashed provider reference BEFORE calling the provider. After a timeout/crash, subsequent passes only verify that reference; they never automatically POST another transfer. If the provider never received it, an operator must investigate and resolve it—do not reset status or send another payment blindly. This prioritizes avoiding double payment over automatic retry. Confirmed failures/reversals require reconciliation and support review, not automatic resend. Verification checks the saved reference, KES amount, currency and recipient, and rejects a returned test/live environment mismatch.

Keep enough Paystack balance for transfers and provider fees. If the account requires transfer OTP approval, the payout remains pending until an authorized operator completes the provider's approval flow; Rivera does not bypass OTP or mark it paid. See Paystack's [transfer API](https://paystack.com/docs/api/transfer/) and [transfer management](https://paystack.com/docs/transfers/managing-transfers/) documentation.

Wise: Monday makes the record PENDING/claimable after checks. It does not send or fund Wise. The existing audited claim → manual Wise transfer → exact recipient/amount/completed-transfer-ID confirmation remains mandatory. Admins cannot claim future/SCHEDULED records, and must recheck payment/account holds before claiming. Maintain enough treasury funds separately. Wise recipients may receive money after Monday depending on operator/provider availability.

Provider-confirmed completion atomically updates the ledger and notifies creator/business once; repeated status deliveries do not duplicate notifications. Logs contain record IDs and outcomes, not emails, account IDs, secrets or payment credentials. Worker runs are recorded in OperationalJobRun; held/uncertain records are visible at `/admin/transfers`, with Wise batches at `/admin/wise-payouts`.

## Verification and operations

Automated tests cover Kenya calendar boundaries, year rollover, hashed reference stability, overlapping ticks, actual PostgreSQL scheduling, not-before enforcement, concurrent workers/admins, dispute holds/recovery, uncertain M-Pesa sends and verify-only recovery, and duplicate settlements. All provider sends in tests are mocked; disposable PostgreSQL is separate from production.

Apply the additive Prisma migration before deploying the new API. Back up PostgreSQL first. Do not synthesize real payments or move production dates into the past to test. Verify health endpoints, worker enablement, the due queue and admin/creator pages without dispatching a real transfer.

Rollback: disable PAYOUT_WORKER_ENABLED first and recreate the API. Keep the additive columns/enum and the reserved ledger intact. Do not run an old release implementation against scheduled records: it may not understand them. Restore a known compatible image only after inspecting scheduled/processing transfers; never drop transfer rows, reset uncertain sends or blindly restore a financial database over newer settlements.
