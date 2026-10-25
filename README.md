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

The development server runs at `http://localhost:3000`. There is no supported seed command in this repository.

### Self-hosting (non-Vercel)

The app needs a long-running Node.js host, PostgreSQL, and a scheduler that can send authenticated HTTP requests. Build with `npm run build` and start with `npm start`; configure the app's environment variables on the host. The finalizer route is `POST /api/internal/attendance/finalize` and requires `Authorization: Bearer <CRON_SECRET>`. Schedule it periodically (for example, every five minutes); it finalizes only Sessions whose attendance window has closed, and its writes are idempotent.

Attendance evidence must use storage that survives host restarts. `ATTENDANCE_EVIDENCE_STORAGE=local` is for development or a host with a durable mounted volume configured through `ATTENDANCE_EVIDENCE_LOCAL_DIR`. For object storage, set `ATTENDANCE_EVIDENCE_STORAGE=r2` and configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET`; keep the bucket private. Screenshots are served through an Admin-authenticated application route, not public object URLs. No production credentials are needed for local development.

`prisma/migrations/0_baseline` is a schema snapshot for a clean database. A clean database can use `npx prisma migrate deploy`. An existing database must not apply the baseline as new tables: first verify full schema parity, then mark the baseline as applied and deploy only pending additive migrations. The current production migration history has not been reconciled or baselined; this repository change does not authorize or perform that operation.

`next dev` writes to `.next`; `npm run build` writes to `.next-build`, so a production build can run while the development server stays open. TypeScript includes generated types from both directories. For a temporary visual-audit server, run `npm run dev:verify` and audit `http://localhost:3001`; it writes to `.next-verify`. Do not launch a second plain `npm run dev` against the same `.next` directory while the human server is running. `next start` reads the production output in `.next-build`. Restart any dev server that was already running before this configuration change once so it loads the new config.

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

## Local toolkit path

The frontend verification commands read the ignored `.local/toolkit-root.json` file on this computer. Set its `path` to the absolute root of your toolkit checkout (the directory containing `ROUTER.md` and `_shared-skills`), for example `{"path":"D:/Work Tools/freelance-workspace"}`. Create this file separately on each computer; do not commit local paths. Missing or invalid configuration fails verification. The existing `npm run lint`, `lint:frontend`, `lint:ui`, `lint:tokens`, and `mock:api` commands use this setting.

## Global theme and finance presentation

Edit `theme.config.ts` to configure the site. `projectTheme.ui.defaultMode` selects `'light'` or `'dark'` on the first server render, without a browser preference override. The same file owns palettes and shared typography, radius and control settings; Tailwind consumes these values. Restart development or rebuild production after changing configuration. The public landing page retains its approved marketing palette, also owned by that configuration.

Admin Finance prioritizes tutor lifetime hours, earned amounts, recorded payouts and outstanding balances. Selected activity totals and per-session saved hourly rates remain separate from lifetime balances. Additional records, rate review and payout tools are disclosed beneath the main list. Scheduled session duration is the earnings basis, normally two hours or the explicitly scheduled duration; a timer is not proof of actual time worked. Final attendance, at least one PRESENT student, an ended session and a positive configured rate are required. Attendance opens at session start and closes at the configured end-plus-grace deadline (default four hours). Missing rates create review items rather than guessed pay.

### Planned later: shadcn/ui and reusable LMS components

Tailwind CSS 3 is already installed; shadcn/ui is not initialized. A future scoped adoption should align shadcn semantic CSS variables with this theme owner, preserve the existing aliases, then replace one existing accessible primitive at a time in `src/shared/components`. Audit keyboard/focus/overlay behavior and representative Admin/Tutor/Student consumers before expanding. Do not create a parallel component library or run the CLI over existing components blindly. A Tailwind/React upgrade is a separate compatibility decision.

For a second LMS, first inventory `weekly-session-schedule`, `gadwal-table`, `series-table`, shared pagination/toolbar controls and the existing dashboard timer. Separate presentation inputs from tutoring actions only when the second product supplies concrete requirements. Keep schedule timing, attendance and financial invariants in their current canonical owners. No package extraction or new repository boundary is introduced now.

### Planned later: Cloudflare deployment verification

Current changes add no new server runtime dependency. They do not certify the existing application for Workers. This repository uses Next.js 14, Prisma 5 and a local/R2 evidence adapter, with no installed Cloudflare adapter. The OpenNext documentation currently lists Next.js 14 while also announcing its Q1 2026 support removal; treat support as unresolved until a pinned adapter/version is tested. Cloudflare currently recommends vinext for new Next applications, which is not automatic authorization to migrate this existing product.

Before adoption, prototype authenticated pages, PostgreSQL serializable attendance/payout transactions, private R2 evidence upload/read and the authenticated finalizer trigger in the chosen Workers runtime. Verify a supported framework/adapter and Prisma driver strategy, `nodejs_compat`, secrets/bindings and an external scheduler. Select R2 rather than relying on persistent local files. Preserve the existing production migration-baseline decision. No deployment, dependency adoption, database migration or production write is part of this task.

Research checked 2026-10-13: [shadcn theming](https://ui.shadcn.com/docs/theming), [Tailwind v3 CSS variables](https://v3.tailwindcss.com/docs/customizing-colors#using-css-variables), [Cloudflare OpenNext guidance](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/), [OpenNext compatibility](https://opennext.js.org/cloudflare), [Prisma Workers deployment](https://www.prisma.io/docs/guides/deployment/cloudflare-workers). Facts: CSS variable themes are documented, and Workers deployment requires runtime-specific configuration. Inference: extending the existing theme owner minimizes migration work for this Admin/Tutor audience. Impact: use one theme owner now and defer deployment/library adoption. Limitations: source guidance changes, and no Workers runtime smoke or shadcn migration has been performed.
