# Rivera production operations

Rivera is launch-capable code, not a production environment by itself. A staging smoke test, legal review, provider approval, DNS, backups, monitoring and object storage remain deployment responsibilities.

## Environments and secrets

Maintain separate development, test, staging and production credentials. Production startup rejects HTTP origins, insecure cookies, short/placeholder JWT secrets, console mail, local storage and test payment keys. Store secrets in the deployment platform, never Git or Docker images.

Required secret groups: PostgreSQL URL, JWT/session secret, SMTP credentials and sender, object-storage credentials, payment-provider credentials, monitoring DSN, application URLs and one-time Admin bootstrap credentials. Rotate credentials after staff changes and suspected disclosure.

For Kenya, set `PAYMENTS_PROVIDER=paystack`, `PAYSTACK_SECRET_KEY=sk_live_...`, and `PAYSTACK_CURRENCY=KES`. Rivera initializes hosted Paystack checkout from the API, so a browser-side Paystack public key is not required. Configure the Paystack dashboard webhook URL as `https://api.riveracreators.com/api/v1/payments/webhooks/paystack`; webhook authenticity is checked with the secret key and the `x-paystack-signature` header.

Activate Transfers for the Paystack business and disable Transfers OTP only for the Rivera server integration after the Paystack account and operational controls are approved. Automated release remains server-authorized, idempotent, webhook-confirmed, and gated by funded, completed work.

Email launch requires verified sending domains with SPF, DKIM and DMARC. Confirm alignment and delivery with the chosen mail provider before opening registration.

## Release procedure

1. Create and verify a database backup.
2. Build immutable API and web images and run lint, type checks, tests and dependency audit.
3. Deploy to staging and run the marketplace smoke suite.
4. Run `pnpm --dir apps/api prisma:deploy` as a one-off migration job.
5. Deploy the API, then verify `/api/v1/health` and `/api/v1/health/ready`.
6. Deploy the web application behind HTTPS and a trusted reverse proxy.
7. Verify the selected provider's webhook endpoint, signature and test event processing.
8. Exercise registration, campaign, proposal, hiring, funding, delivery and payout paths.
9. Monitor structured logs, error rates, failed jobs and provider dashboards.

Do not run destructive schema changes without an assessed rollback/forward-fix plan. Application containers do not run migrations automatically.

## HostPinnacle Cloudflare Tunnel edge

Rivera supports a dedicated, remotely managed Cloudflare Tunnel while retaining Caddy as a rollback route. The connector is enabled only through the `cloudflare-tunnel` Compose profile. It joins `rivera_edge`, an internal network shared only with Rivera web and API, and `rivera_egress`, which provides outbound Cloudflare connectivity. It does not join Rivera's default database network or any AllShops, Pickaxe, PostgreSQL, PgBouncer, Redis, or unrelated application network.

Create a named tunnel called `Rivera Production` in Cloudflare Zero Trust. Choose the Docker connector, copy its token once, and store it only as `CLOUDFLARE_TUNNEL_TOKEN` in `/opt/apps/rivera/.env`. Never paste it into source control, tickets, logs, or chat. Keep the environment file at mode `600`.

Configure these remotely managed Public Hostnames using the exact Docker service names:

| Public hostname | Tunnel origin service |
| --- | --- |
| `riveracreators.com` | `http://web:3000` |
| `www.riveracreators.com` | `http://web:3000` |
| `api.riveracreators.com` | `http://api:4000` |

The tunnel must have a final catch-all rule returning HTTP 404. Cloudflare normally creates the proxied DNS route when each Public Hostname is saved. If DNS is managed manually, replace only the existing `@`, `www`, and `api` A records with proxied CNAME records targeting `<TUNNEL_ID>.cfargotunnel.com`. Preserve `admin`, R2 image/video records, MX, SPF, DKIM, DMARC, Search Console verification, and every unrelated record. Confirm the exact tunnel UUID before replacing records.

Set these production values:

```dotenv
EDGE_MODE=cloudflare-tunnel
RIVERA_ROOT_DOMAIN=riveracreators.com
PUBLIC_API_BASE_URL=https://api.riveracreators.com/api/v1
CLOUDFLARE_TUNNEL_TOKEN=<stored only on the VPS>
```

Deploy after the tunnel and three Public Hostnames exist:

```sh
cd /opt/apps/rivera
chmod 600 .env
EDGE_MODE=cloudflare-tunnel VERIFY_PUBLIC_DEPLOYMENT=true deploy/deploy-production.sh
```

The script validates the token before starting, applies migrations, starts Caddy and the tunnel together, waits for PostgreSQL, API, web, Caddy, cloudflared, and any future cache/worker services, then compares `/api/v1/health/version` with the exact deployed Git SHA. A public verification failure stops the release instead of accepting a response from an old server. After public identity verification, it creates a restricted logical backup in `backups/`.

Useful operations:

```sh
# Validate the merged production configuration without displaying secrets
docker compose --env-file .env -f docker-compose.yml -f docker-compose.hostpinnacle.yml --profile cloudflare-tunnel config --quiet

# Connector status and sanitized operational logs
docker compose --env-file .env -f docker-compose.yml -f docker-compose.hostpinnacle.yml --profile cloudflare-tunnel ps cloudflared
docker compose --env-file .env -f docker-compose.yml -f docker-compose.hostpinnacle.yml logs --since 30m cloudflared

# Restart only the connector
docker compose --env-file .env -f docker-compose.yml -f docker-compose.hostpinnacle.yml --profile cloudflare-tunnel restart cloudflared

# Confirm multiple QUIC registrations and the three ingress rules
docker compose --env-file .env -f docker-compose.yml -f docker-compose.hostpinnacle.yml logs cloudflared | grep -E 'Registered tunnel connection|Updated to new configuration'

# Public DNS diagnosis
dig @1.1.1.1 riveracreators.com CNAME +short
dig @8.8.8.8 api.riveracreators.com CNAME +short
curl -fsS https://api.riveracreators.com/api/v1/health/version
curl -fsS https://api.riveracreators.com/api/v1/health/ready
```

### Rollback

Do not remove Caddy, its certificate volumes, the old A-record values, application volumes, or database backups during the rollback window. To roll back, change only `@`, `www`, and `api` from their tunnel CNAMEs to proxied A records for the previously verified VPS origin IP, wait for both 1.1.1.1 and 8.8.8.8 to return the intended route, confirm Caddy serves web and API, then stop only Rivera's connector:

```sh
cd /opt/apps/rivera
EDGE_MODE=cloudflare-tunnel docker compose --env-file .env -f docker-compose.yml -f docker-compose.hostpinnacle.yml --profile cloudflare-tunnel stop cloudflared
```

Set `EDGE_MODE=caddy` in `.env` only after rollback is confirmed. Never stop or modify AllShops cloudflared, shared databases, Redis, PgBouncer, Pickaxe, or another project's networks.

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

Production domain and HTTPS, Paystack business activation and transfer capability review, object storage, backup automation, monitoring credentials, SMTP domain authentication, Terms/Privacy legal review, tax/accounting review, support staffing and a successful staging smoke test are mandatory external launch gates.
