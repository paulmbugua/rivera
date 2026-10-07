CREATE TYPE "PushPlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

ALTER TABLE "Notification"
  ADD COLUMN "pushAttemptedAt" TIMESTAMP(3),
  ADD COLUMN "pushDeliveredAt" TIMESTAMP(3),
  ADD COLUMN "pushAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pushLastError" VARCHAR(500);

ALTER TABLE "NotificationPreference"
  ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "PushDeviceToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" "PushPlatform" NOT NULL,
  "deviceName" VARCHAR(160),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushDeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushDeviceToken_token_key" ON "PushDeviceToken"("token");
CREATE INDEX "PushDeviceToken_userId_enabled_idx" ON "PushDeviceToken"("userId", "enabled");
CREATE INDEX "Notification_pushAttemptedAt_createdAt_idx" ON "Notification"("pushAttemptedAt", "createdAt");

ALTER TABLE "PushDeviceToken"
  ADD CONSTRAINT "PushDeviceToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
