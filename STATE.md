# PROJECT STATE: tutoring-platform

- **Active Project:** tutoring-platform (Next.js 14 App Router, Prisma ORM, Neon PostgreSQL, Tailwind CSS, Motion.dev)
- **Active Branch:** `feat/student-tutor-focused-portal`
- **Last Completed Work:** Redesigned the primary interface to center directly on what students and tutors need: prominent student wallet balance at the top of the card under the navbar, next session details with a real-time start countdown timer, and a dedicated tutor view for upcoming lectures with copyable check-in links. Simplified navbar to pure public links (`About Us`, `Contact Us`, `Sign In`) and removed all internal admin/gadwal/attendance labels from the footer.
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
- [ ] Deploy to Vercel with Neon connection pooling
