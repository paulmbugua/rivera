CREATE TABLE "CampaignAuditLog" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" VARCHAR(80) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CampaignAuditLog_campaignId_createdAt_idx" ON "CampaignAuditLog"("campaignId", "createdAt");
CREATE INDEX "CampaignAuditLog_actorUserId_idx" ON "CampaignAuditLog"("actorUserId");
ALTER TABLE "CampaignAuditLog" ADD CONSTRAINT "CampaignAuditLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
