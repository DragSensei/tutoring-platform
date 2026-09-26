-- Additive draft for Iteration 003.2D. Production migration baseline is unresolved.
CREATE TABLE "LinkedStudentRelationship" (
  "id" TEXT NOT NULL,
  "student_a_id" TEXT NOT NULL,
  "student_b_id" TEXT NOT NULL,
  "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_admin_id" TEXT NOT NULL,
  "ended_at" TIMESTAMP(3),
  "ended_by_admin_id" TEXT,
  CONSTRAINT "LinkedStudentRelationship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LinkedStudentRelationship_canonical_pair_check" CHECK ("student_a_id" < "student_b_id"),
  CONSTRAINT "LinkedStudentRelationship_end_provenance_check" CHECK (
    ("active" = true AND "ended_at" IS NULL AND "ended_by_admin_id" IS NULL)
    OR ("active" = false AND "ended_at" IS NOT NULL AND "ended_by_admin_id" IS NOT NULL)
  ),
  CONSTRAINT "LinkedStudentRelationship_student_a_id_fkey" FOREIGN KEY ("student_a_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LinkedStudentRelationship_student_b_id_fkey" FOREIGN KEY ("student_b_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LinkedStudentRelationship_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LinkedStudentRelationship_ended_by_admin_id_fkey" FOREIGN KEY ("ended_by_admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LinkedStudentRelationship_student_a_id_student_b_id_key"
  ON "LinkedStudentRelationship"("student_a_id", "student_b_id");
CREATE UNIQUE INDEX "LinkedStudentRelationship_active_student_a_key"
  ON "LinkedStudentRelationship"("student_a_id") WHERE "active" = true;
CREATE UNIQUE INDEX "LinkedStudentRelationship_active_student_b_key"
  ON "LinkedStudentRelationship"("student_b_id") WHERE "active" = true;
CREATE INDEX "LinkedStudentRelationship_student_a_id_active_idx"
  ON "LinkedStudentRelationship"("student_a_id", "active");
CREATE INDEX "LinkedStudentRelationship_student_b_id_active_idx"
  ON "LinkedStudentRelationship"("student_b_id", "active");

CREATE FUNCTION "enforce_one_active_linked_pair"() RETURNS trigger AS $$
BEGIN
  IF NEW."active" THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('linked-student:' || member_id, 0))
    FROM unnest(ARRAY[NEW."student_a_id", NEW."student_b_id"]) AS members(member_id)
    ORDER BY members.member_id;

    IF EXISTS (
      SELECT 1 FROM "LinkedStudentRelationship" existing
      WHERE existing."active" = true
        AND existing."id" <> NEW."id"
        AND (
          existing."student_a_id" IN (NEW."student_a_id", NEW."student_b_id")
          OR existing."student_b_id" IN (NEW."student_a_id", NEW."student_b_id")
        )
    ) THEN
      RAISE EXCEPTION 'Student already belongs to an active linked pair'
        USING ERRCODE = '23505', CONSTRAINT = 'LinkedStudentRelationship_one_active_pair_per_student';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "LinkedStudentRelationship_one_active_pair_per_student_trigger"
  BEFORE INSERT OR UPDATE OF "student_a_id", "student_b_id", "active"
  ON "LinkedStudentRelationship"
  FOR EACH ROW EXECUTE FUNCTION "enforce_one_active_linked_pair"();
