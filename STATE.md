# PROJECT STATE: tutoring-platform

- **Active Project:** tutoring-platform (Next.js 14 App Router, Prisma ORM, Neon PostgreSQL, Tailwind CSS, Motion.dev)
- **Active Branch:** `002-backend-recurring-sessions-and-accounts`
- **Latest Completed Task:** Final Tutor attendance/scheduling behavior pass is complete pending final checkpoint review; Iteration 001 remains committed at `08e0164`.
- **Last Completed Work:** Added bounded recurring-session materialization, scoped weekly Gadwal reads, complete edit/cancel scope handling, and secure Admin Tutor/Student account setup:
  1. `SessionSeries` owns weekly assignments; concrete `Session` rows remain authoritative for attendance, wallets, completion, cancellation, and audit history.
  2. Materialization is Cairo-aware, bounded to 12 weeks, idempotent, concurrency-tested, and stops for ended/cancelled series.
  3. Admin Gadwal supports Tutor filtering, clearing, and all edit/cancel scopes while preserving history-bearing occurrences.
  4. Admin provisioning is limited to Tutor and Student; partial Students complete a one-time hashed-token setup flow that atomically activates the account and establishes the normal session.
  5. Active Tutor/Student password reset is a separate purpose-scoped, hashed, short-lived, revocable, atomic one-time token flow; reset changes only the password and returns the user to normal login.
  6. Shared Combobox clipping is fixed; Cairo-safe date defaults and responsive overflow fixes were verified visually. Tutor countdown now shows DAYS / HOURS / MINUTES / SECONDS.
  7. Tutor attendance is manual, opens at the concrete Session start, remains editable through end plus policy grace, and finalizes wallet state only after the grace close.
  8. Concrete Session rows now own effective one-occurrence postpones; the weekly SessionSeries pattern remains unchanged.
  9. Public/student attendance-link behavior and new token issuance were removed while historical token storage remains intact.
- **Immediate Next Move:** Review the final checkpoint evidence and commit only if the requested release decision is affirmative; do not push automatically.
- **Blockers / Open Decisions:** Production Prisma migration history remains unresolved; production deployment still requires an explicit migration strategy and a scheduled authenticated POST to `/api/internal/attendance/finalize` with `CRON_SECRET`. Development schema changes were applied additively after database identity checks; no destructive history cleanup was performed.

## Tier 2 Verification
- **Security:** Repository secret/env sentinel clean (machine-verified); the secure due-attendance finalizer exists, with Tutor ownership, pre-start/after-close fail-closed attendance mutation, Student mutation removal, authenticated scheduler trigger, finalizer idempotency, and history-preserving cleanup agent-reviewed.
- **Performance:** Frontend static architecture checks pass (machine-verified); recurrence materialization remains bounded to 12 weeks and scoped to the selected Tutor. Runtime latency is not-verified at this tier.
- **Tests:** Full Vitest suite passing (144/144, machine-verified) against isolated `tutoring_platform_test`, distinct from `tutoring_platform_db`; attendance regression verification remains green, covering attendance-window boundaries, final-state wallet settlement, concurrent finalization, recurring occurrence edits, postpone isolation, scheduler authentication, and timer boundaries.
- **Visual:** Authenticated `/tutor/agenda`, `/tutor/attendance/[sessionId]`, and `/tutor/timetable` audits passed at 375px, 768px, and 1440px with zero horizontal spill and 100% measured touch/font compliance; screenshots were manually inspected.
- **Revisor:** Token purity, route isolation, UI architecture, and concrete-occurrence ownership pass (machine-verified); completed/cancelled timetable rows no longer expose a misleading postpone affordance.
- **Database:** Test verification used only `tutoring_platform_test`. Development identity was separately proved as `tutoring_platform_db`; two named stale Sessions were retained because each had attendance history, and the named Robotics Session was deleted only after proving zero attendance, financial, participant, and audit dependencies. Schema changes were additive.
- **Checkpoint:** Prisma validation, TypeScript, lint, isolated full tests, production build, diff-check, authenticated Tutor visual audit, and checkpoint Tier-2 machine evidence are green after the final UI correction; no commit or push performed.

## Final Tutor Attendance/Scheduling Pass
- **Attendance timing:** `attendanceOpensAt = Session.start_time`; `attendanceClosesAt = Session.end_time + PlatformPolicy.checkInWindowHours`.
- **Canonical owners:** `deadline.ts` owns timing semantics; concrete `Session` rows own effective occurrence times; `finalizeDueAttendance` owns post-grace financial settlement.
- **Wallet behavior:** Save/edit writes roster state only. At close, PRESENT reconciles to exactly one net charge, ABSENT to zero, and repeated/concurrent finalization is idempotent.
- **Link removal:** Tutor copy/generate/link actions and public Student attendance routes were removed. Historical token columns and compatibility storage remain non-functional.
- **Deployment requirement:** Configure a production scheduler to POST the internal finalizer route with `CRON_SECRET`; exact-time background execution is not provided by the local app automatically.

## Milestone Checklist
- [x] Scaffold Feature-Driven Unidirectional directory tree
- [x] Configure `.eslintrc.json` with `eslint-plugin-boundaries`
- [x] Initialize Git repository with Pre-Commit Secret Sentinel (`.git/hooks/pre-commit`)
- [x] Model schema in `prisma/schema.prisma` (Users, Wallets, Sessions, AttendanceRecords, WalletTransactions)
- [x] Implement 4-hour window calculation and strict HTTP 403 deadline validation
- [x] Implement atomic check-in transaction (`prisma.$transaction`) with wallet deduction and overdraft flagging
- [x] Persist Tutor attendance decisions and session notes with authenticated, ownership-scoped, idempotent Prisma transactions
- [x] Abstract tutor workflows (Gadwal timetable, token sharing, monthly/lifetime KPIs)
- [x] Create motion-enhanced UI components (animated balance counter, spring buttons, modals)
- [x] Execute unit & integration test suites (100% passing)
- [x] Write `CONTRACTS.md` and ADR 0001 (`docs/decisions/0001-feature-driven-architecture-and-stack.md`)
- [x] Connect remote Git repository URL (https://github.com/DragSensei/tutoring-platform.git)
- [x] Assemble Claude-styled Student Portal Dashboard (`/student/dashboard`) with balance status, lecture agenda & activity ledger
- [x] Autonomous Bug Triage: Fix React SSR hydration mismatch on `GadwalTable` and `TransactionLedger`
- [x] Implement Tutor Dashboard Session Picker & Due Timer (`/tutor/dashboard`) with top-middle 3-box countdown timer, clickable cards, session codes (`ON-P3-6:00-8:00`), and assigned student rosters
- [x] Autonomous Bug Triage: Resolve Student Dashboard HTTP 500 (`Wallet_user_id_fkey`) and harden student identity resolution
- [x] Implement Admin Landing Overview (`/admin`) and persistent responsive Admin Sidebar
- [ ] Deploy to Vercel with Neon connection pooling

## FUTURE ROADMAP & UPCOMING BACKLOG
- [x] **Admin Dashboard Design Alignment:** Refactored Admin portal (`/admin`, `/admin/gadwal`, `/admin/wallets`, `/admin/mentors`, `/admin/policies`) into an edge-to-edge ($x = 0, y = 0$) Full-Height Enterprise Column Shell with warm neutral `#FBFBF9` (`bg-canvas`) continuous canvas, collapsible icon-only strip toggle (`w-18` 72px) with hover tooltips, clustered navigation, bottom public site pin, and responsive mobile drawer.
- [x] **Admin Landing "Overview" Page:** Created central landing overview page (`/admin`) displaying active cohort KPIs, daily check-in volume, pending overdrafts, and quick action shortcuts.
- [x] **Admin Dashboard Sidebar:** Implemented persistent, responsive, collapsible navigation sidebar organizing core administrative functions (Overview, Timetable / Gadwal, Wallets & Financials, Faculty Mentors, Platform Settings).
- [x] **Configurable Platform Policies System:** Added `PlatformPolicy` model to Prisma schema and database with dynamic check-in deadline window (`check_in_window_hours`), pricing (`group_session_price`, `private_session_price`), and `allow_overdraft` toggle. Wired dynamic values into session creation, attendance check-in atomicity, and built interactive admin policies editor at `/admin/policies`.
- [x] **Custom Modern Combobox Primitive:** Built zero-dependency, pure React/Tailwind searchable combobox (`src/shared/components/combobox.tsx`) adhering to design tokens with keyboard navigation, empty state handling, and integrated into `ScheduleSessionCard` for tutor selection.
- [x] **Tutor Agenda Mobile Ergonomics & Accessibility:** Resolved 11 touch-target (<44px) and 9 font-scale (<14px) defects across header navigation tabs, timer copy triggers, and course session action buttons on `/tutor/agenda` (44/44 unit tests passing, 100% token and architecture lints green).
- [x] **Tutor & Student Red Brand Depth:** Enriched both Tutor and Student dashboards with crimson brand red (`brand.primary: #DC2626`, `brand.subtle: #FEF2F2`, `brand.border: #FECACA`) across interactive states, card rims, and focal indicators. Ensure 100% compliance with mobile ergonomics (touch targets >= 44px).



## BUG TRIAGE LOG
- **Bug 1:** `Warning: Text content did not match. Server: "16 Sept, 02:03" Client: "Sep 16, 02:03 AM"` and `Image with src "/logo.png" has "fill" but is missing "sizes" prop`.
- **Root Cause:** Direct calls to `toLocaleString([], ...)` without a pinned locale and timezone caused format divergence between server environment (en-GB/Cairo) and client browser (en-US).
- **Files Touched:**
  - `src/shared/utils/date-format.ts` (New shared deterministic formatter)
  - `tests/unit/date-format.test.ts` (New regression test suite)
  - `src/features/sessions/components/gadwal-table.tsx` (Replaced `toLocaleString` with `formatDateTime`)
  - `src/features/wallets/components/transaction-ledger.tsx` (Replaced `toLocaleString` with `formatDateTime`)
  - `src/app/(portal)/student/dashboard/_components/UpcomingLecturesCard.tsx` (Deduplicated to shared `formatSessionSchedule`)
  - `src/app/layout.tsx` (Added `sizes="36px"` to `<Image />`)
- **Verification:** Vitest 25/25 passing, ESLint and token lint passing with zero errors, `/tutor/agenda` rendered with zero hydration warnings.

- **Bug 2:** `GET http://localhost:3000/student/dashboard 500 (Internal Server Error)` (`Foreign key constraint violated: Wallet_user_id_fkey`).
- **Root Cause:** `getStudentDashboardData` used raw cookie `session?.userId` or `'default-student-id'` without verifying against `prisma.user`. When a non-student session cookie was present or a default string was used, `getStudentWallet` called `prisma.wallet.create({ data: { user_id } })`, which violated the database foreign key constraint.
- **Files Touched:**
  - `src/features/wallets/server/wallet-actions.ts` (Verified user existence before querying/creating wallet)
  - `src/app/(portal)/student/dashboard/_components/dashboard-data.ts` (Hardened student resolution to validated database records)
  - `src/app/(portal)/student/wallet/page.tsx` (Hardened student user lookup)
  - `tests/unit/wallet-resilience.test.ts` (Added regression tests for non-existent users and safe wallet creation)
- **Verification:** Vitest 35/35 passing, Playwright multi-viewport visual audit passing with HTTP 200 and zero horizontal spill.
