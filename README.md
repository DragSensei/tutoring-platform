# Tutoring Platform (منصة إدارة الحصص والجدول)

Full-stack Next.js educational tutoring management platform architected using the Feature-Driven Unidirectional Architecture (WDS boundaries pattern).

## Features
- **Gadwal Timetable:** Schedule Private (@ 500.00 EGP) and Group (@ 375.00 EGP) sessions with computed 4-hour check-in deadlines and UUID token generation.
- **Tutor Abstraction:** Zero manual roster check-in duties. Tutors have copyable token share links and monthly/lifetime volume KPIs.
- **Atomic Attendance & Wallet Deductions:** Strict 4-hour deadline enforcement with HTTP 403 on expiration. Deductions, attendance recording, and ledger logging run in an isolated `prisma.$transaction()`.
- **Student Wallet & Overdrafts:** Animated balance counter (`motion.dev`), credit/post-paid negative balance allowances flagged for administrative review, and an immutable transaction ledger.
- **Architectural Boundary Enforcement:** Enforced by `eslint-plugin-boundaries` preventing cross-feature contamination.

## Tech Stack
- **Framework:** Next.js 14 (App Router, Server Actions, Route Handlers)
- **Database & ORM:** Neon Serverless PostgreSQL + Prisma ORM
- **Styling & UI:** Tailwind CSS, motion.dev (spring physics)
- **Validation:** Zod schemas
- **Testing:** Vitest

## Getting Started

1. Copy `.env.example` to `.env` and fill in your Neon database credentials.
```bash
cp .env.example .env
```

2. Generate Prisma Client:
```bash
npm run prisma:generate
```

3. Run the development server:
```bash
npm run dev
```

4. Run lint and tests:
```bash
npm run lint
npm run test
```
