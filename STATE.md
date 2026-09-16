# PROJECT STATE: tutoring-platform

- **Active Project:** tutoring-platform (Next.js 14 App Router, Prisma ORM, Neon PostgreSQL, Tailwind CSS, Motion.dev)
- **Active Branch:** `main`
- **Last Completed Work:** Student Portal Dashboard assembled via Claude design vault and automated assembly skill (`assemble-page.mjs`). Implemented `StudentBalanceBanner` (dynamic positive/low/overdraft badges & tabular balance), `UpcomingLecturesCard` (deterministic Cairo/UTC date formatting and active check-in CTA button), and `RecentActivityLedger` (composed `_vault/ui/data/tabular-ledger.tsx`), with `/student` route redirect to `/student/dashboard`. All lint, Vitest unit suites, and multi-viewport visual audits passed cleanly.
- **Immediate Next Move:** Connect live Neon PostgreSQL instance via `.env`, run `npx prisma db push`, and execute staging end-to-end user testing.
- **Blockers / Open Decisions:** Awaiting production Neon database connection string for staging deployment.

## Milestone Checklist
- [x] Scaffold Feature-Driven Unidirectional directory tree
- [x] Configure `.eslintrc.json` with `eslint-plugin-boundaries`
- [x] Initialize Git repository with Pre-Commit Secret Sentinel (`.git/hooks/pre-commit`)
- [x] Model schema in `prisma/schema.prisma` (Users, Wallets, Sessions, AttendanceRecords, WalletTransactions)
- [x] Implement 4-hour window calculation and strict HTTP 403 deadline validation
- [x] Implement atomic check-in transaction (`prisma.$transaction`) with wallet deduction and overdraft flagging
- [x] Abstract tutor workflows (Gadwal timetable, token sharing, monthly/lifetime KPIs)
- [x] Create motion-enhanced UI components (animated balance counter, spring buttons, modals)
- [x] Execute unit & integration test suites (100% passing)
- [x] Write `CONTRACTS.md` and ADR 0001 (`docs/decisions/0001-feature-driven-architecture-and-stack.md`)
- [x] Connect remote Git repository URL (https://github.com/DragSensei/tutoring-platform.git)
- [x] Assemble Claude-styled Student Portal Dashboard (`/student/dashboard`) with balance status, lecture agenda & activity ledger
- [ ] Deploy to Vercel with Neon connection pooling
