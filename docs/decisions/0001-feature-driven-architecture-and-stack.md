# 1. Feature-Driven Unidirectional Architecture & Tech Stack

## Context & Problem
The tutoring platform requires managing educational schedules (Gadwal), atomic check-ins with a strict 4-hour deadline, student wallets supporting credit overdrafts, and tutor abstractions without administrative roster burdens. To ensure high maintainability and prevent circular dependencies across domain slices, a modular architecture is required.

## Decision Made
We adopted the Feature-Driven Unidirectional Architecture (WDS boundaries pattern) on Next.js 14 App Router, Prisma ORM with Neon PostgreSQL pooled connections, Tailwind CSS, and `motion.dev` for spring micro-interactions. Domain logic is compartmentalized into isolated feature slices (`auth`, `attendance`, `sessions`, `wallets`) enforced by `eslint-plugin-boundaries`.

## Alternatives Rejected & Reason
1. **Unbounded Flat MVC Layout:** Rejected due to high risk of cross-import leakage between wallets and session timetable logic.
2. **External Background Worker for 4-Hour Expiration:** Rejected to follow Ponytail minimalism; deterministic server-side mathematical verification (`NOW() > session.deadline`) executed directly in the atomic check-in transaction provides zero-dependency instant HTTP 403 responses.
3. **Manual Roster Management for Tutors:** Rejected in favor of tokenized self-service check-in links, abstracting tutors to focus strictly on pedagogical delivery and high-level KPIs.

## Consequences & Trade-offs
- **Positive:** Feature slices cannot cross-import each other, ensuring independent testability and refactoring safety.
- **Positive:** Atomic database transactions ensure student attendance and wallet deductions are never desynchronized.
- **Negative:** Feature isolation requires shared primitives to reside strictly in `src/shared/`.
