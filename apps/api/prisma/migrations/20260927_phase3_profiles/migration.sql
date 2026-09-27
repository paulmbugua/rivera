CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'X', 'LINKEDIN', 'SNAPCHAT', 'TWITCH', 'PINTEREST', 'BLOG', 'PODCAST', 'OTHER');
CREATE TYPE "PortfolioMediaType" AS ENUM ('IMAGE', 'VIDEO', 'EXTERNAL_LINK', 'ARTICLE', 'SOCIAL_POST');
CREATE TYPE "LanguageProficiency" AS ENUM ('BASIC', 'CONVERSATIONAL', 'PROFESSIONAL', 'NATIVE');
CREATE TYPE "EmployeeSize" AS ENUM ('SOLO', 'TWO_TO_TEN', 'ELEVEN_TO_FIFTY', 'FIFTY_ONE_TO_TWO_HUNDRED', 'TWO_HUNDRED_ONE_TO_FIVE_HUNDRED', 'FIVE_HUNDRED_PLUS');
CREATE TYPE "VerificationProfileType" AS ENUM ('CREATOR', 'BUSINESS');
CREATE TYPE "VerificationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

ALTER TABLE "CreatorProfile" ADD COLUMN "slug" TEXT;
UPDATE "CreatorProfile" SET "slug" = trim(both '-' from regexp_replace(lower("displayName"), '[^a-z0-9]+', '-', 'g')) || '-' || substring("id", 1, 6);
ALTER TABLE "CreatorProfile" ALTER COLUMN "slug" SET NOT NULL,
  ADD COLUMN "headline" VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN "profileImageUrl" TEXT,
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "yearsExperience" INTEGER,
  ADD COLUMN "travelAvailable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "remoteCampaignsAllowed" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "minimumRateMinor" INTEGER,
  ADD COLUMN "minimumRateCurrency" VARCHAR(3),
  ADD COLUMN "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "profileCompletion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "completedCampaigns" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ALTER COLUMN "bio" TYPE VARCHAR(2000);
CREATE UNIQUE INDEX "CreatorProfile_slug_key" ON "CreatorProfile"("slug");
CREATE INDEX "CreatorProfile_country_idx" ON "CreatorProfile"("country");
CREATE INDEX "CreatorProfile_profileVisibility_verificationStatus_idx" ON "CreatorProfile"("profileVisibility", "verificationStatus");

ALTER TABLE "BusinessProfile" ADD COLUMN "slug" TEXT;
UPDATE "BusinessProfile" SET "slug" = trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')) || '-' || substring("id", 1, 6);
ALTER TABLE "BusinessProfile" ALTER COLUMN "slug" SET NOT NULL,
  ADD COLUMN "industryId" TEXT,
  ADD COLUMN "shortDescription" VARCHAR(240),
  ADD COLUMN "businessEmail" TEXT,
  ADD COLUMN "businessPhone" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "yearEstablished" INTEGER,
  ADD COLUMN "employeeSize" "EmployeeSize",
  ADD COLUMN "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "profileCompletion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ALTER COLUMN "description" TYPE VARCHAR(3000);
CREATE UNIQUE INDEX "BusinessProfile_slug_key" ON "BusinessProfile"("slug");
CREATE INDEX "BusinessProfile_country_idx" ON "BusinessProfile"("country");
CREATE INDEX "BusinessProfile_industryId_idx" ON "BusinessProfile"("industryId");
CREATE INDEX "BusinessProfile_profileVisibility_verificationStatus_idx" ON "BusinessProfile"("profileVisibility", "verificationStatus");

CREATE TABLE "Category" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT, "icon" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_active_sortOrder_idx" ON "Category"("active", "sortOrder");

CREATE TABLE "Industry" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Industry_name_key" ON "Industry"("name");
CREATE UNIQUE INDEX "Industry_slug_key" ON "Industry"("slug");
CREATE INDEX "Industry_active_sortOrder_idx" ON "Industry"("active", "sortOrder");

CREATE TABLE "ContentType" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContentType_name_key" ON "ContentType"("name");
CREATE UNIQUE INDEX "ContentType_slug_key" ON "ContentType"("slug");
CREATE INDEX "ContentType_active_sortOrder_idx" ON "ContentType"("active", "sortOrder");

CREATE TABLE "CreatorCategory" (
  "creatorId" TEXT NOT NULL, "categoryId" TEXT NOT NULL, "isPrimary" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorCategory_pkey" PRIMARY KEY ("creatorId", "categoryId")
);
CREATE INDEX "CreatorCategory_categoryId_idx" ON "CreatorCategory"("categoryId");

CREATE TABLE "CreatorContentType" (
  "creatorId" TEXT NOT NULL, "contentTypeId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorContentType_pkey" PRIMARY KEY ("creatorId", "contentTypeId")
);
CREATE INDEX "CreatorContentType_contentTypeId_idx" ON "CreatorContentType"("contentTypeId");

CREATE TABLE "CreatorLanguage" (
  "id" TEXT NOT NULL, "creatorId" TEXT NOT NULL, "languageCode" VARCHAR(8) NOT NULL, "proficiency" "LanguageProficiency",
  CONSTRAINT "CreatorLanguage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CreatorLanguage_creatorId_languageCode_key" ON "CreatorLanguage"("creatorId", "languageCode");

CREATE TABLE "CreatorSocialAccount" (
  "id" TEXT NOT NULL, "creatorId" TEXT NOT NULL, "platform" "SocialPlatform" NOT NULL, "username" TEXT, "profileUrl" TEXT, "followers" INTEGER NOT NULL DEFAULT 0, "averageViews" INTEGER, "engagementRate" DECIMAL(5,2), "verifiedByRivera" BOOLEAN NOT NULL DEFAULT false, "isPrimary" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorSocialAccount_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CreatorSocialAccount_creatorId_idx" ON "CreatorSocialAccount"("creatorId");
CREATE INDEX "CreatorSocialAccount_platform_idx" ON "CreatorSocialAccount"("platform");

CREATE TABLE "PortfolioItem" (
  "id" TEXT NOT NULL, "creatorId" TEXT NOT NULL, "title" VARCHAR(140) NOT NULL, "description" VARCHAR(1000), "mediaType" "PortfolioMediaType" NOT NULL, "mediaUrl" TEXT, "thumbnailUrl" TEXT, "externalUrl" TEXT, "platform" "SocialPlatform", "brandName" VARCHAR(120), "sortOrder" INTEGER NOT NULL DEFAULT 0, "published" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PortfolioItem_creatorId_sortOrder_idx" ON "PortfolioItem"("creatorId", "sortOrder");

CREATE TABLE "VerificationRequest" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "profileType" "VerificationProfileType" NOT NULL, "creatorProfileId" TEXT, "businessProfileId" TEXT, "status" "VerificationRequestStatus" NOT NULL DEFAULT 'PENDING', "noteFromUser" VARCHAR(1000), "reviewNote" VARCHAR(1000), "reviewedById" TEXT, "reviewedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationRequest_status_createdAt_idx" ON "VerificationRequest"("status", "createdAt");
CREATE INDEX "VerificationRequest_userId_idx" ON "VerificationRequest"("userId");

ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreatorCategory" ADD CONSTRAINT "CreatorCategory_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorCategory" ADD CONSTRAINT "CreatorCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreatorContentType" ADD CONSTRAINT "CreatorContentType_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorContentType" ADD CONSTRAINT "CreatorContentType_contentTypeId_fkey" FOREIGN KEY ("contentTypeId") REFERENCES "ContentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreatorLanguage" ADD CONSTRAINT "CreatorLanguage_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorSocialAccount" ADD CONSTRAINT "CreatorSocialAccount_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

