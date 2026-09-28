# Rivera

## Phase 7 — campaign workspaces, deliverables, completion and reviews

An accepted Offer now creates an operational workspace rooted in its `CampaignParticipant`. Structured Campaign deliverables become required Work Items without changing the accepted compensation or Offer snapshot. The hired Creator can submit HTTPS links or private JPEG, PNG, WEBP, PDF and MP4 files; every resubmission creates an immutable numbered version. The Campaign-owning Business can approve only the latest submitted version or request a revision with a useful note.

Progress is the objective ratio of approved required Work Items. All required items must be approved before the Business can explicitly complete a collaboration. Multi-Creator Campaigns remain open until every participant is complete and the Business explicitly completes the Campaign. Rivera continues to display agreed compensation as “Not managed by Rivera” and does not imply that payment occurred.

Completed participants can review each other once. Published reviews update the Creator or Business aggregate and public profile; hidden and removed reviews do not. Reports and Admin hide/restore/remove actions are retained and audited. Workspace, submission, file, approval, completion and review operations all enforce ownership in the NestJS API.

Private submission files use `PRIVATE_UPLOAD_DIR` and the persistent `rivera_private_uploads` Docker volume, separate from public portfolio media. Files are returned only through an authenticated participant endpoint and use `private, no-store` response caching. Configure `MAX_DELIVERABLE_FILE_MB` (25 MB by default). External HTTPS links remain the preferred path for large video.

The Phase 7 seed includes active Work Items in pending, submitted, revision-requested and approved states, preserved submission versions, a completed collaboration and mutual reviews. Review moderation is available at `/admin/reviews`.

## Phase 6 — shortlist, messaging, Offers and hiring

Rivera now carries a paid Creator Application through Business review to an active collaboration:

`SUBMITTED → VIEWED → SHORTLISTED → OFFERED → ACCEPTED`

- A shortlist opens one private Rivera Conversation for the Application. The UI polls active conversations every seven seconds; Redis and WebSockets are intentionally not required.
- Collaboration Offers are immutable, versioned commercial snapshots. Creator proposal pricing remains separate, and Rivera does not process Business-to-Creator compensation in this phase.
- Offer acceptance runs in a serializable PostgreSQL transaction with a campaign-scoped advisory lock, rechecks Campaign state/expiry/capacity, creates one `CampaignParticipant`, and moves a full Campaign to `IN_PROGRESS`.
- Explicit professional contact details unlock only to the Business and Creator in an `ACTIVE` collaboration. Login emails are never used as contact details and public profile DTOs continue to omit professional contacts.
- Alternative paths include rejection, shortlist removal, Creator decline, Business withdrawal, Creator withdrawal before hiring, Offer expiry, Campaign cancellation and capacity exhaustion.

New authenticated areas include `/dashboard/creator/messages`, `/dashboard/business/messages`, `/dashboard/creator/offers`, `/dashboard/creator/collaborations`, and Business Campaign hired-Creator pages. Swagger documents the corresponding explicit domain-action endpoints.

Rivera is a global business and creator marketplace. Phases 1–6 now provide authentication, professional profiles, Campaign discovery, Creator proposals, Rivera Application Fees, shortlisting, private messaging, versioned Offers, capacity-safe hiring and collaboration contact unlock.

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

To send real transactional email, set `MAIL_PROVIDER=smtp` and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and either `SMTP_PASS` or the legacy `SMTP_PASSWORD`. Sender identity can be supplied as `MAIL_FROM`, or as `MAIL_FROM_NAME` plus `MAIL_FROM_ADDRESS`; `MAIL_REPLY_TO` is optional. Keep credentials in the ignored `.env` file or a deployment secret store, never in source control. Port 465 normally uses `SMTP_SECURE=true`, while port 587 normally uses `false`.

## Session design

Access JWTs default to 15 minutes and live in an HttpOnly cookie scoped to `/` so Next.js server layouts can authorize protected pages. Opaque refresh tokens default to 30 days and live in a separate HttpOnly cookie scoped to `/api/v1/auth`; only their SHA-256 hashes are stored. Both lifetimes and verification/reset lifetimes are environment-configurable. Refresh rotates tokens. Reuse of a revoked token revokes the user's active sessions. The backend checks the session and user status on protected requests. Logout, reset and password changes revoke sessions. Cookies use `SameSite=Lax` and become `Secure` with `COOKIE_SECURE=true` in production. Exact-origin CORS and unsafe-request Origin checks defend cookie-authenticated requests. The website retries an expired access token once via refresh.

NestJS guards authorize role-specific onboarding and `/api/v1/admin/summary`. Next.js server layouts verify the signed access token and role before rendering `/dashboard/business`, `/dashboard/creator`, `/onboarding/*`, `/settings`, or `/admin`; client navigation checks are only an additional usability layer. Accounts cannot self-register as admins.

All expected API failures return a stable `code` such as `INVALID_CREDENTIALS`, `FORBIDDEN_ROLE`, `EMAIL_NOT_VERIFIED`, or `VALIDATION_ERROR`, alongside the HTTP status and human-readable message. Development Swagger at `/api/docs` documents request bodies, success examples, and common authentication errors.

## Phase 3 marketplace profiles

Creators edit their professional identity at `/dashboard/creator/profile`: headline, bio, ISO location, categories, content types, languages, availability, profile and cover images, manually supplied social metrics, and up to 20 portfolio entries. Businesses use `/dashboard/business/profile` for their public identity, industry, location, company details, logo and cover. Profile completion is calculated by the API; ratings, verification and featured state remain system-controlled.

Visibility has three levels: `PUBLIC` profiles are shareable and included in discovery, `UNLISTED` profiles are available by direct URL only, and `PRIVATE` profiles are owner/admin only. Publishing enforces minimum profile requirements. Public creator and business serializers deliberately exclude account email, phone, admin review notes and internal authentication data.

Public URLs are `/creators/[slug]` and `/businesses/[slug]`; `/creators` provides server-backed search, country/platform/category filters, sorting and bounded pagination. Admins manage categories, industries, content types and manual verification requests under `/admin/*`. Profile verification is distinct from per-social-account metric verification.

Development uploads use the `LocalStorageService` abstraction and the persistent `rivera_uploads` Docker volume. Only JPEG, PNG and WEBP images with matching magic bytes are accepted; size limits are configured with `MAX_PROFILE_IMAGE_MB`, `MAX_COVER_IMAGE_MB` and `MAX_PORTFOLIO_IMAGE_MB`. Files receive generated object names and only the dedicated media directory is served. A future S3/R2 provider can implement the same storage interface; local storage is not intended as a production CDN.

The idempotent development seed creates 25 categories, 21 industries, 16 content types, three primary demo businesses and 12 synthetic creators with categories, social accounts and portfolios. It includes public/private, verified and pending-verification states. No real influencer imagery or scraped social data is used.

## Phase 4 campaign marketplace

Businesses create campaigns at `/dashboard/business/campaigns/new` using five stages: campaign basics, Creator requirements, deliverables, budget and dates, then review. Drafts accept incomplete information; publication applies the complete campaign, profile, budget, location and date rules. Owners can edit, duplicate, publish, pause, resume, close, cancel and delete drafts from `/dashboard/business/campaigns`.

Business and Creator dashboards include live campaign and opportunity summaries. Campaign publication, lifecycle changes and admin moderation are recorded in `CampaignAuditLog` for operational traceability.

Campaign status supports `DRAFT`, optional `PENDING_REVIEW`, `OPEN`, `PAUSED`, `CLOSED`, future-compatible `IN_PROGRESS` and `COMPLETED`, and `CANCELLED`. Only active, unexpired `OPEN` and `PUBLIC` campaigns appear in `/campaigns`. `UNLISTED` campaigns support direct links, while `PRIVATE` campaigns remain owner/Admin only. `LOCAL`, `NATIONAL`, `GLOBAL` and `REMOTE` targeting are distinct; global campaigns require no country list, while remote campaigns can optionally retain country eligibility.

Money is stored as integer minor units with its original three-letter currency. Campaigns can expose their range or show “Budget to be discussed.” Requirements reuse Phase 3 categories, content types and social platforms. A campaign can specify target countries/cities, platform-specific follower levels, languages, verification, Creator slots, deliverables, usage rights, supplied products and travel coverage.

Public campaign responses are explicit allowlists containing the summary, Business public identity, requirements, budget visibility, basic deliverables and dates. The full description, target audience, expected outcomes, special instructions, locked/owner attachments and private Business contacts are available only through protected owner and Admin APIs. This separation is the Phase 5 unlock boundary.

Creators browse and filter `/campaigns` or use `/dashboard/creator/opportunities`; filters include text, country, city, category, platform, objective, location type, budget and closing date. Saved opportunities are unique per Creator/campaign. Recommendations use deterministic category, platform, location, language and verification signals—no AI, embeddings or external map service.

Admins inspect full campaign briefs and moderate status, visibility and featured state at `/admin/campaigns`. `CAMPAIGN_REVIEW_REQUIRED` optionally sends publication through review. Limits are controlled with `MAX_CAMPAIGN_CATEGORIES`, `MAX_CAMPAIGN_DELIVERABLES`, `MAX_CAMPAIGN_ATTACHMENTS` and `MAX_CAMPAIGN_ATTACHMENT_MB`.

The development seed additionally creates synthetic campaigns covering local, national, global, remote, open and draft states and one saved Creator opportunity.

## Phase 5 proposals and Application Fees

Creators start at an open Campaign and use a short flow: save an editable `DRAFT`, review the Proposal and Rivera fee separately, then use one free Application Credit, submit a zero-fee application, or continue to Stripe-hosted Checkout. The Creator’s proposed compensation is never collected in Phase 5. A Business only receives `SUBMITTED`, `VIEWED`, or historical `WITHDRAWN` Applications; drafts, pending payments and failed payments remain private.

Money is always stored in integer minor units and converted with the currency’s `Intl.NumberFormat` fraction digits. `ApplicationFeeService` resolves active rules in this order: country plus category, country, category, then global; priority breaks ties within a specificity level. Environment defaults are the final fallback. The fee and rule are snapshotted when checkout begins so later Admin changes cannot alter an existing attempt. A unique Creator/Campaign constraint prevents duplicate Applications, while a partial unique payment index prevents simultaneous active checkout attempts.

New Creator onboarding grants `NEW_CREATOR_FREE_APPLICATIONS` once through an idempotent ledger reference. Credit use, ledger insertion and Application submission run in one serializable transaction and cannot produce a negative balance. Admins can create/toggle fee rules, grant credits with a reason, inspect Applications and payments, and issue a full approved refund from `/admin/*`.

Stripe integration is limited to the Rivera Application Fee and is behind a `PaymentProviderAdapter`. Rivera sends the server-calculated amount to hosted Checkout and never receives raw card details. The browser success redirect is only a processing state: a signature-verified webhook (or conservative server reconciliation) must validate the stored amount and currency before activation. Provider event IDs are unique for replay safety, and payment/Application/audit writes are transactional. Failed or expired payment attempts return the Proposal to a retryable draft. If a Campaign closes before a late payment activates, the charge is flagged for Admin refund review rather than exposing the Proposal.

Set these values in the ignored `.env` file:

```dotenv
STRIPE_APPLICATION_FEE_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
DEFAULT_APPLICATION_FEE_MINOR=300
DEFAULT_APPLICATION_FEE_CURRENCY=USD
NEW_CREATOR_FREE_APPLICATIONS=3
APPLICATION_PAYMENT_EXPIRY_MINUTES=30
```

For local Stripe test mode, install and authenticate the Stripe CLI, then forward only the webhook endpoint:

```sh
stripe listen --forward-to http://localhost:4000/api/v1/payments/webhooks/stripe
```

Copy the reported `whsec_...` value to `STRIPE_WEBHOOK_SECRET`, restart the API, and use Stripe’s published test cards in the hosted Checkout page. A redirect alone must leave the Application unsubmitted until the webhook or verified reconciliation succeeds. Replaying the same event is safe. Voluntary withdrawals do not automatically refund fees; duplicate/erroneous charges and cancelled Campaign cases may be refunded by an Admin. The full Campaign brief unlocks only for a paid, credited or zero-fee submission and its DTO still excludes Business email, phone, private address and internal notes.

The Phase 5 seed creates global and Qatar fee rules, Creators with three and zero credits, and representative draft, awaiting-payment, paid, credited, zero-fee viewed and withdrawn Applications using obviously synthetic test references.

## Checks

```sh
pnpm lint
pnpm test:frontend
pnpm exec tsc --noEmit
pnpm --dir apps/api typecheck
pnpm --dir apps/api test
pnpm --dir apps/api prisma:generate
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api exec prisma migrate status
pnpm --dir apps/api prisma:seed
pnpm --dir apps/api build
pnpm build
docker compose config
docker compose build api web
docker compose up -d
docker compose ps
```

Run `docker compose config` and the complete creator, business and password reset flows before a release. The hosted Sites page serves the website only; this repository's NestJS API and PostgreSQL are **not deployed**. Point the hosted frontend at an HTTPS deployment of the API before treating hosted authentication as production-ready.

## Next phase

Phase 7 completes Rivera’s non-payment collaboration lifecycle. The durable approved Work Items, completed participants, Offer snapshots and bilateral reviews are a safe foundation for a future explicitly requested phase covering Business-to-Creator payments, Stripe Connect, escrow or milestones, Creator payouts, formal disputes and advanced Campaign analytics.
