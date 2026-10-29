ALTER TABLE "Notification"
ADD COLUMN "emailAttemptedAt" TIMESTAMP(3),
ADD COLUMN "emailDeliveredAt" TIMESTAMP(3),
ADD COLUMN "emailAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "emailLastError" VARCHAR(500);

-- Do not send the historical bell backlog when email mirroring is enabled.
UPDATE "Notification"
SET "emailAttemptedAt" = "createdAt",
    "emailDeliveredAt" = "createdAt"
WHERE "emailDeliveredAt" IS NULL;

CREATE INDEX "Notification_emailAttemptedAt_createdAt_idx"
ON "Notification"("emailAttemptedAt", "createdAt");
