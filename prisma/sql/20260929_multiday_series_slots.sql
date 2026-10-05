-- Additive local development artifact. Production migration history has no reviewed baseline;
-- do not run this through migrate deploy until that separate baseline is established.
BEGIN;

CREATE TYPE "ProgramCode" AS ENUM ('P1', 'P3', 'P4', 'P5');

ALTER TABLE "SessionSeries"
  ADD COLUMN "program_code" "ProgramCode",
  ADD COLUMN "course_name" TEXT,
  ADD COLUMN "level" INTEGER;

CREATE TABLE "SessionSeriesSlot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "series_id" TEXT NOT NULL REFERENCES "SessionSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "weekday" INTEGER NOT NULL,
  "start_minute" INTEGER NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "SessionSeriesSlot_series_id_active_idx" ON "SessionSeriesSlot"("series_id", "active");
CREATE UNIQUE INDEX "SessionSeriesSlot_series_id_weekday_start_minute_duration_m_key"
  ON "SessionSeriesSlot"("series_id", "weekday", "start_minute", "duration_minutes");

-- Every existing ordinary series keeps one durable slot and its existing occurrences.
INSERT INTO "SessionSeriesSlot" ("id", "series_id", "weekday", "start_minute", "duration_minutes")
SELECT 'legacy-' || "id", "id", "weekday", "start_minute", "duration_minutes"
FROM "SessionSeries";

ALTER TABLE "Session" ADD COLUMN "series_slot_id" TEXT;
UPDATE "Session" SET "series_slot_id" = 'legacy-' || "series_id"
WHERE "series_id" IS NOT NULL;

ALTER TABLE "Session" ADD CONSTRAINT "Session_series_slot_id_fkey"
  FOREIGN KEY ("series_slot_id") REFERENCES "SessionSeriesSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Session_series_slot_id_occurrence_date_key"
  ON "Session"("series_slot_id", "occurrence_date");
DROP INDEX "Session_series_id_occurrence_date_key";

COMMIT;
