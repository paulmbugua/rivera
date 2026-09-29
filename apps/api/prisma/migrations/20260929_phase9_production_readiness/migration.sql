CREATE TYPE "NotificationCategory" AS ENUM ('ACCOUNT','CAMPAIGNS','APPLICATIONS','MESSAGES','OFFERS','COLLABORATIONS','PAYMENTS','REVIEWS','MARKETING');
CREATE TYPE "SafetyReportType" AS ENUM ('USER','CAMPAIGN','MESSAGE','REVIEW','PAYMENT');
CREATE TYPE "SafetyReportStatus" AS ENUM ('OPEN','UNDER_REVIEW','RESOLVED','DISMISSED');
CREATE TYPE "DataLifecycleRequestType" AS ENUM ('EXPORT','DELETION');
CREATE TYPE "DataLifecycleRequestStatus" AS ENUM ('REQUESTED','IN_PROGRESS','COMPLETED','REJECTED');
CREATE TYPE "OperationalJobStatus" AS ENUM ('RUNNING','SUCCEEDED','FAILED','SKIPPED');

CREATE TABLE "NotificationPreference" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"category" "NotificationCategory" NOT NULL,"emailEnabled" BOOLEAN NOT NULL DEFAULT true,"inAppEnabled" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SafetyReport" ("id" TEXT NOT NULL,"reporterId" TEXT NOT NULL,"reviewedById" TEXT,"type" "SafetyReportType" NOT NULL,"subjectId" TEXT NOT NULL,"reason" VARCHAR(1000) NOT NULL,"status" "SafetyReportStatus" NOT NULL DEFAULT 'OPEN',"privateAdminNote" VARCHAR(2000),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,"resolvedAt" TIMESTAMP(3),CONSTRAINT "SafetyReport_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AnalyticsEvent" ("id" TEXT NOT NULL,"event" VARCHAR(80) NOT NULL,"userId" TEXT,"requestId" VARCHAR(80),"entityType" VARCHAR(80),"entityId" VARCHAR(191),"amountMinor" INTEGER,"currencyCode" VARCHAR(3),"dimensions" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "DataLifecycleRequest" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"type" "DataLifecycleRequestType" NOT NULL,"status" "DataLifecycleRequestStatus" NOT NULL DEFAULT 'REQUESTED',"privateNote" VARCHAR(2000),"requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"completedAt" TIMESTAMP(3),"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "DataLifecycleRequest_pkey" PRIMARY KEY ("id"));
CREATE TABLE "OperationalJobRun" ("id" TEXT NOT NULL,"jobName" VARCHAR(120) NOT NULL,"scheduledFor" TIMESTAMP(3) NOT NULL,"status" "OperationalJobStatus" NOT NULL DEFAULT 'RUNNING',"processed" INTEGER NOT NULL DEFAULT 0,"failed" INTEGER NOT NULL DEFAULT 0,"errorCode" VARCHAR(120),"startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"finishedAt" TIMESTAMP(3),CONSTRAINT "OperationalJobRun_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AdminAuditLog" ("id" TEXT NOT NULL,"actorId" TEXT NOT NULL,"action" VARCHAR(120) NOT NULL,"targetType" VARCHAR(80) NOT NULL,"targetId" VARCHAR(191) NOT NULL,"metadata" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "NotificationPreference_userId_category_key" ON "NotificationPreference"("userId","category");
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
CREATE UNIQUE INDEX "SafetyReport_reporterId_type_subjectId_key" ON "SafetyReport"("reporterId","type","subjectId");
CREATE INDEX "SafetyReport_status_createdAt_idx" ON "SafetyReport"("status","createdAt");
CREATE INDEX "SafetyReport_type_subjectId_idx" ON "SafetyReport"("type","subjectId");
CREATE INDEX "AnalyticsEvent_event_createdAt_idx" ON "AnalyticsEvent"("event","createdAt");
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId","createdAt");
CREATE INDEX "DataLifecycleRequest_userId_status_idx" ON "DataLifecycleRequest"("userId","status");
CREATE INDEX "DataLifecycleRequest_type_status_requestedAt_idx" ON "DataLifecycleRequest"("type","status","requestedAt");
CREATE UNIQUE INDEX "OperationalJobRun_jobName_scheduledFor_key" ON "OperationalJobRun"("jobName","scheduledFor");
CREATE INDEX "OperationalJobRun_status_startedAt_idx" ON "OperationalJobRun"("status","startedAt");
CREATE INDEX "AdminAuditLog_actorId_createdAt_idx" ON "AdminAuditLog"("actorId","createdAt");
CREATE INDEX "AdminAuditLog_targetType_targetId_createdAt_idx" ON "AdminAuditLog"("targetType","targetId","createdAt");

ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyReport" ADD CONSTRAINT "SafetyReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafetyReport" ADD CONSTRAINT "SafetyReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DataLifecycleRequest" ADD CONSTRAINT "DataLifecycleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
