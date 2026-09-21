# PROJECT STATE: tutoring-platform

- **Active Project:** tutoring-platform (Next.js 14 App Router, Prisma ORM, Neon PostgreSQL, Tailwind CSS, Motion.dev)
- **Active Branch:** `001-backend-attendance-persistence`
- **Latest Completed Task:** Iteration 001 now uses durable SessionParticipant rosters and shared serializable attendance/financial reconciliation for Student check-in and Tutor finalization while preserving local-only screenshot evidence and timetable exceptions.
- **Last Completed Work:** Animated all pages across the Admin Dashboard and clarified "Cohorts" domain semantics:
  1. Route-Level Page Transitions: Wrapped `AdminLayout` content canvas in `motion.div` keyed by `pathname` for smooth fade/elevation transitions between sibling routes.
  2. Overview (`/admin`): Staggered entry for executive header, 4 KPI cards with micro-elevation hover interactions, Wallet Solvency Sentinel, and recent sessions list.
  3. Gadwal Timetable (`/admin/gadwal`): Extracted `AdminGadwalView` client orchestrator with staggered entry across header, `ScheduleSessionCard`, and `GadwalTable` (reduced page orchestrator to 11 lines).
  4. Faculty Mentors (`/admin/mentors`): Staggered cascade for mentor cards with interactive hover lift, displaying certified mentors and their assigned session cohort counts.
  5. Platform Policies (`/admin/policies`): Staggered policy forms with `AnimatePresence` toast notifications and token-compliant brand styling.
  6. Wallets & Financials (`/admin/wallets`): Animated header, overdraft warning indicator, and student ledger card.
- **Immediate Next Move:** Complete checkpoint verification and review the correction diff before committing branch `001-backend-attendance-persistence`.
- **Blockers / Open Decisions:** None for Iteration 001; screenshot evidence remains intentionally local/deferred.

## Tier 2 Verification
- **Security:** Repository secret/env sentinel clean (machine-verified); Tutor role enforcement, session ownership/IDOR resistance, durable roster membership, Zod bounds, and generic authorization failures agent-reviewed (grade A).
- **Persistence:** `Session.attendance_notes` and durable `SessionParticipant` membership are applied to the local PostgreSQL schema. Attendance replacement, notes, final `COMPLETED` status, and immutable wallet reconciliation commit in one serializable Prisma transaction; an explicitly reviewed empty present list remains valid.
- **Performance:** Frontend static architecture checks pass (machine-verified); the mutation performs bounded per-participant reconciliation (`R <= 4`) with no unbounded work. Runtime latency is not-verified at this tier.
- **Tests:** Full Vitest suite passing (105/105, machine-verified), including PRIVATE/GROUP rosters, explicit session assignment, foreign membership, ownership, cancellation, all-absent, mixed attendance, check-in reconciliation with Admin-refund provenance, repeat saves, finalized-session check-in rejection, PRESENT→ABSENT→PRESENT net-charge invariants, Admin-only session creation, authenticated token check-in, and serializable concurrent Student/Tutor finalization attempts.
- **Visual:** Authenticated Attendance, Agenda, History, and Timetable audits pass at 375px, 768px, and 1440px with HTTP 200, zero horizontal spill, and compliant touch targets/form text (agent-reviewed from captured snapshots).
- **Revisor:** Token purity, route isolation, and UI architecture pass (machine-verified); the implementation reuses `AttendanceRecord`, the durable roster relation, `created_by_user_id` ledger provenance, the auth helper, and route loaders without a new provider or persistence layer.
- **Deferred/local-only:** Screenshot evidence remains browser-local and excluded from the server payload; timetable/reschedule exceptions remain in local storage.
- **Checkpoint:** Verification refreshed on `001-backend-attendance-persistence`; correction remains staged and uncommitted by request.

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
