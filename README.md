# Tutoring Platform

An operations platform for tutoring programs. Admins manage accounts, weekly schedules, policies, and financial reports; Tutors record attendance; Students use an internal wallet and view their learning activity.

## Product model

- **Roles:** Admin manages the platform; Tutor manages assigned sessions and attendance; Student views their schedule, wallet, and account.
- **Recurring schedules:** A `SessionSeries` stores a weekly Tutor assignment. It materializes bounded, concrete `Session` occurrences. Each occurrence owns its actual time, attendance, cancellation, wallet charge, and history.
- **Tutor attendance:** Attendance opens when a concrete session starts and remains editable through the configured grace period after it ends. Financial settlement is deferred until that period closes.
- **Student wallet:** Finalized attendance can create an internal wallet charge. Wallet events are internal accounting records; they do not prove that external cash was collected.
- **Tutor compensation:** Finalized delivered time can accrue compensation at the Tutor’s configured rate or the platform default. Missing rates remain visible for review and do not create guessed payments.
- **Referral and commission:** Student accounts may be attributed to a sales or referral source. Commission is configurable and disabled by default; its current basis is a finalized internal wallet charge. Rates, source, basis, and amounts are snapshotted with ledger entries.
- **Pricing:** Named pricing profiles can be assigned to a series; otherwise platform policy supplies the price. The effective profile name and student price are snapshotted at financial settlement.
- **Historical schedules:** `Session.historical_only` marks explicitly imported pre-system history. These sessions do not generate wallet, Tutor compensation, or commission finance.
- **Accounts and imports:** Admins can create and edit Tutor and Student accounts. Incomplete Students can finish one-time account setup; active users have a separate password-reset flow. CSV Student import previews field mappings, identity matches, conflicts, and proposed changes before an idempotent confirmation. Imports create incomplete accounts without passwords.
- **Admin Finances:** Date-filtered reports show delivered hours, wallet charges, Tutor compensation, commission, and provenance. Custom date pickers are used for date ranges and scheduling; finance dates are validated on the server.

## Architecture

The app uses Next.js 14 App Router, React, TypeScript, Prisma, and PostgreSQL. Feature slices own business actions and schemas; shared UI and server primitives live under `src/shared`.

`SessionSeries` describes a repeating assignment, while `Session` is the durable record for one occurrence. Student wallet charges, Tutor compensation, and sales commission are separate records with distinct meanings. Finalized financial entries preserve the rate, source, basis, and amount used at settlement; later policy changes do not rewrite them.

## Local setup

Requirements: Node.js/npm and a PostgreSQL database. Copy `.env.example` to `.env`, then set these variable names for your local environment:

```text
DATABASE_URL
DIRECT_URL
AUTH_SECRET
NEXT_PUBLIC_APP_URL
CRON_SECRET
NODE_ENV
TEST_DATABASE_URL
TEST_DIRECT_DATABASE_URL (optional)
```

Use a development database for `DATABASE_URL` and `DIRECT_URL`. Set `TEST_DATABASE_URL` to a separate database or schema whose identity includes `test`, `testing`, or `ci`; never point it at the development database. Keep secrets and real connection strings out of source control.

```bash
npm install
npx prisma generate
npm run dev
```

The development server runs at `http://localhost:3000`. To create/update a local development schema, first confirm the configured development database identity, then run `npm run prisma:push`. There is no supported seed command in this repository.

## Verification

Run from this project directory unless a command shows a workspace-relative path:

```bash
npx prisma validate
npx tsc --noEmit
npm run lint
node ../../../_shared-skills/scripts/test-db-guard.mjs --project . --check
node ../../../_shared-skills/scripts/test-db-guard.mjs --project . --run-tests
npm run build
```

Export the database variables from `.env` into the shell before running the guard; the guard does not load `.env` itself. It checks that `TEST_DATABASE_URL` is a dedicated test/CI target distinct from `DATABASE_URL`, then runs tests with the validated test target. Authenticated visual audits use the workspace `visual-audit.mjs` tool at 375px, 768px, and 1440px. Do not run database-backed tests directly with `npm test`.

## Deployment status

Production deployment is not ready. The production Prisma migration baseline remains unresolved. `prisma/sql/iteration-003-additive-draft.sql` is a non-deployable draft, not a production migration. Establish and review the production migration baseline before applying schema changes. Production also needs a scheduler that POSTs to `/api/internal/attendance/finalize` with `CRON_SECRET`; the app does not run that schedule on its own.
