# Architecture Overview

The tutoring platform is a Next.js 14 App Router application with feature-oriented server actions, Prisma/Neon persistence, and Tailwind client components. Protected portal routes load and authorize their data server-side; presentation components render that supplied data without direct Prisma access.

Shared UI utilities live in `src/shared/`. Existing table surfaces use `useTablePagination` and `TablePagination` to render a fixed twelve-row local view without changing API or database behavior.

Tutor operational UI reuses the existing agenda, timer, and attendance drawer. Search/filtering is client-side over route-supplied rows. Attendance notes, selected compressed evidence, and one-off timetable exceptions are deliberately browser-only UI state until a future server integration supplies persistence.
