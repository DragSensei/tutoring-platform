-- DRAFT only: additive nullable idempotency key for Admin wallet deposits.
-- Existing ledger rows remain NULL; uniqueness permits multiple NULL values.
-- Review and generate the production migration through the normal schema workflow.
BEGIN;

ALTER TABLE "WalletTransaction"
  ADD COLUMN "request_key" TEXT;

CREATE UNIQUE INDEX "WalletTransaction_request_key_key"
  ON "WalletTransaction"("request_key");

COMMIT;
