ALTER TYPE "CreatorTransferStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TABLE "CreatorTransfer"
  ADD COLUMN "scheduledFor" TIMESTAMP(3),
  ADD COLUMN "recipientAccountId" TEXT,
  ADD COLUMN "dispatchAttemptedAt" TIMESTAMP(3),
  ADD COLUMN "lastCheckedAt" TIMESTAMP(3);
CREATE INDEX "CreatorTransfer_status_scheduledFor_idx" ON "CreatorTransfer"("status", "scheduledFor");
-- Existing transfers deliberately remain unchanged: never resend historical payouts.
