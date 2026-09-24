# Rivera

Rivera connects businesses and content creators. This repository contains the Phase 1 public site and the initial API, PostgreSQL, Prisma and shared-type foundation. Accounts, campaigns, applications, messaging and payments are **not implemented yet**.

## Structure

- `app/` — Next.js App Router site (deployed on Sites using Vinext)
- `apps/api/` — NestJS REST API; `/api/v1/health` and development Swagger at `/api/docs`
- `apps/api/prisma/` — initial relational schema
- `packages/shared/` — shared TypeScript types
- `docker-compose.yml` — local PostgreSQL, API and web services

## Local development

Requires Node 22, pnpm and Docker. Copy `.env.example` to `.env` for local use. Run `pnpm install`, `docker compose up --build`, then visit `http://localhost:3000` and `http://localhost:4000/api/v1/health`. Run `pnpm --dir apps/api prisma:migrate` to create the initial migration (configure `DATABASE_URL` for the local Postgres instance first). For separate processes, run `pnpm dev` and `pnpm --dir apps/api dev` with PostgreSQL running. API validation requires `DATABASE_URL` and uses Zod. No production secrets are included.

The hosted Sites deployment currently serves the landing page only. NestJS and PostgreSQL require a separate production hosting environment. The browser page does not claim to submit real campaigns or applications.

## Phase 2

Implement authentication and role-scoped business and creator profiles, then add backend authorization tests before opening account workflows publicly.
