# PROJECT STATE: tutoring-platform

- **Active Project:** tutoring-platform (Next.js 14 App Router, Prisma ORM, Neon PostgreSQL, Tailwind CSS, Motion.dev)
- **Active Branch:** `main`
- **Last Completed Work:** Eliminated Admin Sidebar vertical layout shift across all admin routes:
  1. Enforced single shared component architecture: `<AdminSidebar />` rendered strictly in `src/app/(portal)/admin/layout.tsx`.
  2. Stripped outer `aside` and `sticky` classes from `admin-sidebar.tsx`; positioning encapsulated in `layout.tsx` (`aside` with `w-64 shrink-0 md:sticky md:top-20`).
  3. Removed `justify-center` from root layout `<main>` in `src/app/layout.tsx` (the root cause of shorter pages shifting down).
  4. Verified exact bounding box measurement via Playwright across all 5 admin routes (`/admin`, `/admin/wallets`, `/admin/gadwal`, `/admin/mentors`, `/admin/policies`): exact match at x=136, y=88, width=256, height=429 (0px vertical shift).
  5. Multi-viewport visual audit passing 100% (touch targets >= 44px, font scale >= 14px, zero horizontal spill), Vitest 50/50 passing, ESLint and token purity lints green.
- **Immediate Next Move:** Execute next milestone from `## FUTURE ROADMAP & UPCOMING BACKLOG` (Admin Dashboard Design Alignment for `/admin/gadwal` & `/admin/wallets` to warm neutral `#FBFBF9`).
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
- [x] Autonomous Bug Triage: Resolve Student Dashboard HTTP 500 (`Wallet_user_id_fkey`) and harden student identity resolution
- [x] Implement Admin Landing Overview (`/admin`) and persistent responsive Admin Sidebar
- [ ] Deploy to Vercel with Neon connection pooling

## FUTURE ROADMAP & UPCOMING BACKLOG
- [ ] **Admin Dashboard Design Alignment:** Refactor Admin portal (`/admin/gadwal`, `/admin/wallets`) to follow our Claude-style design pattern (warm neutral `#FBFBF9` palette, crisp typography, strict token purity).
- [x] **Admin Landing "Overview" Page:** Created central landing overview page (`/admin`) displaying active cohort KPIs, daily check-in volume, pending overdrafts, and quick action shortcuts.
- [x] **Admin Dashboard Sidebar:** Implemented persistent, responsive navigation sidebar organizing core administrative functions (Overview, Timetable / Gadwal, Wallets & Financials, Faculty Mentors, Platform Settings).
- [ ] **Custom Modern Combobox Primitive:** Build a custom searchable Combobox component from scratch using native HTML/Tailwind tokens without bloated third-party dependencies, adhering to our design system.
- [x] **Tutor Agenda Mobile Ergonomics & Accessibility:** Resolved 11 touch-target (<44px) and 9 font-scale (<14px) defects across header navigation tabs, timer copy triggers, and course session action buttons on `/tutor/agenda` (44/44 unit tests passing, 100% token and architecture lints green).
- [ ] **Tutor & Student Red Brand Depth:** Further enrich both Tutor and Student dashboards with additional crimson brand red (`brand.primary: #DC2626`, `brand.subtle: #FEF2F2`, `brand.border: #FECACA`) across interactive states, card rims, and focal indicators.

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
