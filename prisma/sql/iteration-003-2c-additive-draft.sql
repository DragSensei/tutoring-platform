-- Iteration 003.2C additive draft. Review against the production baseline before deployment.
CREATE TYPE "AttendanceOutcome" AS ENUM ('PRESENT', 'ABSENT');

ALTER TABLE "PlatformPolicy"
  ADD COLUMN "late_attendance_recovery_window_hours" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Session"
  ADD COLUMN "attendance_submitted_at" TIMESTAMPTZ;

ALTER TABLE "SessionParticipant"
  ADD COLUMN "attendance_outcome" "AttendanceOutcome";

-- Only previously financially finalized attendance is an authoritative legacy submission.
UPDATE "Session"
SET "attendance_submitted_at" = "attendance_finalized_at"
WHERE "attendance_finalized_at" IS NOT NULL
  AND "attendance_submitted_at" IS NULL;

-- Preserve known legacy PRESENT rows. Old unfinished saves do not imply ABSENT.
UPDATE "SessionParticipant" participant
SET "attendance_outcome" = 'PRESENT'
WHERE EXISTS (
  SELECT 1 FROM "AttendanceRecord" attendance
  WHERE attendance."session_id" = participant."session_id"
    AND attendance."student_id" = participant."student_id"
);

UPDATE "SessionParticipant" participant
SET "attendance_outcome" = 'ABSENT'
WHERE participant."attendance_outcome" IS NULL
  AND EXISTS (
    SELECT 1 FROM "Session" session
    WHERE session."id" = participant."session_id"
      AND session."attendance_submitted_at" IS NOT NULL
  );

CREATE TABLE "AttendanceRecoveryGrant" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "granted_by_admin_id" TEXT NOT NULL,
  "admin_reason" TEXT NOT NULL,
  "policy_duration_hours" INTEGER NOT NULL,
  "opened_at" TIMESTAMPTZ NOT NULL,
  "closes_at" TIMESTAMPTZ NOT NULL,
  "tutor_explanation" TEXT,
  "tutor_attested_at" TIMESTAMPTZ,
  "screenshot_unavailable" BOOLEAN,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttendanceRecoveryGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AttendanceRecoveryGrant_duration_check" CHECK ("policy_duration_hours" BETWEEN 1 AND 168),
  CONSTRAINT "AttendanceRecoveryGrant_window_check" CHECK ("closes_at" > "opened_at")
);

CREATE INDEX "Session_attendance_submitted_at_attendance_finalized_at_idx"
  ON "Session"("attendance_submitted_at", "attendance_finalized_at");
CREATE INDEX "AttendanceRecoveryGrant_session_id_opened_at_idx"
  ON "AttendanceRecoveryGrant"("session_id", "opened_at");
CREATE INDEX "AttendanceRecoveryGrant_session_id_used_at_closes_at_idx"
  ON "AttendanceRecoveryGrant"("session_id", "used_at", "closes_at");

ALTER TABLE "AttendanceRecoveryGrant"
  ADD CONSTRAINT "AttendanceRecoveryGrant_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecoveryGrant"
  ADD CONSTRAINT "AttendanceRecoveryGrant_granted_by_admin_id_fkey"
  FOREIGN KEY ("granted_by_admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
