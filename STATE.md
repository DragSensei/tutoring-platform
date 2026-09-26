# PROJECT STATE: tutoring-platform

- **Active Project:** tutoring-platform (Next.js 14 App Router, Prisma ORM, Neon PostgreSQL, Tailwind CSS, Motion.dev)
- **Latest Completed Task:** Completed Iteration 003.2C Tutor lifecycle and recovery workflow, including guarded runtime acceptance and responsive visual QA; automated checkpoint evidence and manual results are tracked below.
- **Previous Feature Work:** Added bounded recurring-session materialization, secure Admin account setup, and Iteration 003 finance/account/import operations:
  1. `SessionSeries` owns weekly assignments; concrete `Session` rows remain authoritative for attendance, wallets, completion, cancellation, and audit history.
  2. Materialization is Cairo-aware, bounded to 12 weeks, idempotent, concurrency-tested, and stops for ended/cancelled series.
  3. Admin Gadwal supports Tutor filtering, clearing, and all edit/cancel scopes while preserving history-bearing occurrences.
  4. Admin provisioning is limited to Tutor and Student; partial Students complete a one-time hashed-token setup flow that atomically activates the account and establishes the normal session.
  5. Active Tutor/Student password reset is a separate purpose-scoped, hashed, short-lived, revocable, atomic one-time token flow; reset changes only the password and returns the user to normal login.
  6. Shared Combobox clipping is fixed; Cairo-safe date defaults and responsive overflow fixes were verified visually. Tutor countdown now shows DAYS / HOURS / MINUTES / SECONDS.
  7. Tutor attendance is manual, opens at the concrete Session start, remains editable through end plus policy grace, and finalizes wallet state only after the grace close.
  8. Concrete Session rows now own effective one-occurrence postpones; the weekly SessionSeries pattern remains unchanged.
  9. Public/student attendance-link behavior and new token issuance were removed while historical token storage remains intact.
- **Immediate Next Move:** Continue with linked-Student relationship/group pairing. Keep the monthly -100 EGP discount out of per-Session pricing until a canonical monthly billing owner exists. Production migration baseline and authenticated attendance-finalizer scheduler remain separate deployment blockers.
- **Blockers / Open Decisions:** Production Prisma migration history remains unresolved. Iteration 003.2C additive SQL is a non-deployable draft and was not applied. Linked-Student pairing and monthly discount remain out of scope for this checkpoint. Production deployment still needs a migration baseline strategy and an authenticated scheduler POST to `/api/internal/attendance/finalize` with `CRON_SECRET`. Commission basis is a settled internal wallet charge and does not prove external cash receipt.

## Iteration 003.2C — Tutor lifecycle checkpoint (complete)

- Concrete occurrence state is derived from effective Session times for Tutor agenda/timetable and Admin status summaries. Tutor timetable uses Active, Scheduled, and Completed views, defaults to a seven-day upcoming query, and offers Postpone only before the occurrence starts; the server rejects requests at or after start.
- Attendance now distinguishes draft save from final submission. Drafts do not create financial effects. Final submission requires explicit outcomes for the complete roster and required notes. Student settlement remains at the normal deadline; at least one PRESENT Student earns the Tutor the full Session duration at the canonical positive rate, while all-ABSENT, missing submission, historical, cancelled, and missing-rate cases create no Tutor payable.
- Missing attendance, recovery grants, Tutor-rate gaps, and finalization failures are surfaced in Admin Needs Attention. Recovery records preserve Admin reason, policy duration/deadline snapshot, Tutor explanation, attestation, screenshot availability, and use time. No automatic penalties are applied.
- Pricing review confirmed PlatformPolicy and named Pricing Profile amounts are charged per attended Session. Automatic application of the requested monthly linked-Student discount is therefore blocked; do not deduct 100 EGP from each Session. Linked-Student relationship, account UX, and Group pairing remain unimplemented in this checkpoint.
- Development DB inspection found the reported Python/Omar row and the old PictoBlox/Electronics occurrences as real persisted Sessions; no product-path static timetable rows were found. They were preserved. The old rows are classified by concrete times. Python's saved attendance is not treated as a final submission, so no Tutor payable is inferred from the draft.
- The old Electronics and PictoBlox rows also have three and four legacy AttendanceRecords respectively but no SessionParticipant roster. They remain visible as completed history and are surfaced as Needs review; attendance cannot be safely finalized or recovered without resolving that roster mismatch.
- **Runtime/manual acceptance:** Used only the guarded `tutoring_platform_test` target through the isolated `dev:verify` server (`.next-verify`); `tutoring_platform_db` and production were not used. Reused the existing uniquely named lifecycle fixtures, reset only the isolated QA Admin/Tutor login hashes for the real UI login, and added one missing Electronics legacy fixture because none existed in the test DB.
- **Financial outcomes:** Omar's 2-hour Python Session saved a draft with no attendance or payable, then finalized one PRESENT outcome for 120 minutes at the snapshotted 250 EGP/hour rate (500 EGP). Refresh showed the submitted state and one ledger entry. The all-ABSENT Session finalized with no AttendanceRecord and no Tutor payable. Missing attendance stayed unsubmitted, with no Student wallet charge or Tutor payable, and remained in Admin Needs Attention.
- **Recovery:** Admin saved a meaningful reason and granted the configured one-hour window. Tutor submitted notes, a late explanation, attestation, PRESENT attendance, and screenshot-unavailable status. The record retains Admin-authorized late provenance and the used grant; one 500 EGP payable was created. Screenshot waiver is stated explicitly in Tutor and Admin views.
- **Timetable and legacy review:** Active showed only a live occurrence, Scheduled showed only future occurrences, and Completed showed past rows newest-first, including stale persisted statuses and both rosterless legacy topics. Next 7/14/30 days and All upcoming worked. Future Postpone succeeded; the same authenticated server action against an already-started occurrence returned “A Session can only be postponed before it starts.” PictoBlox and Electronics remained history/Needs Review with no roster, wallet billing, compensation, or recovery grant.
- **Responsive visual QA:** Authenticated Tutor Timetable, normal and recovery Attendance, Admin Dashboard/Needs Attention, Tutor Payables, and Admin recovery detail passed Chrome-channel audits at 375px, 768px, and 1440px. No horizontal overflow; measured 375px touch targets and font scales passed. Screenshots were inspected, including the unavailable-screenshot explanation and final recovery provenance.
- **Automated verification:** The final guarded full Vitest suite passed (235/235). After moving the Postpone state check and update into a serializable transaction, the focused session-actions tests passed (7/7), `npx tsc --noEmit`, focused ESLint, and the production build passed. The staged Tier-2 collector and signoff verifier passed all four pillars on the lifecycle code; this final ledger update changes no source or tests.

## Admin Today and 22nd-to-22nd Finance cycles

- `/admin` shows sessions scheduled for the current Cairo day with chronological timing, attendance progress, and direct schedule links. Cancelled sessions do not count as pending attendance.
- Finance activity defaults to a full cycle from the 22nd at 00:00 Africa/Cairo through the next 22nd at 00:00, end exclusive. Tutor and Sales pages show cycle earnings and lifetime payables separately; existing month/custom report filters remain on the Finance overview.
- Payouts still use append-only lifetime earned and net paid balances. The custom recipient control and remaining Admin Accounts selectors use the shared Combobox, with a project lint gate preventing new native selects. The payout action is disabled when no eligible recipient has an outstanding balance.
- Read-only Session finance detail distinguishes settlement state, shows charge and compensation totals, and presents stored negative wallet deductions as positive charge magnitudes without changing the ledger. Cycle and Session financial-state coverage was added; no historical schema or backfill work was done.
- **Checkpoint:** Prisma validation, TypeScript, full frontend lint, guarded Vitest (219/219), production build, Tier-2 machine evidence, and authenticated mobile/tablet/desktop audits passed. Audited `/admin`, `/admin/finances`, Tutor/Sales Finance, Session finance detail, Accounts, and Student account edit with zero horizontal overflow and compliant mobile touch targets. Manual Admin acceptance and production migration/scheduler decisions remain open.

## Iteration 003.1 — Admin acceptance implementation

- **Scheduling:** Active and ended/cancelled series are separated. Archived rows open read-only history with occurrence, roster, attendance, and financial provenance. Edit/cancel scope copy states its future-only effect. Direct archived-series edits/cancellation are rejected, and cancellation preserves saved all-absent attendance as well as finalized/financial history. Admin Overview now labels scheduled start and PRESENT attendance records; past unfinalized rows retain their stored status with explanatory copy.
- **Accounts:** `User.account_status` adds `DEACTIVATED`; signed sessions recheck current database status and role. Student deactivation removes safe future participation and fails closed for active/history-bearing sessions or invalid remaining rosters. Tutor deactivation fails closed while future assignments exist because the required Tutor relation has no safe unassigned state. Permanent deletion requires a deactivated, dependency-free account, transactional impact recheck, a four-second pointer/keyboard hold, and the exact phrase. Direct stays protected; editable/deactivatable sources retain historical attribution. Account saves return to Accounts with feedback.
- **Finance:** Existing `ReferralSource` is the stable no-login sales/referral payee. `PayoutSettlement` records actual append-only Tutor/source payments with one recipient, positive amount, Admin provenance, idempotency, and optional reversal link. Lifetime earned, paid, and outstanding use immutable earning snapshots and net settlements, independent of the activity date filter. Payee detail shows session/student/wallet-event provenance. Student wallet deductions no longer imply external cash collection; legacy rows with missing snapshots are labeled honestly. Needs Review remains visible.
- **Runtime bug triage:** During development the Finance route first used a stale running Prisma client (`payoutSettlement` undefined), then revealed that the local development database lacked the new table. Canonical fix was to verify the generated Prisma runtime delegate, restart using isolated `dev:verify`, and sync only the identified localhost development schema with `prisma db push --skip-generate`. The isolated test schema was synced through the test database guard. The production draft SQL was not applied.
- **Acceptance/release:** Automated checks and authenticated responsive route audits are the checkpoint gate. Manual Admin acceptance remains required. Production migration baseline and scheduler remain open; this is not production migration sign-off.

## Next.js artifact isolation — release blocker

- **Root cause:** The unconfigured Next.js 14 `distDir` made `next dev` and `next build` write to the same `.next` tree. Production builds could replace files behind a live dev server, explaining 200 HTML with 404 JavaScript/CSS chunks across Admin routes.
- **Canonical fix:** Tutor's `next.config.mjs` sends development to `.next` and production build/start to `.next-build`. `npm run dev:verify` starts a temporary server on port 3001 with `.next-verify`; TypeScript includes generated types from all three directories. No workspace OS change was needed because Tier-2 and visual-audit tools do not themselves run Next builds or mutate `.next`.
- **Runtime verification:** A controlled dev server on port 3000 continued serving `/login`, `main-app.js`, and `layout.css` with HTTP 200 during and after a production build, TypeScript check, and Tier-2 run. The previously missing Admin layout and Gadwal chunks also returned HTTP 200. A simultaneous temporary server on port 3001 served its own chunks. Authenticated `/admin/gadwal` audits passed on both servers, and `/admin/accounts` passed on port 3000, at 375px, 768px, and 1440px with zero horizontal overflow and compliant measured mobile touch targets; screenshots were inspected.
- **Checkpoint:** Prisma validation, TypeScript, lint, production build, and the guarded full Vitest suite passed (178/178). Working-tree Tier-2 evidence passed all four pillars; staged-commit evidence is collected by the release hook.
- **Operational limit:** A dev server already running before this config change must restart once to load it. Two plain `next dev` processes still share `.next`; temporary audit servers must use `npm run dev:verify`.

## Iteration 003 — Finance, Student Attribution, and Import
- Student accounts can carry an optional `ReferralSource` attribution, with canonical `Direct` and explicit `None`; auth roles do not encode referral identity. Admin create/detail/edit and the canonical update transaction own source and Tutor-rate changes.
- `PlatformPolicy.default_tutor_hourly_rate` defaults to zero; zero/unset does not create fake Tutor pay. Delivered sessions without a configured positive rate remain visible in the Finance rate-review queue and accrue no compensation ledger row.
- Commission is disabled by default, uses the fixed `FINALIZED_SESSION_WALLET_CHARGE` basis, and pays only the eligible referral/sales source assigned to each Student. Rule updater/time/version and per-entry source, rate, basis, and amount are snapshotted. Existing ledgers do not change after policy edits.
- Named Pricing Profiles are selected by nullable `SessionSeries.pricing_profile_id`; null selects PlatformPolicy. Occurrences do not snapshot prices. Session profile name and student price are snapshotted at durable financial settlement.
- `Session.historical_only` defaults false on all existing rows. Only explicit pre-system backfills set it true; those rows do not create wallet, Tutor-pay, or commission finance. No historical finance backfill was run.
- CSV parsing is bounded and in-memory. Admin previews manual mapping of canonical Student fields plus an optional active source, fail-closed email/phone matching, row conflicts, and exact existing-account changes. Dry-run persists nothing. Confirm is idempotent, revalidates identity in a serializable transaction, stores only actor/batch/row outcome provenance, and creates partial Students without passwords or raw setup secrets.
- Finance Session links use read-only `/admin/finances/sessions/[sessionId]` with Admin authorization and immutable charge/compensation/commission/source snapshots; finalized rows no longer lead to the schedule editor.
- **Current verification:** Fresh guarded verification and authenticated UI review passed for the working checkpoint. `.git/tier2-evidence.json` stores machine-derived test counts and Git identity; release status is derived from Git.
- **Test isolation:** The due-attendance finalizer scans all due Sessions, so concurrent test files with past-dated fixtures can finalize one another's rows. Vitest file serialization isolates these DB fixtures; the full guarded suite passed with this setting.
- **Database provenance:** `DATABASE_URL` was verified as `tutoring_platform_db`; `TEST_DATABASE_URL` was verified as distinct `tutoring_platform_test`. DB integration and test-schema synchronization use the canonical guard. No URLs or credentials were printed.

## Tier 2 Verification
- **Security:** Repository secret/env sentinel passed. Authorization boundaries, import input validation, and finance provenance were agent-reviewed; dynamic penetration testing is not verified.
- **Performance:** Frontend static architecture checks passed. Recurrence materialization remains bounded to 12 weeks; runtime latency is not verified.
- **Tests:** The final guarded full Vitest suite passed against the isolated test database (235/235), including the Postpone transaction regression; focused session-actions tests passed (7/7) and TypeScript passed after the change.
- **Visual:** Iteration 003.2C authenticated routes passed Chrome-channel audits at 375px, 768px, and 1440px with zero horizontal overflow and compliant measured mobile touch targets. Screenshots were inspected. Earlier Admin, Finance, Accounts, Gadwal, and date-picker checks remain recorded in prior checkpoint evidence.
- **Revisor:** Frontend route isolation, page size, and token-purity checks passed; no native browser alert/confirm/prompt calls remain.
- **Database:** Credential-free identities are `tutoring_platform_db` (development) and `tutoring_platform_test` (test); they are distinct. Tests ran through the canonical database guard.
- **Checkpoint:** Prisma generation, full lint, production build, 234/234 tests, working-tree Tier-2, and authenticated runtime/visual acceptance passed before the final Postpone race fix. After the fix, the 235/235 guarded suite, focused session-actions tests, TypeScript, focused ESLint, production build, `git diff --check`, and all four staged Tier-2 pillars passed. Production migration baseline and scheduler requirements remain open; production readiness is not claimed.

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
