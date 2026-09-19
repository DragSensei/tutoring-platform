# PROJECT STATE: tutoring-platform

- **Active Project:** tutoring-platform (Next.js 14 App Router, Prisma ORM, Neon PostgreSQL, Tailwind CSS, Motion.dev)
- **Active Branch:** `main`
- **Last Completed Work:** Standardized Admin Portal layout alignment, header baseline consistency, and active nav tab styling:
  1. Card Width Alignment: standardized main content canvas and card bounds (`w-full min-w-0 max-w-full rounded-2xl`) across `/admin/gadwal` and `/admin/wallets`—0px width difference, 0px right edge difference on both 1440px and 1920px viewports.
  2. Header Baseline Consistency: standardized header block dimensions (`min-h-[92px] pb-5`, `line-clamp-1` subtitles)—0px first card Y-offset difference (exact 179px) between `/admin/gadwal` and `/admin/wallets`.
  3. Active Nav Tab Styling: refined active red sidebar tab to a clean, inset rounded rectangle (`rounded-lg mx-2 px-3 py-2.5`) across expanded, collapsed, and mobile sidebar navigation.
  4. Canvas Contrast: ensured right-hand continuous canvas uses warm neutral `#FBFBF9` (`bg-canvas`) against white dashboard cards.
  5. Governance Invariants Locked: codified Root Viewport Shell Sovereignty (Law i), Sibling Route Header Baseline (Law j), Unified Canvas Boundary (Law k), and Navigation Item Geometry Standard (Law l) in `_roles/ui-architect.md` and added Sibling Route Consistency checklist in `01-web-development/AGENTS.md`. Pre-commit meta-audit passed and committed to root repo (`204edb7`).
- **Immediate Next Move:** Final deployment verification or staging preview to Vercel with Neon connection pooling.
- **Blockers / Open Decisions:** None.

## Tier 2 Verification
- **Security:** Audited checkin-action.ts and policy resolution; verified parameterized queries, role validation, and loud HTTP 500 rejection on database connectivity errors preventing unauthorized overdraft or pricing bypass.
- **Performance:** Verified indexed lookup on session token and PlatformPolicy singleton (`id: 'default'`); confirmed no blocking event loop operations or memory leaks.
- **Tests:** Ran full Vitest suite (60/60 tests passing across 13 test files), including explicit tests for missing policy table fallback (P2021) and generic database failure 500 error result.
- **Revisor:** Surgical diff in checkin-action.ts; extracted isTableNotExistError helper, cyclomatic complexity <= 6, zero dead code or arbitrary type assertions.

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
