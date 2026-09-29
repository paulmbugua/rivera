ALTER TYPE "CampaignParticipantStatus" ADD VALUE IF NOT EXISTS 'AWAITING_FUNDING' BEFORE 'ACTIVE';

ALTER TABLE "CampaignParticipant"
  ALTER COLUMN "status" SET DEFAULT 'AWAITING_FUNDING';

ALTER TABLE "CampaignParticipant"
  ADD COLUMN "fundingDueAt" TIMESTAMP(3),
  ADD COLUMN "fundingReminderSentAt" TIMESTAMP(3),
  ADD COLUMN "fundingOverdueNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "activatedAt" TIMESTAMP(3);

UPDATE "CampaignParticipant" AS participant
SET
  "status" = 'AWAITING_FUNDING',
  "fundingDueAt" = COALESCE(participant."joinedAt", participant."createdAt") + INTERVAL '48 hours'
WHERE participant."status" = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1
    FROM "CollaborationPayment" AS payment
    WHERE payment."campaignParticipantId" = participant."id"
      AND payment."status" IN ('FUNDED', 'PARTIALLY_REFUNDED', 'RELEASE_PENDING', 'RELEASED', 'PAYOUT_PENDING', 'SETTLED')
  );

UPDATE "CampaignParticipant" AS participant
SET "activatedAt" = COALESCE(payment."fundedAt", participant."joinedAt")
FROM "CollaborationPayment" AS payment
WHERE payment."campaignParticipantId" = participant."id"
  AND participant."status" = 'ACTIVE'
  AND payment."status" IN ('FUNDED', 'PARTIALLY_REFUNDED', 'RELEASE_PENDING', 'RELEASED', 'PAYOUT_PENDING', 'SETTLED');

CREATE INDEX "CampaignParticipant_status_fundingDueAt_idx"
  ON "CampaignParticipant"("status", "fundingDueAt");
