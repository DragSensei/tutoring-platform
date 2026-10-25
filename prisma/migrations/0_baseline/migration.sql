-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TUTOR', 'STUDENT');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_CREDENTIALS', 'PENDING_PROFILE', 'ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "AccountTokenPurpose" AS ENUM ('SETUP', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('PRIVATE', 'GROUP');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceOutcome" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "SessionSeriesStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProgramCode" AS ENUM ('P1', 'P3', 'P4', 'P5');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('ADMIN_DEPOSIT', 'SESSION_DEDUCTION', 'REFUND');

-- CreateEnum
CREATE TYPE "CommissionBasis" AS ENUM ('FINALIZED_SESSION_WALLET_CHARGE');

-- CreateEnum
CREATE TYPE "ReferralSourceKind" AS ENUM ('DIRECT', 'REFERRAL', 'SALES');

-- CreateEnum
CREATE TYPE "StudentImportRowOutcome" AS ENUM ('CREATED', 'UPDATED', 'MATCHED', 'SKIPPED', 'CONFLICT', 'INVALID');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "referral_source_id" TEXT,
    "tutor_hourly_rate_override" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

    CONSTRAINT "LinkedStudentRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMonthlyPricingPolicy" (
    "id" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "group_monthly_price" DECIMAL(10,2) NOT NULL,
    "private_monthly_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_admin_id" TEXT NOT NULL,

    CONSTRAINT "StudentMonthlyPricingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "StudentMonthlyReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "is_flagged_overdraft" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "series_id" TEXT,
    "series_slot_id" TEXT,
    "occurrence_date" TIMESTAMP(3),
    "series_exception" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "token" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "historical_only" BOOLEAN NOT NULL DEFAULT false,
    "pricing_profile_id" TEXT,
    "pricing_profile_name_snapshot" TEXT,
    "student_price_snapshot" DECIMAL(10,2),
    "attendance_notes" TEXT,
    "attendance_saved_at" TIMESTAMP(3),
    "attendance_submitted_at" TIMESTAMP(3),
    "attendance_finalized_at" TIMESTAMP(3),
    "admin_attendance_handled_at" TIMESTAMP(3),
    "admin_attendance_handled_by_id" TEXT,
    "admin_attendance_handling_note" TEXT,
    "series_exception_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSeries" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "program_code" "ProgramCode",
    "course_name" TEXT,
    "level" INTEGER,
    "session_type" "SessionType" NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "starts_on" TIMESTAMP(3) NOT NULL,
    "ends_on" TIMESTAMP(3),
    "status" "SessionSeriesStatus" NOT NULL DEFAULT 'ACTIVE',
    "pricing_profile_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSeriesSlot" (
    "id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionSeriesSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSeriesParticipant" (
    "series_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionSeriesParticipant_pkey" PRIMARY KEY ("series_id","student_id")
);

-- CreateTable
CREATE TABLE "SessionParticipant" (
    "session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "attendance_outcome" "AttendanceOutcome",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionParticipant_pkey" PRIMARY KEY ("session_id","student_id")
);

-- CreateTable
CREATE TABLE "AttendanceRecoveryGrant" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "granted_by_admin_id" TEXT NOT NULL,
    "admin_reason" TEXT NOT NULL,
    "policy_duration_hours" INTEGER NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL,
    "closes_at" TIMESTAMP(3) NOT NULL,
    "tutor_explanation" TEXT,
    "tutor_attested_at" TIMESTAMP(3),
    "screenshot_unavailable" BOOLEAN,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecoveryGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "attended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "session_id" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPolicy" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "check_in_window_hours" INTEGER NOT NULL DEFAULT 4,
    "late_attendance_recovery_window_hours" INTEGER NOT NULL DEFAULT 1,
    "group_session_price" DECIMAL(10,2) NOT NULL DEFAULT 375.00,
    "private_session_price" DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    "allow_overdraft" BOOLEAN NOT NULL DEFAULT true,
    "default_tutor_hourly_rate" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "commission_enabled" BOOLEAN NOT NULL DEFAULT false,
    "commission_basis" "CommissionBasis" NOT NULL DEFAULT 'FINALIZED_SESSION_WALLET_CHARGE',
    "commission_rate_bps" INTEGER NOT NULL DEFAULT 0,
    "commission_rule_version" INTEGER NOT NULL DEFAULT 1,
    "commission_updated_by_user_id" TEXT,
    "commission_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "PayoutSettlement" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT,
    "source_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "reversal_of_id" TEXT,

    CONSTRAINT "PayoutSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentImportBatch" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "AccountSetupToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose" "AccountTokenPurpose" NOT NULL DEFAULT 'SETUP',
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountSetupToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_referral_source_id_idx" ON "User"("referral_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralSource_name_key" ON "ReferralSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralSource_normalized_name_key" ON "ReferralSource"("normalized_name");

-- CreateIndex
CREATE INDEX "ReferralSource_is_active_name_idx" ON "ReferralSource"("is_active", "name");

-- CreateIndex
CREATE INDEX "LinkedStudentRelationship_student_a_id_active_idx" ON "LinkedStudentRelationship"("student_a_id", "active");

-- CreateIndex
CREATE INDEX "LinkedStudentRelationship_student_b_id_active_idx" ON "LinkedStudentRelationship"("student_b_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedStudentRelationship_student_a_id_student_b_id_key" ON "LinkedStudentRelationship"("student_a_id", "student_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMonthlyPricingPolicy_effective_from_key" ON "StudentMonthlyPricingPolicy"("effective_from");

-- CreateIndex
CREATE INDEX "StudentMonthlyReceivable_student_id_period_start_idx" ON "StudentMonthlyReceivable"("student_id", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMonthlyReceivable_student_period_key" ON "StudentMonthlyReceivable"("student_id", "period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "PricingProfile_name_key" ON "PricingProfile"("name");

-- CreateIndex
CREATE INDEX "PricingProfile_is_active_name_idx" ON "PricingProfile"("is_active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_user_id_key" ON "Wallet"("user_id");

-- CreateIndex
CREATE INDEX "Wallet_user_id_idx" ON "Wallet"("user_id");

-- CreateIndex
CREATE INDEX "Wallet_is_flagged_overdraft_idx" ON "Wallet"("is_flagged_overdraft");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_tutor_id_idx" ON "Session"("tutor_id");

-- CreateIndex
CREATE INDEX "Session_series_id_occurrence_date_idx" ON "Session"("series_id", "occurrence_date");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_start_time_idx" ON "Session"("start_time");

-- CreateIndex
CREATE INDEX "Session_attendance_submitted_at_attendance_finalized_at_idx" ON "Session"("attendance_submitted_at", "attendance_finalized_at");

-- CreateIndex
CREATE INDEX "Session_admin_attendance_handled_at_idx" ON "Session"("admin_attendance_handled_at");

-- CreateIndex
CREATE UNIQUE INDEX "Session_series_slot_id_occurrence_date_key" ON "Session"("series_slot_id", "occurrence_date");

-- CreateIndex
CREATE INDEX "SessionSeries_tutor_id_status_idx" ON "SessionSeries"("tutor_id", "status");

-- CreateIndex
CREATE INDEX "SessionSeries_status_starts_on_idx" ON "SessionSeries"("status", "starts_on");

-- CreateIndex
CREATE INDEX "SessionSeriesSlot_series_id_active_idx" ON "SessionSeriesSlot"("series_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "SessionSeriesSlot_series_id_weekday_start_minute_duration_m_key" ON "SessionSeriesSlot"("series_id", "weekday", "start_minute", "duration_minutes");

-- CreateIndex
CREATE INDEX "SessionSeriesParticipant_student_id_idx" ON "SessionSeriesParticipant"("student_id");

-- CreateIndex
CREATE INDEX "SessionParticipant_student_id_idx" ON "SessionParticipant"("student_id");

-- CreateIndex
CREATE INDEX "AttendanceRecoveryGrant_session_id_opened_at_idx" ON "AttendanceRecoveryGrant"("session_id", "opened_at");

-- CreateIndex
CREATE INDEX "AttendanceRecoveryGrant_session_id_used_at_closes_at_idx" ON "AttendanceRecoveryGrant"("session_id", "used_at", "closes_at");

-- CreateIndex
CREATE INDEX "AttendanceRecord_student_id_idx" ON "AttendanceRecord"("student_id");

-- CreateIndex
CREATE INDEX "AttendanceRecord_session_id_idx" ON "AttendanceRecord"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_session_id_student_id_key" ON "AttendanceRecord"("session_id", "student_id");

-- CreateIndex
CREATE INDEX "WalletTransaction_wallet_id_idx" ON "WalletTransaction"("wallet_id");

-- CreateIndex
CREATE INDEX "WalletTransaction_session_id_idx" ON "WalletTransaction"("session_id");

-- CreateIndex
CREATE INDEX "WalletTransaction_created_at_idx" ON "WalletTransaction"("created_at");

-- CreateIndex
CREATE INDEX "PlatformPolicy_commission_updated_by_user_id_idx" ON "PlatformPolicy"("commission_updated_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "TutorCompensationLedgerEntry_session_id_key" ON "TutorCompensationLedgerEntry"("session_id");

-- CreateIndex
CREATE INDEX "TutorCompensationLedgerEntry_tutor_id_created_at_idx" ON "TutorCompensationLedgerEntry"("tutor_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLedgerEntry_source_wallet_transaction_id_key" ON "CommissionLedgerEntry"("source_wallet_transaction_id");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_student_id_created_at_idx" ON "CommissionLedgerEntry"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_recipient_source_id_created_at_idx" ON "CommissionLedgerEntry"("recipient_source_id", "created_at");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_session_id_idx" ON "CommissionLedgerEntry"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLedgerEntry_session_id_student_id_key" ON "CommissionLedgerEntry"("session_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutSettlement_idempotency_key_key" ON "PayoutSettlement"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutSettlement_reversal_of_id_key" ON "PayoutSettlement"("reversal_of_id");

-- CreateIndex
CREATE INDEX "PayoutSettlement_tutor_id_paid_at_idx" ON "PayoutSettlement"("tutor_id", "paid_at");

-- CreateIndex
CREATE INDEX "PayoutSettlement_source_id_paid_at_idx" ON "PayoutSettlement"("source_id", "paid_at");

-- CreateIndex
CREATE INDEX "PayoutSettlement_created_by_user_id_created_at_idx" ON "PayoutSettlement"("created_by_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "StudentImportBatch_idempotency_key_key" ON "StudentImportBatch"("idempotency_key");

-- CreateIndex
CREATE INDEX "StudentImportBatch_created_by_user_id_created_at_idx" ON "StudentImportBatch"("created_by_user_id", "created_at");

-- CreateIndex
CREATE INDEX "StudentImportRow_batch_id_outcome_idx" ON "StudentImportRow"("batch_id", "outcome");

-- CreateIndex
CREATE INDEX "StudentImportRow_matched_user_id_idx" ON "StudentImportRow"("matched_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentImportRow_batch_id_row_number_key" ON "StudentImportRow"("batch_id", "row_number");

-- CreateIndex
CREATE UNIQUE INDEX "AccountSetupToken_token_hash_key" ON "AccountSetupToken"("token_hash");

-- CreateIndex
CREATE INDEX "AccountSetupToken_user_id_purpose_expires_at_idx" ON "AccountSetupToken"("user_id", "purpose", "expires_at");

-- CreateIndex
CREATE INDEX "AccountSetupToken_expires_at_consumed_at_idx" ON "AccountSetupToken"("expires_at", "consumed_at");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referral_source_id_fkey" FOREIGN KEY ("referral_source_id") REFERENCES "ReferralSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedStudentRelationship" ADD CONSTRAINT "LinkedStudentRelationship_student_a_id_fkey" FOREIGN KEY ("student_a_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedStudentRelationship" ADD CONSTRAINT "LinkedStudentRelationship_student_b_id_fkey" FOREIGN KEY ("student_b_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedStudentRelationship" ADD CONSTRAINT "LinkedStudentRelationship_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedStudentRelationship" ADD CONSTRAINT "LinkedStudentRelationship_ended_by_admin_id_fkey" FOREIGN KEY ("ended_by_admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMonthlyPricingPolicy" ADD CONSTRAINT "StudentMonthlyPricingPolicy_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMonthlyReceivable" ADD CONSTRAINT "StudentMonthlyReceivable_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMonthlyReceivable" ADD CONSTRAINT "StudentMonthlyReceivable_linked_relationship_id_fkey" FOREIGN KEY ("linked_relationship_id") REFERENCES "LinkedStudentRelationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMonthlyReceivable" ADD CONSTRAINT "StudentMonthlyReceivable_pricing_policy_id_fkey" FOREIGN KEY ("pricing_policy_id") REFERENCES "StudentMonthlyPricingPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMonthlyReceivable" ADD CONSTRAINT "StudentMonthlyReceivable_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "SessionSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_series_slot_id_fkey" FOREIGN KEY ("series_slot_id") REFERENCES "SessionSeriesSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_pricing_profile_id_fkey" FOREIGN KEY ("pricing_profile_id") REFERENCES "PricingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_admin_attendance_handled_by_id_fkey" FOREIGN KEY ("admin_attendance_handled_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSeries" ADD CONSTRAINT "SessionSeries_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSeries" ADD CONSTRAINT "SessionSeries_pricing_profile_id_fkey" FOREIGN KEY ("pricing_profile_id") REFERENCES "PricingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSeriesSlot" ADD CONSTRAINT "SessionSeriesSlot_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "SessionSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSeriesParticipant" ADD CONSTRAINT "SessionSeriesParticipant_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "SessionSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSeriesParticipant" ADD CONSTRAINT "SessionSeriesParticipant_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecoveryGrant" ADD CONSTRAINT "AttendanceRecoveryGrant_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecoveryGrant" ADD CONSTRAINT "AttendanceRecoveryGrant_granted_by_admin_id_fkey" FOREIGN KEY ("granted_by_admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPolicy" ADD CONSTRAINT "PlatformPolicy_commission_updated_by_user_id_fkey" FOREIGN KEY ("commission_updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorCompensationLedgerEntry" ADD CONSTRAINT "TutorCompensationLedgerEntry_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorCompensationLedgerEntry" ADD CONSTRAINT "TutorCompensationLedgerEntry_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_source_wallet_transaction_id_fkey" FOREIGN KEY ("source_wallet_transaction_id") REFERENCES "WalletTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_recipient_source_id_fkey" FOREIGN KEY ("recipient_source_id") REFERENCES "ReferralSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutSettlement" ADD CONSTRAINT "PayoutSettlement_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutSettlement" ADD CONSTRAINT "PayoutSettlement_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "ReferralSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutSettlement" ADD CONSTRAINT "PayoutSettlement_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutSettlement" ADD CONSTRAINT "PayoutSettlement_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "PayoutSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentImportBatch" ADD CONSTRAINT "StudentImportBatch_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentImportRow" ADD CONSTRAINT "StudentImportRow_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "StudentImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentImportRow" ADD CONSTRAINT "StudentImportRow_matched_user_id_fkey" FOREIGN KEY ("matched_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSetupToken" ADD CONSTRAINT "AccountSetupToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

