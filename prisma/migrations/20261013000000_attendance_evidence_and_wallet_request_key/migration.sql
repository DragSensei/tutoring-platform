-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN     "request_key" TEXT;

-- CreateTable
CREATE TABLE "AttendanceEvidence" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "AttendanceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEvidence_session_id_key" ON "AttendanceEvidence"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEvidence_storage_key_key" ON "AttendanceEvidence"("storage_key");

-- CreateIndex
CREATE INDEX "AttendanceEvidence_uploaded_by_user_id_created_at_idx" ON "AttendanceEvidence"("uploaded_by_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_request_key_key" ON "WalletTransaction"("request_key");

-- AddForeignKey
ALTER TABLE "AttendanceEvidence" ADD CONSTRAINT "AttendanceEvidence_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvidence" ADD CONSTRAINT "AttendanceEvidence_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

