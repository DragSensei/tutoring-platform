-- Additive draft for the one-time Admin attendance intervention state.
-- Production migration baseline is unresolved; this file is not applied by this task.

ALTER TABLE "Session"
  ADD COLUMN "admin_attendance_handled_at" TIMESTAMP(3),
  ADD COLUMN "admin_attendance_handled_by_id" TEXT,
  ADD COLUMN "admin_attendance_handling_note" TEXT;

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_admin_attendance_handled_by_id_fkey"
  FOREIGN KEY ("admin_attendance_handled_by_id") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Session_admin_attendance_handled_at_idx"
  ON "Session"("admin_attendance_handled_at");
