# Rivera production operations

Rivera is launch-capable code, not a production environment by itself. A staging smoke test, legal review, provider approval, DNS, backups, monitoring and object storage remain deployment responsibilities.

## Environments and secrets

Maintain separate development, test, staging and production credentials. Production startup rejects HTTP origins, insecure cookies, short/placeholder JWT secrets, console mail, local storage and Stripe test keys. Store secrets in the deployment platform, never Git or Docker images.

Required secret groups: PostgreSQL URL, JWT/session secret, SMTP credentials and sender, object-storage credentials, Stripe live and webhook secrets, monitoring DSN, application URLs and one-time Admin bootstrap credentials. Rotate credentials after staff changes and suspected disclosure.

Email launch requires verified sending domains with SPF, DKIM and DMARC. Confirm alignment and delivery with the chosen mail provider before opening registration.

## Release procedure

1. Create and verify a database backup.
2. Build immutable API and web images and run lint, type checks, tests and dependency audit.
3. Deploy to staging and run the marketplace smoke suite.
4. Run `pnpm --dir apps/api prisma:deploy` as a one-off migration job.
5. Deploy the API, then verify `/api/v1/health` and `/api/v1/health/ready`.
6. Deploy the web application behind HTTPS and a trusted reverse proxy.
7. Verify the Stripe webhook endpoint, signature secret and test event processing.
8. Exercise registration, campaign, proposal, hiring, funding, delivery and payout paths.
9. Monitor structured logs, error rates, failed jobs and provider dashboards.

Do not run destructive schema changes without an assessed rollback/forward-fix plan. Application containers do not run migrations automatically.

## PostgreSQL backup and restore drill

- Take encrypted daily logical or managed snapshots; retain daily backups for 30 days and monthly backups for 12 months unless legal/accounting policy requires longer.
- Store backups in a separate account/region with restricted restore permissions.
- Record backup completion and alert on failures.
- Quarterly, restore the newest backup into an isolated database, run migrations, compare table counts and critical financial totals by currency, and execute a read-only smoke test.

Example logical backup:

```sh
pg_dump --format=custom --no-owner --file=rivera.dump "$DATABASE_URL"
```

Example isolated restore:

```sh
createdb rivera_restore_check
pg_restore --no-owner --dbname=rivera_restore_check rivera.dump
```

Never restore over production during a drill. Document recovery-point and recovery-time results.

## Health and incident response

- `/health` proves only process liveness.
- `/health/ready` returns `ready`, `degraded`, or HTTP 503 `not_ready` with safe dependency names.
- Correlate client error `requestId` values with structured API logs.
- Alert on repeated 5xx responses, failed migrations, failed operational jobs, webhook failures, transfer/refund failures and database readiness.
- Disable money-moving actions through configuration/provider controls during a payment incident; never mark records paid manually.

## Data lifecycle policy

Account deactivation blocks access but preserves marketplace history. Export and deletion requests are reviewed by Admin. Anonymization or deletion must preserve records required for accounting, disputes, fraud prevention, payment reconciliation and audit obligations. Define jurisdiction-specific retention with legal counsel before production.

Recommended policy starting points: inactive profiles may be unpublished after 24 months; private messages and uploads follow the active contract/dispute retention period; payment/audit records follow accounting and legal retention; rejected deletion portions require a documented reason. These controls do not by themselves establish GDPR or CCPA compliance.

## External launch gates

Production domain and HTTPS, Stripe/Connect approval and country capability review, object storage, backup automation, monitoring credentials, SMTP domain authentication, Terms/Privacy legal review, tax/accounting review, support staffing and a successful staging smoke test are mandatory external launch gates.
