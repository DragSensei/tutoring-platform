# PROJECT STATE: tutoring-platform

- **Active Project:** tutoring-platform (Next.js 14 App Router, Prisma ORM, Neon PostgreSQL, Tailwind CSS, Motion.dev)
- **Active Branch:** `main`
- **Latest Completed Task:** Re-architected the existing tutor frontend around a responsive portal shell, dedicated attendance workspace, timetable route, and naturally scrolling agenda while preserving local-only documentation and recurrence semantics.
- **Last Completed Work:** Animated all pages across the Admin Dashboard and clarified "Cohorts" domain semantics:
  1. Route-Level Page Transitions: Wrapped `AdminLayout` content canvas in `motion.div` keyed by `pathname` for smooth fade/elevation transitions between sibling routes.
  2. Overview (`/admin`): Staggered entry for executive header, 4 KPI cards with micro-elevation hover interactions, Wallet Solvency Sentinel, and recent sessions list.
  3. Gadwal Timetable (`/admin/gadwal`): Extracted `AdminGadwalView` client orchestrator with staggered entry across header, `ScheduleSessionCard`, and `GadwalTable` (reduced page orchestrator to 11 lines).
  4. Faculty Mentors (`/admin/mentors`): Staggered cascade for mentor cards with interactive hover lift, displaying certified mentors and their assigned session cohort counts.
  5. Platform Policies (`/admin/policies`): Staggered policy forms with `AnimatePresence` toast notifications and token-compliant brand styling.
  6. Wallets & Financials (`/admin/wallets`): Animated header, overdraft warning indicator, and student ledger card.
- **Immediate Next Move:** Final deployment verification or staging preview to Vercel with Neon connection pooling.
- **Blockers / Open Decisions:** None.

## Tier 2 Verification
- **Tutor Workspace UI:** The tutor shell now owns desktop/mobile navigation for Agenda, Timetable, and History. `/tutor/attendance/[sessionId]` owns the full attendance workflow, and the obsolete drawer was removed. The existing nearest-session timer still selects by effective start/end time rather than by attendance deadline; shared countdown functions now live in `src/shared/utils/session-timing.ts`.
- **Frontend-only boundaries:** Screenshot evidence is browser-compressed and stays local; notes and one-off reschedule exceptions are visibly local-only. No server action, schema, API, authentication, or production session data contract changed.
- **Search and responsive UI:** Shared client table toolbar covers Gadwal, transaction ledger, admin wallets, account directory, and student activity ledger. Tutor agenda and student dashboard viewport audits pass at 375px, 768px, and 1440px (agent-reviewed); desktop page canvas and mobile touch targets are clean.
- **Tests:** Vitest 78/78 passing (machine-verified): all-absent review state, shared session timing, effective reschedules, image validation/scaling, pagination, and table search boundaries are covered.
- **Twelve-Row Table Pagination:** Added shared local pagination to Gadwal timetable, transaction ledger, admin wallets, and admin accounts. Each page shows at most 12 rows, omits controls for one-page datasets, and clamps the current page if the dataset shrinks.
- **Security:** Repository secret and environment sentinel clean (machine-verified); authorization remains unchanged and was agent-reviewed.
- **Performance:** Static frontend architecture checks pass (machine-verified); the public viewport audit passes at 375px, 768px, and 1440px (agent-reviewed). Protected table screenshots require an authenticated browser session and correctly reject unauthenticated requests; runtime latency is not-verified.
- **Tests:** Vitest 65/65 passing (machine-verified), including empty, partial, exact, multi-page, and clamped pagination boundaries.
- **Revisor:** Token purity and route isolation pass (machine-verified); the shared, dependency-free pagination pattern is YAGNI-reviewed.
- **Tutor Wallet Privacy:** Tutor session queries no longer select wallet records; tutor attendance views render no wallet, balance, overdraft, total-deduction, or batch-total details. Vitest: 60/60 passing; ESLint, frontend architecture, UI architecture, token purity, Impeccable detector, and interactive viewport audits pass.
- **Security:** Audited animation components and route transitions; zero database exposure or unescaped state rendering; all client components remain decoupled from direct Prisma queries.
- **Performance:** Hardware-accelerated GPU transforms (`opacity`, `y`, `scale`) using `motion/react`; zero layout shifts (CLS = 0); verified 100% mobile ergonomics compliance (tap targets >= 44px) across all 5 admin views.
- **Tests:** Full Vitest suite passing (60/60 tests); multi-viewport Playwright visual audit verified across mobile (375px), tablet (768px), and desktop (1440px) with zero horizontal spill.
- **Revisor:** Standardized animation curves (`[0.22, 1, 0.36, 1]`), extracted `AdminGadwalView` keeping all page orchestrators <= 35 lines, and maintained 100% design token purity.

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
