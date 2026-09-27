ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "CampaignVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');
CREATE TYPE "CampaignLocationType" AS ENUM ('LOCAL', 'NATIONAL', 'GLOBAL', 'REMOTE');
CREATE TYPE "CampaignObjective" AS ENUM ('BRAND_AWARENESS', 'PRODUCT_LAUNCH', 'SALES', 'LEAD_GENERATION', 'APP_DOWNLOADS', 'WEBSITE_TRAFFIC', 'STORE_VISITS', 'EVENT_PROMOTION', 'SOCIAL_ENGAGEMENT', 'CONTENT_CREATION', 'UGC_CREATION', 'PRODUCT_REVIEWS', 'COMMUNITY_GROWTH', 'OTHER');
CREATE TYPE "BudgetVisibility" AS ENUM ('PUBLIC', 'HIDDEN');
CREATE TYPE "UsageRights" AS ENUM ('ORGANIC_ONLY', 'PAID_ADS', 'BUSINESS_WEBSITE', 'SOCIAL_MEDIA', 'FULL_COMMERCIAL', 'TO_BE_DISCUSSED');
CREATE TYPE "CampaignAttachmentVisibility" AS ENUM ('PUBLIC', 'LOCKED', 'OWNER_ONLY');

ALTER TABLE "Campaign" RENAME COLUMN "summary" TO "shortDescription";
ALTER TABLE "Campaign" RENAME COLUMN "brief" TO "fullDescription";
ALTER TABLE "Campaign" RENAME COLUMN "country" TO "campaignCountryCode";
ALTER TABLE "Campaign" RENAME COLUMN "currency" TO "currencyCode";
ALTER TABLE "Campaign" RENAME COLUMN "deadline" TO "applicationDeadline";
ALTER TABLE "Campaign" ADD COLUMN "slug" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "productOrServiceName" VARCHAR(160);
ALTER TABLE "Campaign" ADD COLUMN "productOrServiceDescription" VARCHAR(2000);
ALTER TABLE "Campaign" ADD COLUMN "productUrl" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "campaignObjective" "CampaignObjective";
ALTER TABLE "Campaign" ADD COLUMN "otherObjective" VARCHAR(160);
ALTER TABLE "Campaign" ADD COLUMN "targetAudience" VARCHAR(2000);
ALTER TABLE "Campaign" ADD COLUMN "expectedOutcomes" VARCHAR(2000);
ALTER TABLE "Campaign" ADD COLUMN "budgetMinMinor" INTEGER;
ALTER TABLE "Campaign" ADD COLUMN "budgetMaxMinor" INTEGER;
ALTER TABLE "Campaign" ADD COLUMN "budgetVisibility" "BudgetVisibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Campaign" ADD COLUMN "creatorSlots" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Campaign" ADD COLUMN "campaignStartDate" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN "campaignEndDate" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN "locationType" "CampaignLocationType";
ALTER TABLE "Campaign" ADD COLUMN "campaignCity" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "campaignRegion" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "physicalLocationDescription" VARCHAR(500);
ALTER TABLE "Campaign" ADD COLUMN "verifiedCreatorsOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Campaign" ADD COLUMN "usageRights" "UsageRights";
ALTER TABLE "Campaign" ADD COLUMN "usageRightsNotes" VARCHAR(1000);
ALTER TABLE "Campaign" ADD COLUMN "productProvided" BOOLEAN;
ALTER TABLE "Campaign" ADD COLUMN "travelExpensesCovered" BOOLEAN;
ALTER TABLE "Campaign" ADD COLUMN "specialInstructions" VARCHAR(2000);
ALTER TABLE "Campaign" ADD COLUMN "visibility" "CampaignVisibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "Campaign" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Campaign" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN "pausedAt" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN "deletedAt" TIMESTAMP(3);

UPDATE "Campaign" SET "slug" = regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g') || '-' || substr("id", 1, 8), "budgetMinMinor" = round("budget" * 100), "budgetMaxMinor" = round("budget" * 100);
ALTER TABLE "Campaign" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Campaign" ALTER COLUMN "title" TYPE VARCHAR(160);
ALTER TABLE "Campaign" ALTER COLUMN "shortDescription" TYPE VARCHAR(350);
ALTER TABLE "Campaign" ALTER COLUMN "shortDescription" SET DEFAULT '';
ALTER TABLE "Campaign" ALTER COLUMN "fullDescription" TYPE VARCHAR(5000);
ALTER TABLE "Campaign" ALTER COLUMN "fullDescription" SET DEFAULT '';
ALTER TABLE "Campaign" ALTER COLUMN "campaignCountryCode" DROP NOT NULL;
ALTER TABLE "Campaign" ALTER COLUMN "campaignCountryCode" TYPE VARCHAR(2);
ALTER TABLE "Campaign" ALTER COLUMN "currencyCode" TYPE VARCHAR(3);
ALTER TABLE "Campaign" ALTER COLUMN "applicationDeadline" DROP NOT NULL;
ALTER TABLE "Campaign" DROP COLUMN "budget";

CREATE TABLE "CampaignCategory" (
  "campaignId" TEXT NOT NULL, "categoryId" TEXT NOT NULL, "isPrimary" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignCategory_pkey" PRIMARY KEY ("campaignId", "categoryId")
);
CREATE TABLE "CampaignCreatorLocation" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "countryCode" VARCHAR(2) NOT NULL, "city" TEXT, "region" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignCreatorLocation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CampaignPlatform" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "platform" "SocialPlatform" NOT NULL, "required" BOOLEAN NOT NULL DEFAULT true, "minimumFollowers" INTEGER, "preferredFollowers" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignPlatform_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CampaignLanguage" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "languageCode" VARCHAR(8) NOT NULL, "required" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignLanguage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CampaignDeliverable" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "title" VARCHAR(160) NOT NULL, "description" VARCHAR(1000), "quantity" INTEGER NOT NULL DEFAULT 1, "platform" "SocialPlatform", "contentTypeId" TEXT, "dueDate" TIMESTAMP(3), "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignDeliverable_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CampaignAttachment" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "name" TEXT NOT NULL, "fileUrl" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "fileSize" INTEGER NOT NULL, "visibility" "CampaignAttachmentVisibility" NOT NULL DEFAULT 'LOCKED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignAttachment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SavedCampaign" (
  "creatorId" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedCampaign_pkey" PRIMARY KEY ("creatorId", "campaignId")
);

CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX "Campaign_visibility_idx" ON "Campaign"("visibility");
CREATE INDEX "Campaign_publishedAt_idx" ON "Campaign"("publishedAt");
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");
CREATE INDEX "Campaign_applicationDeadline_idx" ON "Campaign"("applicationDeadline");
CREATE INDEX "Campaign_campaignCountryCode_idx" ON "Campaign"("campaignCountryCode");
CREATE INDEX "Campaign_businessId_idx" ON "Campaign"("businessId");
CREATE INDEX "Campaign_campaignObjective_idx" ON "Campaign"("campaignObjective");
CREATE INDEX "CampaignCategory_categoryId_idx" ON "CampaignCategory"("categoryId");
CREATE INDEX "CampaignCreatorLocation_campaignId_idx" ON "CampaignCreatorLocation"("campaignId");
CREATE INDEX "CampaignCreatorLocation_countryCode_city_idx" ON "CampaignCreatorLocation"("countryCode", "city");
CREATE UNIQUE INDEX "CampaignPlatform_campaignId_platform_key" ON "CampaignPlatform"("campaignId", "platform");
CREATE INDEX "CampaignPlatform_platform_idx" ON "CampaignPlatform"("platform");
CREATE UNIQUE INDEX "CampaignLanguage_campaignId_languageCode_key" ON "CampaignLanguage"("campaignId", "languageCode");
CREATE INDEX "CampaignDeliverable_campaignId_sortOrder_idx" ON "CampaignDeliverable"("campaignId", "sortOrder");
CREATE INDEX "CampaignAttachment_campaignId_idx" ON "CampaignAttachment"("campaignId");
CREATE INDEX "SavedCampaign_creatorId_idx" ON "SavedCampaign"("creatorId");
CREATE INDEX "SavedCampaign_campaignId_idx" ON "SavedCampaign"("campaignId");

ALTER TABLE "CampaignCategory" ADD CONSTRAINT "CampaignCategory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignCategory" ADD CONSTRAINT "CampaignCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignCreatorLocation" ADD CONSTRAINT "CampaignCreatorLocation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignPlatform" ADD CONSTRAINT "CampaignPlatform_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignLanguage" ADD CONSTRAINT "CampaignLanguage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignDeliverable" ADD CONSTRAINT "CampaignDeliverable_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignDeliverable" ADD CONSTRAINT "CampaignDeliverable_contentTypeId_fkey" FOREIGN KEY ("contentTypeId") REFERENCES "ContentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignAttachment" ADD CONSTRAINT "CampaignAttachment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedCampaign" ADD CONSTRAINT "SavedCampaign_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedCampaign" ADD CONSTRAINT "SavedCampaign_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
