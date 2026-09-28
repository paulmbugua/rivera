ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_PROCESSING';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'VIEWED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "ApplicationPaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE');
CREATE TYPE "CreditTransactionType" AS ENUM ('GRANT', 'USE', 'REFUND', 'ADMIN_ADJUSTMENT');
CREATE TYPE "WebhookEventStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "PaymentRefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "PaymentRefundReason" AS ENUM ('DUPLICATE_PAYMENT', 'TECHNICAL_ERROR', 'CAMPAIGN_REMOVED', 'CAMPAIGN_CANCELLED', 'OTHER');

ALTER TABLE "CreatorProfile" ADD COLUMN "freeApplicationCredits" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Application" RENAME COLUMN "proposal" TO "pitch";
ALTER TABLE "Application" RENAME COLUMN "proposedAmount" TO "proposedAmountMinor";
ALTER TABLE "Application" ALTER COLUMN "proposedAmountMinor" TYPE INTEGER USING ROUND("proposedAmountMinor" * 100)::INTEGER;
ALTER TABLE "Application" ADD COLUMN "proposedCurrencyCode" VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE "Application" ADD COLUMN "proposedDeliverables" VARCHAR(3000);
ALTER TABLE "Application" ADD COLUMN "estimatedDeliveryDays" INTEGER;
ALTER TABLE "Application" ADD COLUMN "additionalNotes" VARCHAR(1500);
ALTER TABLE "Application" ADD COLUMN "paymentStatus" "ApplicationPaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Application" ADD COLUMN "applicationFeeMinor" INTEGER;
ALTER TABLE "Application" ADD COLUMN "applicationFeeCurrencyCode" VARCHAR(3);
ALTER TABLE "Application" ADD COLUMN "applicationFeeRuleId" TEXT;
ALTER TABLE "Application" ADD COLUMN "usedFreeCredit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Application" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN "viewedAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN "withdrawnAt" TIMESTAMP(3);
ALTER TABLE "Application" ALTER COLUMN "proposedCurrencyCode" DROP DEFAULT;

CREATE TABLE "ApplicationFeeRule" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "countryCode" VARCHAR(2),
  "categoryId" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationFeeRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationFeeRule_amount_nonnegative" CHECK ("amountMinor" >= 0)
);

CREATE TABLE "ApplicationPayment" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  "providerPaymentId" TEXT,
  "providerCheckoutSessionId" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "status" "ApplicationPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "failureCode" VARCHAR(100),
  "failureMessage" VARCHAR(500),
  "refundedAmountMinor" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationPayment_amount_nonnegative" CHECK ("amountMinor" >= 0),
  CONSTRAINT "ApplicationPayment_refund_valid" CHECK ("refundedAmountMinor" >= 0 AND "refundedAmountMinor" <= "amountMinor")
);

CREATE TABLE "ApplicationCreditTransaction" (
  "id" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "type" "CreditTransactionType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "reason" VARCHAR(240) NOT NULL,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationCreditTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationCreditTransaction_balance_nonnegative" CHECK ("balanceAfter" >= 0)
);

CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" VARCHAR(120) NOT NULL,
  "status" "WebhookEventStatus" NOT NULL DEFAULT 'PROCESSING',
  "processedAt" TIMESTAMP(3),
  "errorCode" VARCHAR(100),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentRefund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "providerRefundId" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "reason" "PaymentRefundReason" NOT NULL,
  "note" VARCHAR(500),
  "status" "PaymentRefundStatus" NOT NULL DEFAULT 'PENDING',
  "requestedByAdminId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApplicationAuditLog" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "creatorId" TEXT,
  "businessId" TEXT,
  "applicationId" TEXT,
  "type" VARCHAR(80) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "body" VARCHAR(500) NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApplicationPayment_providerPaymentId_key" ON "ApplicationPayment"("providerPaymentId");
CREATE UNIQUE INDEX "ApplicationPayment_providerCheckoutSessionId_key" ON "ApplicationPayment"("providerCheckoutSessionId");
CREATE UNIQUE INDEX "ApplicationPayment_one_active_attempt_key" ON "ApplicationPayment"("applicationId") WHERE "status" IN ('PENDING', 'PROCESSING');
CREATE UNIQUE INDEX "ApplicationCreditTransaction_creatorId_type_referenceId_key" ON "ApplicationCreditTransaction"("creatorId", "type", "referenceId");
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_providerEventId_key" ON "PaymentWebhookEvent"("provider", "providerEventId");
CREATE UNIQUE INDEX "PaymentRefund_providerRefundId_key" ON "PaymentRefund"("providerRefundId");
CREATE INDEX "Application_campaignId_idx" ON "Application"("campaignId");
CREATE INDEX "Application_creatorId_idx" ON "Application"("creatorId");
CREATE INDEX "Application_status_idx" ON "Application"("status");
CREATE INDEX "Application_submittedAt_idx" ON "Application"("submittedAt");
CREATE INDEX "ApplicationFeeRule_active_priority_idx" ON "ApplicationFeeRule"("active", "priority");
CREATE INDEX "ApplicationFeeRule_countryCode_idx" ON "ApplicationFeeRule"("countryCode");
CREATE INDEX "ApplicationFeeRule_categoryId_idx" ON "ApplicationFeeRule"("categoryId");
CREATE INDEX "ApplicationPayment_applicationId_idx" ON "ApplicationPayment"("applicationId");
CREATE INDEX "ApplicationPayment_status_idx" ON "ApplicationPayment"("status");
CREATE INDEX "ApplicationPayment_creatorId_idx" ON "ApplicationPayment"("creatorId");
CREATE INDEX "ApplicationPayment_campaignId_idx" ON "ApplicationPayment"("campaignId");
CREATE INDEX "ApplicationCreditTransaction_creatorId_createdAt_idx" ON "ApplicationCreditTransaction"("creatorId", "createdAt");
CREATE INDEX "PaymentWebhookEvent_providerEventId_idx" ON "PaymentWebhookEvent"("providerEventId");
CREATE INDEX "PaymentRefund_paymentId_idx" ON "PaymentRefund"("paymentId");
CREATE INDEX "ApplicationAuditLog_applicationId_createdAt_idx" ON "ApplicationAuditLog"("applicationId", "createdAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_applicationId_idx" ON "Notification"("applicationId");

ALTER TABLE "Application" ADD CONSTRAINT "Application_applicationFeeRuleId_fkey" FOREIGN KEY ("applicationFeeRuleId") REFERENCES "ApplicationFeeRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApplicationFeeRule" ADD CONSTRAINT "ApplicationFeeRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApplicationPayment" ADD CONSTRAINT "ApplicationPayment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApplicationPayment" ADD CONSTRAINT "ApplicationPayment_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApplicationCreditTransaction" ADD CONSTRAINT "ApplicationCreditTransaction_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "ApplicationPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApplicationAuditLog" ADD CONSTRAINT "ApplicationAuditLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
