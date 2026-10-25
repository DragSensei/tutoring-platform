# Tutoring Platform

## What this is

A Next.js tutoring-platform portal for administrators, tutors, and students, covering session scheduling, attendance, wallets, and account management.

## Stack

Next.js 14, TypeScript, Prisma, Neon PostgreSQL, Tailwind CSS, and Motion.

## Conventions

See `/architecture/overview.md` for structure and `/architecture/decisions.md` for technical decisions.

## Features

- Twelve-row table pagination — added 2026-09-20; shared local controls across timetable, wallet, ledger, and account tables.
- Tutor workspace UI — added 2026-09-20; restored schedule-based timer selection, shared table filtering, local attendance documentation, and recurring-schedule exception previews.

## Known gotchas

See `/architecture/gotchas.md`.
