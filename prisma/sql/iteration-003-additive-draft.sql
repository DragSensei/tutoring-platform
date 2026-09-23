-- Additive Iteration 003 finance, pricing, referral source, and import provenance.
-- This project has no prior Prisma migration baseline. Establish the production
-- baseline before applying this migration; this file is not applied by this task.

CREATE TYPE "CommissionBasis" AS ENUM ('FINALIZED_SESSION_WALLET_CHARGE');
CREATE TYPE "ReferralSourceKind" AS ENUM ('DIRECT', 'REFERRAL', 'SALES');
CREATE TYPE "StudentImportRowOutcome" AS ENUM ('CREATED', 'UPDATED', 'MATCHED', 'SKIPPED', 'CONFLICT', 'INVALID');

CREATE TABLE "ReferralSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "kind" "ReferralSourceKind" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReferralSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralSource_name_key" ON "ReferralSource"("name");
CREATE UNIQUE INDEX "ReferralSource_normalized_name_key" ON "ReferralSource"("normalized_name");
CREATE INDEX "ReferralSource_is_active_name_idx" ON "ReferralSource"("is_active", "name");

INSERT INTO "ReferralSource" ("id", "name", "normalized_name", "kind", "is_active", "created_at", "updated_at")
VALUES ('direct', 'Direct', 'direct', 'DIRECT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE TABLE "PricingProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "private_session_price" DECIMAL(10,2) NOT NULL,
    "group_session_price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PricingProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PricingProfile_name_key" ON "PricingProfile"("name");
CREATE INDEX "PricingProfile_is_active_name_idx" ON "PricingProfile"("is_active", "name");

ALTER TABLE "User"
    ADD COLUMN "referral_source_id" TEXT,
    ADD COLUMN "tutor_hourly_rate_override" DECIMAL(10,2);

ALTER TABLE "Session"
    ADD COLUMN "historical_only" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "pricing_profile_id" TEXT,
    ADD COLUMN "pricing_profile_name_snapshot" TEXT,
    ADD COLUMN "student_price_snapshot" DECIMAL(10,2);

ALTER TABLE "SessionSeries"
    ADD COLUMN "pricing_profile_id" TEXT;

ALTER TABLE "PlatformPolicy"
    ADD COLUMN "default_tutor_hourly_rate" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN "commission_enabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "commission_basis" "CommissionBasis" NOT NULL DEFAULT 'FINALIZED_SESSION_WALLET_CHARGE',
    ADD COLUMN "commission_rate_bps" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "commission_rule_version" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "commission_updated_by_user_id" TEXT,
    ADD COLUMN "commission_updated_at" TIMESTAMP(3);

CREATE TABLE "TutorCompensationLedgerEntry" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "delivered_minutes" INTEGER NOT NULL,
    "hourly_rate" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TutorCompensationLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TutorCompensationLedgerEntry_session_id_key" ON "TutorCompensationLedgerEntry"("session_id");
CREATE INDEX "TutorCompensationLedgerEntry_tutor_id_created_at_idx" ON "TutorCompensationLedgerEntry"("tutor_id", "created_at");

CREATE TABLE "CommissionLedgerEntry" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "source_wallet_transaction_id" TEXT NOT NULL,
    "recipient_source_id" TEXT NOT NULL,
    "recipient_source_name_snapshot" TEXT NOT NULL,
    "basis" "CommissionBasis" NOT NULL DEFAULT 'FINALIZED_SESSION_WALLET_CHARGE',
    "basis_amount" DECIMAL(10,2) NOT NULL,
    "rate_bps" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "rule_version" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommissionLedgerEntry_source_wallet_transaction_id_key" ON "CommissionLedgerEntry"("source_wallet_transaction_id");
CREATE UNIQUE INDEX "CommissionLedgerEntry_session_id_student_id_key" ON "CommissionLedgerEntry"("session_id", "student_id");
CREATE INDEX "CommissionLedgerEntry_student_id_created_at_idx" ON "CommissionLedgerEntry"("student_id", "created_at");
CREATE INDEX "CommissionLedgerEntry_recipient_source_id_created_at_idx" ON "CommissionLedgerEntry"("recipient_source_id", "created_at");
CREATE INDEX "CommissionLedgerEntry_session_id_idx" ON "CommissionLedgerEntry"("session_id");

CREATE TABLE "StudentImportBatch" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentImportBatch_idempotency_key_key" ON "StudentImportBatch"("idempotency_key");
CREATE INDEX "StudentImportBatch_created_by_user_id_created_at_idx" ON "StudentImportBatch"("created_by_user_id", "created_at");

CREATE TABLE "StudentImportRow" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "outcome" "StudentImportRowOutcome" NOT NULL,
    "reason_code" TEXT,
    "matched_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentImportRow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentImportRow_batch_id_row_number_key" ON "StudentImportRow"("batch_id", "row_number");
CREATE INDEX "StudentImportRow_batch_id_outcome_idx" ON "StudentImportRow"("batch_id", "outcome");
CREATE INDEX "StudentImportRow_matched_user_id_idx" ON "StudentImportRow"("matched_user_id");

CREATE INDEX "User_referral_source_id_idx" ON "User"("referral_source_id");
CREATE INDEX "PlatformPolicy_commission_updated_by_user_id_idx" ON "PlatformPolicy"("commission_updated_by_user_id");

ALTER TABLE "User" ADD CONSTRAINT "User_referral_source_id_fkey"
    FOREIGN KEY ("referral_source_id") REFERENCES "ReferralSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_pricing_profile_id_fkey"
    FOREIGN KEY ("pricing_profile_id") REFERENCES "PricingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SessionSeries" ADD CONSTRAINT "SessionSeries_pricing_profile_id_fkey"
    FOREIGN KEY ("pricing_profile_id") REFERENCES "PricingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformPolicy" ADD CONSTRAINT "PlatformPolicy_commission_updated_by_user_id_fkey"
    FOREIGN KEY ("commission_updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TutorCompensationLedgerEntry" ADD CONSTRAINT "TutorCompensationLedgerEntry_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TutorCompensationLedgerEntry" ADD CONSTRAINT "TutorCompensationLedgerEntry_tutor_id_fkey"
    FOREIGN KEY ("tutor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_source_wallet_transaction_id_fkey"
    FOREIGN KEY ("source_wallet_transaction_id") REFERENCES "WalletTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_recipient_source_id_fkey"
    FOREIGN KEY ("recipient_source_id") REFERENCES "ReferralSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentImportBatch" ADD CONSTRAINT "StudentImportBatch_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentImportRow" ADD CONSTRAINT "StudentImportRow_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "StudentImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentImportRow" ADD CONSTRAINT "StudentImportRow_matched_user_id_fkey"
    FOREIGN KEY ("matched_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep money non-negative in profile and accrual tables; monetary computation
-- remains Decimal-based in the application.
ALTER TABLE "User" ADD CONSTRAINT "User_tutor_hourly_rate_override_nonnegative_check"
    CHECK ("tutor_hourly_rate_override" IS NULL OR "tutor_hourly_rate_override" >= 0);
ALTER TABLE "PricingProfile" ADD CONSTRAINT "PricingProfile_prices_nonnegative_check"
    CHECK ("private_session_price" >= 0 AND "group_session_price" >= 0);
ALTER TABLE "PlatformPolicy" ADD CONSTRAINT "PlatformPolicy_finance_values_check"
    CHECK ("default_tutor_hourly_rate" >= 0 AND "commission_rate_bps" BETWEEN 0 AND 10000 AND "commission_rule_version" >= 1);
ALTER TABLE "TutorCompensationLedgerEntry" ADD CONSTRAINT "TutorCompensationLedgerEntry_values_check"
    CHECK ("delivered_minutes" > 0 AND "hourly_rate" >= 0 AND "amount" >= 0);
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_values_check"
    CHECK ("basis_amount" > 0 AND "rate_bps" BETWEEN 1 AND 10000 AND "amount" >= 0 AND "rule_version" >= 1);
