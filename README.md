# Rivera

Rivera is a global business and creator marketplace. Phase 2 adds email/password accounts, verification, role authorization, onboarding and dashboard shells. Campaigns, bidding, payment, messaging and reviews remain future phases.

## Project layout

- `app/`, `components/rivera/`, `lib/`: Next.js App Router website, typed API client, auth and onboarding pages
- `apps/api/src/`: NestJS API; development Swagger at `/api/docs`
- `apps/api/prisma/`: PostgreSQL schema, initial migration and optional admin seed
- `packages/shared/`: shared TypeScript types
- `docker-compose.yml`: **development** Compose services, not a production deployment configuration

## Local startup with Docker

The simplest path only requires Docker Desktop with Docker Compose. Copy the example environment file, replace the development JWT secret with a random 32+ character value, and set your own database password. Choose an alphanumeric database password because Compose places it in a connection URL.

macOS or Linux:

```sh
cp .env.example .env
docker compose up --build
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

The API container applies the committed migration before starting. Open `http://localhost:3000` for the site, `http://localhost:4000/api/v1/health` for health, and `http://localhost:4000/api/docs` for development API docs. PostgreSQL is bound to localhost only. If port 5432 is already occupied, change `POSTGRES_PORT` in `.env`, for example to `55432`; containers continue to communicate on their internal port automatically. If startup fails, inspect `docker compose logs web api postgres`.

Stop the app with `docker compose down`. Add `--volumes` only when you intentionally want to erase the local database.

## Local startup without Docker for Node services

This option requires Node 22 and pnpm. Keep PostgreSQL in Docker or use an existing PostgreSQL 16 server, then install dependencies and generate the Prisma client:

```sh
pnpm install
pnpm --dir apps/api prisma:generate
docker compose up -d postgres
```

Export `DATABASE_URL`, `JWT_ACCESS_SECRET`, `WEB_ORIGIN`, and `APP_URL` from `.env`, run `pnpm --dir apps/api prisma:deploy`, then start `pnpm --dir apps/api dev` and `pnpm dev` in separate terminals. Set `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` for the browser. The Vinext development server uses `http://localhost:5173` outside Compose, so set `WEB_ORIGIN` and `APP_URL` to that origin when using this mode.

For an initial admin in **development**, set `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` (12+ characters) in the environment and run `pnpm --dir apps/api prisma:seed`. The seed does not reset an existing admin password. Never commit credentials.

## Account flow

Register at `/register` as Business or Creator. The API writes a bcrypt hash, creates one role assignment, and issues a single-use verification token. In development the verification URL is printed in **API logs** instead of sent through SMTP. Paste that URL into your browser. Production requires SMTP configuration and secure cookies. Once verified, log in and complete `/onboarding/business` or `/onboarding/creator`; the respective dashboard is available after onboarding.

Forgot password at `/forgot-password` uses a development link printed in API logs. Reset invalidates all prior sessions. `/resend-verification` issues another verification link with throttling. `/settings` changes the password or deactivates the account. The login response includes only public user details.

## Session design

Access JWTs expire after 15 minutes and live in an HttpOnly cookie scoped to `/api/v1`. Opaque 30-day refresh tokens live in a separate HttpOnly cookie scoped to `/api/v1/auth`; only their SHA-256 hashes are stored. Refresh rotates tokens. Reuse of a revoked token revokes the user's active sessions. The backend checks the session and user status on protected requests. Logout and password changes revoke sessions. Cookies use `SameSite=Lax` and become `Secure` with `COOKIE_SECURE=true` in production. Exact-origin CORS and unsafe-request Origin checks defend cookie-authenticated requests. The website retries an expired access token once via refresh.

Backend guards authorize role-specific onboarding; browser route guards only control navigation and never replace backend authorization. The dashboards currently contain no privileged data. Accounts cannot self-register as admins.

## Checks

```sh
pnpm lint
pnpm exec tsc --noEmit
pnpm --dir apps/api typecheck
pnpm --dir apps/api test
pnpm --dir apps/api prisma:generate
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api build
pnpm build
```

Run `docker compose config` and the complete creator, business and password reset browser flows when Docker is available. The hosted Sites page serves the website only; this repository's NestJS API and PostgreSQL are **not deployed**. Do not publish Phase 2 website changes before an HTTPS API and database are ready and the full flows have passed in staging.

## Next phase

Phase 3 can expand the business and creator profiles. The Phase 2 user, role and onboarding models provide the starting point. Campaign and application tables from the initial scaffold are not exposed as working features.
