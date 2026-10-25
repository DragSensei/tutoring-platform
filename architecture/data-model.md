# Data Model

The Prisma schema owns users, wallets, sessions, attendance records, wallet transactions, and platform policies. Twelve-row table pagination introduces no schema, index, migration, or query changes; it is client-side view state over already-authorized route data.

Tutor notes, screenshot evidence metadata/files, and per-occurrence reschedule exceptions introduced in the UI are not Prisma entities and are not persisted. They remain integration seams for future backend/storage work.
