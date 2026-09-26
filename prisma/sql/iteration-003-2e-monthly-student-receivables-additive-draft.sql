-- Additive draft for Iteration 003.2E. Production migration baseline is unresolved.
-- This file is not applied by this task.

CREATE TABLE "StudentMonthlyPricingPolicy" (
  "id" TEXT NOT NULL,
  "effective_from" TIMESTAMP(3) NOT NULL,
  "group_monthly_price" DECIMAL(10,2) NOT NULL,
  "private_monthly_price" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_admin_id" TEXT NOT NULL,
  CONSTRAINT "StudentMonthlyPricingPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentMonthlyPricingPolicy_group_price_check" CHECK ("group_monthly_price" >= 0),
  CONSTRAINT "StudentMonthlyPricingPolicy_private_price_check" CHECK ("private_monthly_price" >= 0),
  CONSTRAINT "StudentMonthlyPricingPolicy_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StudentMonthlyPricingPolicy_effective_from_key" ON "StudentMonthlyPricingPolicy"("effective_from");

CREATE TABLE "StudentMonthlyReceivable" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "enrollment_type_snapshot" "SessionType" NOT NULL,
  "base_amount_snapshot" DECIMAL(10,2) NOT NULL,
  "linked_student_discount_snapshot" DECIMAL(10,2) NOT NULL,
  "final_amount" DECIMAL(10,2) NOT NULL,
  "linked_relationship_id" TEXT,
  "pricing_policy_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_admin_id" TEXT NOT NULL,
  CONSTRAINT "StudentMonthlyReceivable_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentMonthlyReceivable_period_check" CHECK ("period_start" < "period_end"),
  CONSTRAINT "StudentMonthlyReceivable_amount_check" CHECK (
    "base_amount_snapshot" >= 0 AND "linked_student_discount_snapshot" >= 0
    AND "linked_student_discount_snapshot" <= "base_amount_snapshot"
    AND "final_amount" = "base_amount_snapshot" - "linked_student_discount_snapshot"
  ),
  CONSTRAINT "StudentMonthlyReceivable_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentMonthlyReceivable_linked_relationship_id_fkey" FOREIGN KEY ("linked_relationship_id") REFERENCES "LinkedStudentRelationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentMonthlyReceivable_pricing_policy_id_fkey" FOREIGN KEY ("pricing_policy_id") REFERENCES "StudentMonthlyPricingPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentMonthlyReceivable_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StudentMonthlyReceivable_student_period_key" ON "StudentMonthlyReceivable"("student_id", "period_start", "period_end");
CREATE INDEX "StudentMonthlyReceivable_student_id_period_start_idx" ON "StudentMonthlyReceivable"("student_id", "period_start");
