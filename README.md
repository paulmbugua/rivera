# Rivera

Rivera is a global business and creator marketplace. Phase 2 adds email/password accounts, verification, role authorization, onboarding and dashboard shells. Campaigns, bidding, payment, messaging and reviews remain future phases.

## Project layout

- `app/`, `components/rivera/`, `lib/`: **Next.js 16 App Router** website, typed API client, auth and onboarding pages. Sites uses Vinext only as its Cloudflare-compatible build adapter; the client application itself is Next.js, not a Vite SPA.
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

The first build downloads the workspace dependencies and can take several minutes on a slow connection. Its pnpm package and policy-metadata cache persists across BuildKit retries, so if the npm registry times out, run `docker compose up --build` again and it will reuse completed downloads.

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

Create the required development Admin, Business and Creator accounts and their completed profiles with:

```powershell
docker compose exec api pnpm --dir apps/api prisma:seed
```

The default local accounts are `admin@rivera.local`, `business.demo@example.com`, and `creator.demo@example.com`; all use `RiveraDemo123`. Override every value with the `*_SEED_EMAIL` and `*_SEED_PASSWORD` variables before using a shared environment. The seed is idempotent and does not reset existing passwords. Never use these development credentials in production.

## Account flow

Register at `/register` as Business or Creator. The API writes a bcrypt hash, creates one role assignment, and issues a single-use verification token. In development the verification URL is printed in **API logs** instead of sent through SMTP. Paste that URL into your browser. Production requires SMTP configuration and secure cookies. Once verified, log in and complete `/onboarding/business` or `/onboarding/creator`; the respective dashboard is available after onboarding.

Forgot password at `/forgot-password` uses a development link printed in API logs. Reset invalidates all prior sessions. `/resend-verification` issues another verification link with throttling. `/settings` changes the password or deactivates the account. The login response includes only public user details.

## Session design

Access JWTs default to 15 minutes and live in an HttpOnly cookie scoped to `/` so Next.js server layouts can authorize protected pages. Opaque refresh tokens default to 30 days and live in a separate HttpOnly cookie scoped to `/api/v1/auth`; only their SHA-256 hashes are stored. Both lifetimes and verification/reset lifetimes are environment-configurable. Refresh rotates tokens. Reuse of a revoked token revokes the user's active sessions. The backend checks the session and user status on protected requests. Logout, reset and password changes revoke sessions. Cookies use `SameSite=Lax` and become `Secure` with `COOKIE_SECURE=true` in production. Exact-origin CORS and unsafe-request Origin checks defend cookie-authenticated requests. The website retries an expired access token once via refresh.

NestJS guards authorize role-specific onboarding and `/api/v1/admin/summary`. Next.js server layouts verify the signed access token and role before rendering `/dashboard/business`, `/dashboard/creator`, `/onboarding/*`, `/settings`, or `/admin`; client navigation checks are only an additional usability layer. Accounts cannot self-register as admins.

All expected API failures return a stable `code` such as `INVALID_CREDENTIALS`, `FORBIDDEN_ROLE`, `EMAIL_NOT_VERIFIED`, or `VALIDATION_ERROR`, alongside the HTTP status and human-readable message. Development Swagger at `/api/docs` documents request bodies, success examples, and common authentication errors.

## Checks

```sh
pnpm lint
pnpm test:frontend
pnpm exec tsc --noEmit
pnpm --dir apps/api typecheck
pnpm --dir apps/api test
pnpm --dir apps/api prisma:generate
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api build
pnpm build
```

Run `docker compose config` and the complete creator, business and password reset flows before a release. The hosted Sites page serves the website only; this repository's NestJS API and PostgreSQL are **not deployed**. Point the hosted frontend at an HTTPS deployment of the API before treating hosted authentication as production-ready.

## Next phase

Phase 3 can expand the business and creator profiles. The Phase 2 user, role and onboarding models provide the starting point. Campaign and application tables from the initial scaffold are not exposed as working features.
