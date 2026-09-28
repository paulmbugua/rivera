ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'OFFERED';

CREATE TYPE "PreferredContactMethod" AS ENUM ('RIVERA', 'EMAIL', 'PHONE', 'WHATSAPP');
CREATE TYPE "ConversationType" AS ENUM ('CAMPAIGN');
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'SYSTEM');
CREATE TYPE "CollaborationOfferStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');
CREATE TYPE "CampaignParticipantStatus" AS ENUM ('ACTIVE', 'CANCELLED');

ALTER TABLE "BusinessProfile" ADD COLUMN "preferredContactMethod" "PreferredContactMethod" NOT NULL DEFAULT 'RIVERA';
ALTER TABLE "CreatorProfile" ADD COLUMN "professionalContactEmail" TEXT,
ADD COLUMN "professionalPhone" TEXT,
ADD COLUMN "preferredContactMethod" "PreferredContactMethod" NOT NULL DEFAULT 'RIVERA';
ALTER TABLE "Application" ADD COLUMN "shortlistedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "acceptedAt" TIMESTAMP(3);

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "type" "ConversationType" NOT NULL DEFAULT 'CAMPAIGN',
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ConversationParticipant" (
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReadAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId", "userId")
);
CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT,
  "type" "MessageType" NOT NULL DEFAULT 'TEXT',
  "content" VARCHAR(3000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CollaborationOffer" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "CollaborationOfferStatus" NOT NULL DEFAULT 'DRAFT',
  "compensationMinor" INTEGER NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "deliverablesSummary" VARCHAR(3000) NOT NULL,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "deliveryDeadline" TIMESTAMP(3),
  "usageRights" VARCHAR(1000),
  "additionalTerms" VARCHAR(3000),
  "expiresAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "withdrawnAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollaborationOffer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CampaignParticipant" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "status" "CampaignParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
  "agreedCompensationMinor" INTEGER NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_applicationId_key" ON "Conversation"("applicationId");
CREATE INDEX "Conversation_campaignId_lastMessageAt_idx" ON "Conversation"("campaignId", "lastMessageAt");
CREATE INDEX "ConversationParticipant_userId_archivedAt_idx" ON "ConversationParticipant"("userId", "archivedAt");
CREATE INDEX "Message_conversationId_createdAt_id_idx" ON "Message"("conversationId", "createdAt", "id");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE UNIQUE INDEX "CollaborationOffer_applicationId_version_key" ON "CollaborationOffer"("applicationId", "version");
CREATE INDEX "CollaborationOffer_applicationId_status_idx" ON "CollaborationOffer"("applicationId", "status");
CREATE INDEX "CollaborationOffer_campaignId_status_idx" ON "CollaborationOffer"("campaignId", "status");
CREATE INDEX "CollaborationOffer_creatorId_status_idx" ON "CollaborationOffer"("creatorId", "status");
CREATE UNIQUE INDEX "CampaignParticipant_applicationId_key" ON "CampaignParticipant"("applicationId");
CREATE UNIQUE INDEX "CampaignParticipant_offerId_key" ON "CampaignParticipant"("offerId");
CREATE UNIQUE INDEX "CampaignParticipant_campaignId_creatorId_key" ON "CampaignParticipant"("campaignId", "creatorId");
CREATE INDEX "CampaignParticipant_campaignId_status_idx" ON "CampaignParticipant"("campaignId", "status");
CREATE INDEX "CampaignParticipant_creatorId_status_idx" ON "CampaignParticipant"("creatorId", "status");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationOffer" ADD CONSTRAINT "CollaborationOffer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollaborationOffer" ADD CONSTRAINT "CollaborationOffer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollaborationOffer" ADD CONSTRAINT "CollaborationOffer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollaborationOffer" ADD CONSTRAINT "CollaborationOffer_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "CollaborationOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "one_active_sent_offer_per_application" ON "CollaborationOffer"("applicationId") WHERE "status" = 'SENT';
ALTER TABLE "CollaborationOffer" ADD CONSTRAINT "CollaborationOffer_compensation_nonnegative" CHECK ("compensationMinor" >= 0);
