# Architecture Decisions

## 2026-09-20 — Twelve-row table pagination: shared client-side view state
Chose: A shared pagination utility, hook, and accessible control for every existing HTML table.
Because: The routes already load authorized table datasets and the same behavior is needed in four surfaces.
Alternatives considered: Per-table pagination copies and new server/API pagination.
Rejected because: Copies would drift; server pagination would expand the request beyond a display-only change.
Consequences: At most 12 table rows render per page, while the authorized source data remains unchanged.

## 2026-09-20 — Tutor timing and documentation workflow: preserve live components
Chose: Extend `ClosestSessionTimer`, `timer-utils.ts`, and the existing `AttendanceRecordingDrawer`.
Because: Those are the production timer and attendance flow consumed by `/tutor/agenda` and tutor history.
Alternatives considered: A second timer, a new attendance drawer, and server-backed evidence/rescheduling.
Rejected because: Parallel UI would drift, while persistence/API work is explicitly out of scope.
Consequences: Session timing uses start/end time independently from attendance eligibility; notes, compressed evidence, and exceptions remain visibly local-only.
