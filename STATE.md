# PROJECT STATE: tutoring-platform

- **Active Project:** tutoring-platform (Next.js 14 App Router, Prisma ORM, Neon PostgreSQL, Tailwind CSS, Motion.dev)
- **Active Branch:** `main`
- **Last Completed Work:** Streamlined `/tutor/agenda` by removing the secondary expandable timetable and monthly KPI section per user specification:
  1. Main viewport strictly houses the top-middle live countdown timer (with distinct small boxed units for Hours, Minutes, and Seconds).
  2. Clickable session cards are rendered directly beneath with standard session codes (`ON-P3-9:42-11:42`, `ON-PV-C-10:12-12:12`, etc.) and textual student rosters.
  3. Header simplified to faculty portal identity with zero unnecessary toggles.
  4. Verified across 7 test suites (33/33 tests passing), zero ESLint/token violations, and verified visual perception audit across mobile, tablet, and desktop viewports.
- **Immediate Next Move:** Implement session student attendance roster management & student recording iteration per tutor selection.
- **Blockers / Open Decisions:** None.

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
- [x] Autonomous Bug Triage: Fix React SSR hydration mismatch on `GadwalTable` and `TransactionLedger`
- [x] Implement Tutor Dashboard Session Picker & Due Timer (`/tutor/dashboard`) with top-middle 3-box countdown timer, clickable cards, session codes (`ON-P3-6:00-8:00`), and assigned student rosters
- [ ] Deploy to Vercel with Neon connection pooling

## BUG TRIAGE LOG
- **Bug:** `Warning: Text content did not match. Server: "16 Sept, 02:03" Client: "Sep 16, 02:03 AM"` and `Image with src "/logo.png" has "fill" but is missing "sizes" prop`.
- **Root Cause:** Direct calls to `toLocaleString([], ...)` without a pinned locale and timezone caused format divergence between server environment (en-GB/Cairo) and client browser (en-US).
- **Files Touched:**
  - `src/shared/utils/date-format.ts` (New shared deterministic formatter)
  - `tests/unit/date-format.test.ts` (New regression test suite)
  - `src/features/sessions/components/gadwal-table.tsx` (Replaced `toLocaleString` with `formatDateTime`)
  - `src/features/wallets/components/transaction-ledger.tsx` (Replaced `toLocaleString` with `formatDateTime`)
  - `src/app/(portal)/student/dashboard/_components/UpcomingLecturesCard.tsx` (Deduplicated to shared `formatSessionSchedule`)
  - `src/app/layout.tsx` (Added `sizes="36px"` to `<Image />`)
- **Verification:** Vitest 25/25 passing, ESLint and token lint passing with zero errors, `/tutor/agenda` rendered with zero hydration warnings.
