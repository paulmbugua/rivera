ALTER TYPE "PaymentProvider" ADD VALUE 'WISE';
ALTER TYPE "CreatorTransferStatus" ADD VALUE 'PROCESSING';

ALTER TABLE "CreatorPayoutAccount"
  ADD COLUMN "wiseEmail" VARCHAR(254),
  ADD COLUMN "wiseLegalName" VARCHAR(160),
  ADD COLUMN "wiseEmailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "wiseCodeHash" VARCHAR(64),
  ADD COLUMN "wiseCodeExpiresAt" TIMESTAMP(3),
  ADD COLUMN "wiseCodeAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wiseReviewedBy" TEXT,
  ADD COLUMN "wiseReviewedAt" TIMESTAMP(3);

ALTER TABLE "CreatorTransfer"
  ADD COLUMN "wiseEmail" VARCHAR(254),
  ADD COLUMN "wiseLegalName" VARCHAR(160),
  ADD COLUMN "wiseAmountUsdMinor" INTEGER,
  ADD COLUMN "wiseClaimedBy" TEXT,
  ADD COLUMN "wiseClaimedAt" TIMESTAMP(3),
  ADD COLUMN "wiseTransferReference" VARCHAR(30),
  ADD COLUMN "wiseCompletedBy" TEXT;
CREATE UNIQUE INDEX "CreatorTransfer_wiseTransferReference_key" ON "CreatorTransfer"("wiseTransferReference");
ALTER TABLE "CreatorTransfer" ADD CONSTRAINT "CreatorTransfer_wiseAmount_positive" CHECK ("wiseAmountUsdMinor" IS NULL OR "wiseAmountUsdMinor" > 0);
