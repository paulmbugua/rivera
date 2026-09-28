ALTER TYPE "CampaignParticipantStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

CREATE TYPE "CampaignWorkItemStatus" AS ENUM ('PENDING','IN_PROGRESS','SUBMITTED','REVISION_REQUESTED','APPROVED','CANCELLED');
CREATE TYPE "DeliverableSubmissionStatus" AS ENUM ('SUBMITTED','REVISION_REQUESTED','APPROVED','SUPERSEDED');
CREATE TYPE "SubmissionAssetType" AS ENUM ('FILE','LINK');
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED','HIDDEN','REMOVED');
CREATE TYPE "ReviewReportStatus" AS ENUM ('OPEN','RESOLVED','DISMISSED');

ALTER TABLE "CampaignParticipant" ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TABLE "CampaignWorkItem" (
  "id" TEXT NOT NULL,
  "campaignParticipantId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "description" VARCHAR(1500),
  "contentTypeId" TEXT,
  "platform" "SocialPlatform",
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "dueDate" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "status" "CampaignWorkItemStatus" NOT NULL DEFAULT 'PENDING',
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignWorkItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CampaignWorkItem_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "DeliverableSubmission" (
  "id" TEXT NOT NULL,
  "workItemId" TEXT NOT NULL,
  "campaignParticipantId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "DeliverableSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "message" VARCHAR(2000),
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "revisionNote" VARCHAR(2000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliverableSubmission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliverableSubmission_version_check" CHECK ("version" > 0)
);

CREATE TABLE "SubmissionAsset" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "type" "SubmissionAssetType" NOT NULL,
  "name" VARCHAR(240) NOT NULL,
  "url" VARCHAR(2000),
  "storageKey" TEXT,
  "mimeType" VARCHAR(120),
  "fileSize" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubmissionAsset_source_check" CHECK (("type"='LINK' AND "url" IS NOT NULL AND "storageKey" IS NULL) OR ("type"='FILE' AND "storageKey" IS NOT NULL))
);

CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "campaignParticipantId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "revieweeId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" VARCHAR(2000),
  "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "Review_not_self_check" CHECK ("reviewerId" <> "revieweeId")
);

CREATE TABLE "ReviewReport" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "status" "ReviewReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignWorkItem_campaignParticipantId_sortOrder_idx" ON "CampaignWorkItem"("campaignParticipantId","sortOrder");
CREATE INDEX "CampaignWorkItem_campaignId_status_idx" ON "CampaignWorkItem"("campaignId","status");
CREATE INDEX "CampaignWorkItem_creatorId_status_idx" ON "CampaignWorkItem"("creatorId","status");
CREATE INDEX "CampaignWorkItem_businessId_status_idx" ON "CampaignWorkItem"("businessId","status");
CREATE UNIQUE INDEX "DeliverableSubmission_workItemId_version_key" ON "DeliverableSubmission"("workItemId","version");
CREATE INDEX "DeliverableSubmission_campaignParticipantId_createdAt_idx" ON "DeliverableSubmission"("campaignParticipantId","createdAt");
CREATE INDEX "DeliverableSubmission_campaignId_status_idx" ON "DeliverableSubmission"("campaignId","status");
CREATE INDEX "DeliverableSubmission_creatorId_status_idx" ON "DeliverableSubmission"("creatorId","status");
CREATE UNIQUE INDEX "SubmissionAsset_storageKey_key" ON "SubmissionAsset"("storageKey");
CREATE INDEX "SubmissionAsset_submissionId_idx" ON "SubmissionAsset"("submissionId");
CREATE UNIQUE INDEX "Review_campaignParticipantId_reviewerId_key" ON "Review"("campaignParticipantId","reviewerId");
CREATE INDEX "Review_revieweeId_status_createdAt_idx" ON "Review"("revieweeId","status","createdAt");
CREATE INDEX "Review_campaignId_idx" ON "Review"("campaignId");
CREATE UNIQUE INDEX "ReviewReport_reviewId_reporterId_key" ON "ReviewReport"("reviewId","reporterId");
CREATE INDEX "ReviewReport_status_createdAt_idx" ON "ReviewReport"("status","createdAt");

ALTER TABLE "CampaignWorkItem" ADD CONSTRAINT "CampaignWorkItem_campaignParticipantId_fkey" FOREIGN KEY ("campaignParticipantId") REFERENCES "CampaignParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignWorkItem" ADD CONSTRAINT "CampaignWorkItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignWorkItem" ADD CONSTRAINT "CampaignWorkItem_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignWorkItem" ADD CONSTRAINT "CampaignWorkItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignWorkItem" ADD CONSTRAINT "CampaignWorkItem_contentTypeId_fkey" FOREIGN KEY ("contentTypeId") REFERENCES "ContentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliverableSubmission" ADD CONSTRAINT "DeliverableSubmission_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "CampaignWorkItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliverableSubmission" ADD CONSTRAINT "DeliverableSubmission_campaignParticipantId_fkey" FOREIGN KEY ("campaignParticipantId") REFERENCES "CampaignParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliverableSubmission" ADD CONSTRAINT "DeliverableSubmission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliverableSubmission" ADD CONSTRAINT "DeliverableSubmission_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliverableSubmission" ADD CONSTRAINT "DeliverableSubmission_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubmissionAsset" ADD CONSTRAINT "SubmissionAsset_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DeliverableSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_campaignParticipantId_fkey" FOREIGN KEY ("campaignParticipantId") REFERENCES "CampaignParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
