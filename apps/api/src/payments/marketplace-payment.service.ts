/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { ApiException } from "../common/api-error";
import {
  PAYMENT_PROVIDER,
  PaymentProviderAdapter,
  VerifiedWebhook,
} from "../applications/payment.provider";
import {
  FeeSettingsDto,
  OpenPaymentIssueDto,
  RefundCollaborationDto,
  ResolvePaymentIssueDto,
} from "./marketplace-payment.dto";

@Injectable()
export class MarketplacePaymentService {
  constructor(
    private db: PrismaService,
    @Inject(PAYMENT_PROVIDER) private provider: PaymentProviderAdapter,
  ) {}
  private fail(status: HttpStatus, code: string, message: string): never {
    throw new ApiException(status, code, message);
  }
  private payoutStatus(account: {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirementsDue: string[];
  }) {
    return account.payoutsEnabled && account.detailsSubmitted
      ? "ACTIVE"
      : account.requirementsDue.length
        ? "RESTRICTED"
        : "PENDING";
  }
  async feeSettings() {
    const rows = await this.db.platformSetting.findMany({
      where: {
        key: {
          in: [
            "MARKETPLACE_SERVICE_FEE_BPS",
            "MARKETPLACE_SERVICE_FEE_FIXED_MINOR",
            "MARKETPLACE_SERVICE_FEE_POLICY",
          ],
        },
      },
    });
    const values = Object.fromEntries(rows.map((x) => [x.key, x.value]));
    return {
      basisPoints: Number(
        values.MARKETPLACE_SERVICE_FEE_BPS ??
          process.env.MARKETPLACE_SERVICE_FEE_BPS ??
          1000,
      ),
      fixedMinor: Number(
        values.MARKETPLACE_SERVICE_FEE_FIXED_MINOR ??
          process.env.MARKETPLACE_SERVICE_FEE_FIXED_MINOR ??
          0,
      ),
      policy:
        values.MARKETPLACE_SERVICE_FEE_POLICY ??
        process.env.MARKETPLACE_SERVICE_FEE_POLICY ??
        "BUSINESS_PAYS_ON_TOP",
    };
  }
  async updateFeeSettings(dto: FeeSettingsDto) {
    await this.db.$transaction(
      Object.entries({
        MARKETPLACE_SERVICE_FEE_BPS: String(dto.basisPoints),
        MARKETPLACE_SERVICE_FEE_FIXED_MINOR: String(dto.fixedMinor),
        MARKETPLACE_SERVICE_FEE_POLICY: dto.policy ?? "BUSINESS_PAYS_ON_TOP",
      }).map(([key, value]) =>
        this.db.platformSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
    return this.feeSettings();
  }
  private calculate(
    compensation: number,
    settings: { basisPoints: number; fixedMinor: number; policy: string },
  ) {
    const fee =
      Math.floor((compensation * settings.basisPoints + 9999) / 10000) +
      settings.fixedMinor;
    if (settings.policy === "DEDUCT_FROM_CREATOR")
      return {
        grossAmountMinor: compensation,
        platformFeeMinor: fee,
        creatorNetMinor: compensation - fee,
      };
    return {
      grossAmountMinor: compensation + fee,
      platformFeeMinor: fee,
      creatorNetMinor: compensation,
    };
  }
  async payoutAccount(userId: string) {
    const creator = await this.db.creatorProfile.findUnique({
      where: { userId },
      include: { payoutAccount: true },
    });
    if (!creator)
      this.fail(
        HttpStatus.FORBIDDEN,
        "CREATOR_PROFILE_REQUIRED",
        "Creator profile required.",
      );
    return (
      creator.payoutAccount ?? {
        onboardingStatus: "NOT_STARTED",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      }
    );
  }
  async onboard(userId: string) {
    const creator = await this.db.creatorProfile.findUnique({
      where: { userId },
      include: { user: true, payoutAccount: true },
    });
    if (!creator)
      this.fail(
        HttpStatus.FORBIDDEN,
        "CREATOR_PROFILE_REQUIRED",
        "Creator profile required.",
      );
    let row = creator.payoutAccount;
    if (!row) {
      const connected = await this.provider.createConnectedAccount({
        creatorId: creator.id,
        countryCode: creator.country,
        email: creator.user.email,
      });
      row = await this.db.creatorPayoutAccount.create({
        data: {
          creatorId: creator.id,
          providerAccountId: connected.accountId,
          countryCode: connected.countryCode,
          defaultCurrencyCode: connected.defaultCurrencyCode,
          onboardingStatus: this.payoutStatus(connected),
          chargesEnabled: connected.chargesEnabled,
          payoutsEnabled: connected.payoutsEnabled,
          detailsSubmitted: connected.detailsSubmitted,
          requirementsDueJson: connected.requirementsDue,
          lastSyncedAt: new Date(),
        },
      });
    }
    const app = process.env.APP_URL ?? "http://localhost:3000";
    return this.provider.createAccountOnboardingLink(
      row.providerAccountId,
      `${app}/dashboard/creator/payouts?onboarding=returned`,
      `${app}/dashboard/creator/payouts?onboarding=refresh`,
    );
  }
  async syncPayoutAccount(userId: string) {
    const creator = await this.db.creatorProfile.findUnique({
      where: { userId },
      include: { payoutAccount: true },
    });
    if (!creator?.payoutAccount)
      this.fail(
        HttpStatus.NOT_FOUND,
        "PAYOUT_ACCOUNT_NOT_FOUND",
        "Set up payouts first.",
      );
    const connected = await this.provider.retrieveConnectedAccount(
      creator.payoutAccount.providerAccountId,
    );
    return this.db.creatorPayoutAccount.update({
      where: { id: creator.payoutAccount.id },
      data: {
        countryCode: connected.countryCode,
        defaultCurrencyCode: connected.defaultCurrencyCode,
        onboardingStatus: this.payoutStatus(connected),
        chargesEnabled: connected.chargesEnabled,
        payoutsEnabled: connected.payoutsEnabled,
        detailsSubmitted: connected.detailsSubmitted,
        requirementsDueJson: connected.requirementsDue,
        lastSyncedAt: new Date(),
      },
    });
  }
  private async ownedParticipant(userId: string, id: string) {
    const p = await this.db.campaignParticipant.findFirst({
      where: { id, business: { userId } },
      include: {
        campaign: true,
        business: true,
        creator: { include: { user: true, payoutAccount: true } },
        offer: true,
        workItems: true,
        collaborationPayment: {
          include: { transfers: true, refunds: true, issues: true },
        },
      },
    });
    if (!p)
      this.fail(
        HttpStatus.FORBIDDEN,
        "COLLABORATION_PAYMENT_ACCESS_DENIED",
        "Only the Campaign Business can manage this payment.",
      );
    return p;
  }
  async fund(userId: string, participantId: string) {
    const p = await this.ownedParticipant(userId, participantId);
    if (p.status !== "ACTIVE")
      this.fail(
        HttpStatus.CONFLICT,
        "COLLABORATION_NOT_ACTIVE",
        "Only an active collaboration can be funded.",
      );
    const settings = await this.feeSettings(),
      money = this.calculate(p.agreedCompensationMinor, settings);
    const existing = p.collaborationPayment;
    if (existing && !["NOT_FUNDED", "FAILED"].includes(existing.status))
      return existing.status === "PAYMENT_PENDING" &&
        existing.providerCheckoutSessionId
        ? { payment: existing, processing: true }
        : this.fail(
            HttpStatus.CONFLICT,
            "COLLABORATION_ALREADY_FUNDED",
            "This collaboration payment already exists.",
          );
    const payment = await this.db.collaborationPayment.upsert({
      where: { campaignParticipantId: p.id },
      create: {
        campaignParticipantId: p.id,
        campaignId: p.campaignId,
        businessId: p.businessId,
        creatorId: p.creatorId,
        currencyCode: p.currencyCode,
        ...money,
        status: "NOT_FUNDED",
      },
      update: { currencyCode: p.currencyCode, ...money, status: "NOT_FUNDED" },
    });
    const checkout = await this.provider.createCollaborationPayment({
      collaborationPaymentId: payment.id,
      participantId: p.id,
      businessId: p.businessId,
      campaignTitle: p.campaign.title,
      creatorName: p.creator.displayName,
      amountMinor: money.grossAmountMinor,
      currencyCode: p.currencyCode,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    });
    const updated = await this.db.collaborationPayment.update({
      where: { id: payment.id },
      data: {
        providerCheckoutSessionId: checkout.checkoutSessionId,
        providerPaymentIntentId: checkout.paymentId,
        status: "PAYMENT_PENDING",
      },
    });
    await this.audit(p.applicationId, userId, "COLLABORATION_FUNDING_STARTED", {
      paymentId: payment.id,
      grossAmountMinor: money.grossAmountMinor,
      currencyCode: p.currencyCode,
    });
    return { payment: updated, checkoutUrl: checkout.url };
  }
  private async audit(
    applicationId: string,
    actorUserId: string,
    action: string,
    metadata: any,
  ) {
    await this.db.applicationAuditLog.create({
      data: { applicationId, actorUserId, action, metadata },
    });
  }
  private safePayment(x: any) {
    return {
      id: x.id,
      campaignParticipantId: x.campaignParticipantId,
      grossAmountMinor: x.grossAmountMinor,
      platformFeeMinor: x.platformFeeMinor,
      creatorNetMinor: x.creatorNetMinor,
      fundedAmountMinor: x.fundedAmountMinor,
      refundedAmountMinor: x.refundedAmountMinor,
      releasedAmountMinor: x.releasedAmountMinor,
      currencyCode: x.currencyCode,
      status: x.status,
      fundedAt: x.fundedAt,
      eligibleForReleaseAt: x.eligibleForReleaseAt,
      releasedAt: x.releasedAt,
      settledAt: x.settledAt,
      campaign: x.campaign,
      creator: x.creator,
      business: x.business,
      transfers: x.transfers,
      refunds: x.refunds,
    };
  }
  async businessPayments(userId: string) {
    const settings = await this.feeSettings();
    const participants = await this.db.campaignParticipant.findMany({
      where: { business: { userId }, status: { in: ["ACTIVE", "COMPLETED"] } },
      include: {
        campaign: { select: { title: true, slug: true } },
        creator: { select: { displayName: true, slug: true } },
        business: { select: { name: true } },
        collaborationPayment: { include: { transfers: true, refunds: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return participants.map((p) => {
      if (p.collaborationPayment)
        return this.safePayment({
          ...p.collaborationPayment,
          campaign: p.campaign,
          creator: p.creator,
          business: p.business,
        });
      return {
        campaignParticipantId: p.id,
        ...this.calculate(p.agreedCompensationMinor, settings),
        fundedAmountMinor: 0,
        refundedAmountMinor: 0,
        releasedAmountMinor: 0,
        currencyCode: p.currencyCode,
        status: "NOT_FUNDED",
        campaign: p.campaign,
        creator: p.creator,
        business: p.business,
        transfers: [],
        refunds: [],
      };
    });
  }
  async businessPayment(userId: string, id: string) {
    const row = await this.db.collaborationPayment.findFirst({
      where: { id, business: { userId } },
      include: {
        campaign: { select: { title: true, slug: true } },
        creator: { select: { displayName: true, slug: true } },
        business: { select: { name: true } },
        transfers: true,
        refunds: true,
      },
    });
    if (!row)
      this.fail(
        HttpStatus.NOT_FOUND,
        "COLLABORATION_PAYMENT_NOT_FOUND",
        "Payment not found.",
      );
    return this.safePayment(row);
  }
  async creatorEarnings(userId: string) {
    const rows = await this.db.collaborationPayment.findMany({
      where: { creator: { userId } },
      include: {
        campaign: { select: { title: true, slug: true } },
        business: { select: { name: true, slug: true } },
        creator: { select: { displayName: true } },
        transfers: true,
        refunds: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((x) => this.safePayment(x));
  }
  async creatorTransfers(userId: string) {
    return this.db.creatorTransfer.findMany({
      where: { creator: { userId } },
      include: {
        collaborationPayment: {
          select: {
            campaign: { select: { title: true } },
            currencyCode: true,
            creatorNetMinor: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  private async eligible(p: any) {
    const required = p.workItems.filter((x: any) => x.required);
    return (
      p.status === "COMPLETED" &&
      required.length > 0 &&
      required.every((x: any) => x.status === "APPROVED")
    );
  }
  async release(userId: string, id: string) {
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
        const payment = await tx.collaborationPayment.findFirst({
          where: { id, business: { userId } },
          include: {
            campaignParticipant: {
              include: {
                workItems: true,
                creator: { include: { payoutAccount: true } },
              },
            },
            transfers: true,
          },
        });
        if (!payment)
          this.fail(
            HttpStatus.FORBIDDEN,
            "PAYMENT_RELEASE_ACCESS_DENIED",
            "Only the Campaign Business can release this payment.",
          );
        if (
          payment.transfers.length ||
          ["RELEASE_PENDING", "RELEASED", "PAYOUT_PENDING", "SETTLED"].includes(
            payment.status,
          )
        )
          return this.fail(
            HttpStatus.CONFLICT,
            "PAYMENT_ALREADY_RELEASED",
            "Payment release has already started.",
          );
        if (payment.status !== "FUNDED")
          this.fail(
            HttpStatus.CONFLICT,
            "PAYMENT_NOT_FUNDED",
            "Payment must be funded before release.",
          );
        if (!(await this.eligible(payment.campaignParticipant)))
          this.fail(
            HttpStatus.CONFLICT,
            "PAYMENT_NOT_RELEASE_ELIGIBLE",
            "Complete the collaboration and approve all required work first.",
          );
        const account = payment.campaignParticipant.creator.payoutAccount;
        if (!account?.payoutsEnabled || account.onboardingStatus !== "ACTIVE")
          this.fail(
            HttpStatus.CONFLICT,
            "PAYOUT_ACCOUNT_UNAVAILABLE",
            "Creator payout account is not ready.",
          );
        const transfer = await this.provider.createTransfer({
          collaborationPaymentId: payment.id,
          accountId: account.providerAccountId,
          amountMinor: payment.creatorNetMinor,
          currencyCode: payment.currencyCode,
          idempotencyKey: `rivera-release-${payment.id}`,
        });
        const row = await tx.creatorTransfer.create({
          data: {
            collaborationPaymentId: payment.id,
            creatorId: payment.creatorId,
            providerTransferId: transfer.transferId,
            amountMinor: payment.creatorNetMinor,
            currencyCode: payment.currencyCode,
            status: transfer.status === "failed" ? "FAILED" : "PENDING",
            failureCode: transfer.failureCode,
            failureMessage: transfer.failureMessage,
          },
        });
        await tx.collaborationPayment.update({
          where: { id: payment.id },
          data: {
            status: transfer.status === "failed" ? "FUNDED" : "RELEASE_PENDING",
            eligibleForReleaseAt: payment.eligibleForReleaseAt ?? new Date(),
          },
        });
        await tx.applicationAuditLog.create({
          data: {
            applicationId: payment.campaignParticipant.applicationId,
            actorUserId: userId,
            action: "CREATOR_PAYMENT_RELEASE_STARTED",
            metadata: {
              paymentId: payment.id,
              transferId: row.id,
              amountMinor: row.amountMinor,
              currencyCode: row.currencyCode,
            },
          },
        });
        return row;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async openIssue(userId: string, dto: OpenPaymentIssueDto) {
    const p = await this.db.campaignParticipant.findFirst({
      where: {
        id: dto.participantId,
        OR: [{ business: { userId } }, { creator: { userId } }],
      },
      include: { collaborationPayment: true },
    });
    if (!p)
      this.fail(
        HttpStatus.FORBIDDEN,
        "PAYMENT_ISSUE_ACCESS_DENIED",
        "Only collaboration participants can open an issue.",
      );
    const issue = await this.db.paymentIssue.create({
      data: {
        campaignParticipantId: p.id,
        collaborationPaymentId: p.collaborationPayment?.id,
        openedByUserId: userId,
        type: dto.type,
        description: dto.description.trim(),
      },
    });
    await this.audit(p.applicationId, userId, "PAYMENT_ISSUE_OPENED", {
      issueId: issue.id,
      type: issue.type,
    });
    return issue;
  }
  async issue(userId: string, id: string, isAdmin = false) {
    const row = await this.db.paymentIssue.findFirst({
      where: {
        id,
        ...(!isAdmin
          ? {
              campaignParticipant: {
                OR: [{ business: { userId } }, { creator: { userId } }],
              },
            }
          : {}),
      },
    });
    if (!row)
      this.fail(
        HttpStatus.NOT_FOUND,
        "PAYMENT_ISSUE_NOT_FOUND",
        "Payment issue not found.",
      );
    return row;
  }
  async adminRefund(adminId: string, id: string, dto: RefundCollaborationDto) {
    const payment = await this.db.collaborationPayment.findUnique({
      where: { id },
      include: { campaignParticipant: true, refunds: true },
    });
    if (!payment)
      this.fail(
        HttpStatus.NOT_FOUND,
        "COLLABORATION_PAYMENT_NOT_FOUND",
        "Payment not found.",
      );
    if (
      !["FUNDED", "PARTIALLY_REFUNDED"].includes(payment.status) ||
      payment.releasedAmountMinor > 0
    )
      this.fail(
        HttpStatus.CONFLICT,
        "PAYMENT_NOT_REFUNDABLE",
        "Only unreleased funded payments can be refunded.",
      );
    if (payment.refunds.some((refund) => refund.status === "PENDING"))
      this.fail(
        HttpStatus.CONFLICT,
        "REFUND_ALREADY_PENDING",
        "A refund is already awaiting provider confirmation.",
      );
    const available = payment.fundedAmountMinor - payment.refundedAmountMinor;
    if (dto.amountMinor > available)
      this.fail(
        HttpStatus.BAD_REQUEST,
        "REFUND_AMOUNT_EXCEEDS_AVAILABLE",
        "Refund exceeds the remaining funded amount.",
      );
    if (!payment.providerPaymentIntentId)
      this.fail(
        HttpStatus.CONFLICT,
        "PROVIDER_PAYMENT_REFERENCE_MISSING",
        "Provider payment reference is missing.",
      );
    const draft = await this.db.collaborationRefund.create({
      data: {
        collaborationPaymentId: id,
        amountMinor: dto.amountMinor,
        currencyCode: payment.currencyCode,
        reason: dto.reason.trim(),
        approvedByAdminId: adminId,
        requestedByUserId: adminId,
      },
    });
    try {
      const result = await this.provider.refund(
        payment.providerPaymentIntentId,
        dto.amountMinor,
        `rivera-collaboration-refund-${draft.id}`,
      );
      if (result.status === "failed") {
        await this.db.collaborationRefund.update({
          where: { id: draft.id },
          data: { providerRefundId: result.refundId, status: "FAILED" },
        });
        return this.fail(
          HttpStatus.BAD_GATEWAY,
          "PROVIDER_REFUND_FAILED",
          "Provider rejected the refund.",
        );
      }
      await this.db.collaborationRefund.update({
        where: { id: draft.id },
        data: { providerRefundId: result.refundId, status: "PENDING" },
      });
      if (result.status === "succeeded")
        await this.completeRefund(draft.id, result.refundId);
      await this.db.applicationAuditLog.create({
        data: {
          applicationId: payment.campaignParticipant.applicationId,
          actorUserId: adminId,
          action: "COLLABORATION_REFUND_CREATED",
          metadata: {
            paymentId: id,
            refundId: draft.id,
            amountMinor: dto.amountMinor,
            providerStatus: result.status,
          },
        },
      });
      return {
        ...draft,
        providerRefundId: result.refundId,
        status: result.status,
      };
    } catch (error) {
      await this.db.collaborationRefund.update({
        where: { id: draft.id },
        data: { status: "FAILED" },
      });
      throw error;
    }
  }
  async adminPayments() {
    const items = await this.db.collaborationPayment.findMany({
      include: {
        campaign: { select: { title: true } },
        creator: { select: { displayName: true } },
        business: { select: { name: true } },
        transfers: true,
        refunds: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    const totals = Object.values(
      items.reduce((a: any, x: any) => {
        a[x.currencyCode] ??= {
          currencyCode: x.currencyCode,
          fundedMinor: 0,
          releasedMinor: 0,
          refundedMinor: 0,
        };
        a[x.currencyCode].fundedMinor += x.fundedAmountMinor;
        a[x.currencyCode].releasedMinor += x.releasedAmountMinor;
        a[x.currencyCode].refundedMinor += x.refundedAmountMinor;
        return a;
      }, {}),
    );
    return { items, totals };
  }
  async adminTransfers() {
    return this.db.creatorTransfer.findMany({
      include: {
        creator: { select: { displayName: true } },
        collaborationPayment: {
          select: { campaign: { select: { title: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async adminRefunds() {
    return this.db.collaborationRefund.findMany({
      include: {
        collaborationPayment: {
          select: { campaign: { select: { title: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async adminIssues() {
    return this.db.paymentIssue.findMany({
      include: {
        campaignParticipant: {
          select: {
            campaign: { select: { title: true } },
            creator: { select: { displayName: true } },
            business: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async resolveIssue(adminId: string, id: string, dto: ResolvePaymentIssueDto) {
    const issue = await this.db.paymentIssue.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote.trim(),
        resolvedAt: ["RESOLVED", "CLOSED"].includes(dto.status)
          ? new Date()
          : null,
      },
      include: { campaignParticipant: true },
    });
    await this.audit(
      issue.campaignParticipant.applicationId,
      adminId,
      "PAYMENT_ISSUE_UPDATED",
      { issueId: id, status: dto.status },
    );
    return issue;
  }
  async adminPayoutAccounts() {
    return this.db.creatorPayoutAccount.findMany({
      include: { creator: { select: { displayName: true, slug: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }
  async reconcilePayoutAccount(id: string) {
    const account = await this.db.creatorPayoutAccount.findUnique({
      where: { id },
    });
    if (!account)
      this.fail(
        HttpStatus.NOT_FOUND,
        "PAYOUT_ACCOUNT_NOT_FOUND",
        "Creator payout account not found.",
      );
    const connected = await this.provider.retrieveConnectedAccount(
      account.providerAccountId,
    );
    return this.db.creatorPayoutAccount.update({
      where: { id },
      data: {
        countryCode: connected.countryCode,
        defaultCurrencyCode: connected.defaultCurrencyCode,
        onboardingStatus: this.payoutStatus(connected),
        chargesEnabled: connected.chargesEnabled,
        payoutsEnabled: connected.payoutsEnabled,
        detailsSubmitted: connected.detailsSubmitted,
        requirementsDueJson: connected.requirementsDue,
        lastSyncedAt: new Date(),
      },
    });
  }
  async reconcile(id: string) {
    const payment = await this.db.collaborationPayment.findUnique({
      where: { id },
      include: { transfers: true, refunds: true, campaignParticipant: true },
    });
    if (!payment)
      this.fail(
        HttpStatus.NOT_FOUND,
        "COLLABORATION_PAYMENT_NOT_FOUND",
        "Payment not found.",
      );
    if (payment.status === "PAYMENT_PENDING") {
      const state = await this.provider.retrievePayment({
        paymentId: payment.providerPaymentIntentId,
        checkoutSessionId: payment.providerCheckoutSessionId,
      });
      if (state.status === "paid")
        await this.confirmFunding(
          payment.id,
          state.amountMinor,
          state.currencyCode,
          state.paymentId,
        );
      else if (state.status === "failed")
        await this.db.collaborationPayment.update({
          where: { id },
          data: { status: "FAILED" },
        });
    }
    for (const transfer of payment.transfers.filter(
      (x) => x.status === "PENDING",
    )) {
      const state = await this.provider.retrieveTransfer(
        transfer.providerTransferId,
      );
      await this.applyTransferState(
        transfer.id,
        state.status,
        state.failureCode,
        state.failureMessage,
      );
    }
    for (const refund of payment.refunds.filter(
      (x) => x.status === "PENDING" && x.providerRefundId,
    )) {
      const state = await this.provider.retrieveRefund(
        refund.providerRefundId!,
      );
      if (state.status === "succeeded")
        await this.completeRefund(refund.id, state.refundId);
      else if (state.status === "failed")
        await this.db.collaborationRefund.update({
          where: { id: refund.id },
          data: { status: "FAILED" },
        });
    }
    return this.db.collaborationPayment.findUnique({
      where: { id },
      include: { transfers: true, refunds: true },
    });
  }
  private async confirmFunding(
    id: string,
    amount: number,
    currency: string,
    paymentIntentId?: string,
  ) {
    const payment = await this.db.collaborationPayment.findUnique({
      where: { id },
      include: {
        campaignParticipant: {
          include: {
            creator: { include: { user: true } },
            business: { include: { user: true } },
          },
        },
      },
    });
    if (!payment) return;
    if (payment.status === "FUNDED") return;
    if (
      amount !== payment.grossAmountMinor ||
      currency.toUpperCase() !== payment.currencyCode
    )
      this.fail(
        HttpStatus.CONFLICT,
        amount !== payment.grossAmountMinor
          ? "PAYMENT_AMOUNT_MISMATCH"
          : "PAYMENT_CURRENCY_MISMATCH",
        "Provider payment does not match the expected amount and currency.",
      );
    const now = new Date();
    await this.db.$transaction([
      this.db.collaborationPayment.update({
        where: { id },
        data: {
          status: "FUNDED",
          fundedAmountMinor: amount,
          fundedAt: now,
          providerPaymentIntentId:
            paymentIntentId ?? payment.providerPaymentIntentId,
        },
      }),
      this.db.notification.create({
        data: {
          userId: payment.campaignParticipant.creator.userId,
          creatorId: payment.creatorId,
          applicationId: payment.campaignParticipant.applicationId,
          type: "COLLABORATION_FUNDED",
          title: "Collaboration funded",
          body: "The collaboration is funded and pending release after approved completion.",
        },
      }),
      this.db.notification.create({
        data: {
          userId: payment.campaignParticipant.business.userId,
          businessId: payment.businessId,
          applicationId: payment.campaignParticipant.applicationId,
          type: "COLLABORATION_FUNDED",
          title: "Collaboration funded",
          body: "Funding is confirmed. Release remains pending until the collaboration is completed.",
        },
      }),
    ]);
  }
  private async applyTransferState(
    id: string,
    status: "pending" | "succeeded" | "failed",
    failureCode?: string,
    failureMessage?: string,
  ) {
    const transfer = await this.db.creatorTransfer.findUnique({
      where: { id },
    });
    if (!transfer) return;
    if (status === "pending") return;
    const succeeded = status === "succeeded";
    await this.db.$transaction([
      this.db.creatorTransfer.update({
        where: { id },
        data: {
          status: succeeded ? "SUCCEEDED" : "FAILED",
          failureCode,
          failureMessage,
          releasedAt: succeeded ? new Date() : null,
          settledAt: succeeded ? new Date() : null,
        },
      }),
      this.db.collaborationPayment.update({
        where: { id: transfer.collaborationPaymentId },
        data: succeeded
          ? {
              status: "SETTLED",
              releasedAmountMinor: transfer.amountMinor,
              releasedAt: new Date(),
              settledAt: new Date(),
            }
          : { status: "FUNDED" },
      }),
    ]);
  }
  private async completeRefund(id: string, providerRefundId?: string) {
    const refund = await this.db.collaborationRefund.findUnique({
      where: { id },
      include: { collaborationPayment: true },
    });
    if (!refund || refund.status === "SUCCEEDED") return;
    const refunded =
      refund.collaborationPayment.refundedAmountMinor + refund.amountMinor;
    if (refunded > refund.collaborationPayment.fundedAmountMinor)
      this.fail(
        HttpStatus.CONFLICT,
        "REFUND_AMOUNT_EXCEEDS_AVAILABLE",
        "Confirmed refunds exceed the funded payment amount.",
      );
    await this.db.$transaction([
      this.db.collaborationRefund.update({
        where: { id },
        data: {
          providerRefundId: providerRefundId ?? refund.providerRefundId,
          status: "SUCCEEDED",
          completedAt: new Date(),
        },
      }),
      this.db.collaborationPayment.update({
        where: { id: refund.collaborationPaymentId },
        data: {
          refundedAmountMinor: refunded,
          status:
            refunded === refund.collaborationPayment.fundedAmountMinor
              ? "REFUNDED"
              : "PARTIALLY_REFUNDED",
        },
      }),
    ]);
  }
  async processWebhook(event: VerifiedWebhook) {
    const o = event.object,
      metadata = (o.metadata ?? {}) as Record<string, unknown>;
    if (event.type === "account.updated" && typeof o.id === "string") {
      const connected = {
        accountId: String(o.id),
        countryCode: String(o.country ?? "").toUpperCase(),
        defaultCurrencyCode:
          typeof o.default_currency === "string"
            ? String(o.default_currency).toUpperCase()
            : undefined,
        chargesEnabled: Boolean(o.charges_enabled),
        payoutsEnabled: Boolean(o.payouts_enabled),
        detailsSubmitted: Boolean(o.details_submitted),
        requirementsDue: Array.isArray((o.requirements as any)?.currently_due)
          ? (o.requirements as any).currently_due.map(String)
          : [],
      };
      await this.db.creatorPayoutAccount.updateMany({
        where: { providerAccountId: connected.accountId },
        data: {
          countryCode: connected.countryCode,
          defaultCurrencyCode: connected.defaultCurrencyCode,
          onboardingStatus: this.payoutStatus(connected),
          chargesEnabled: connected.chargesEnabled,
          payoutsEnabled: connected.payoutsEnabled,
          detailsSubmitted: connected.detailsSubmitted,
          requirementsDueJson: connected.requirementsDue,
          lastSyncedAt: new Date(),
        },
      });
      return true;
    }
    let id =
      typeof metadata.collaborationPaymentId === "string"
        ? metadata.collaborationPaymentId
        : undefined;
    if (!id && typeof o.payment_intent === "string")
      id = (
        await this.db.collaborationPayment.findUnique({
          where: { providerPaymentIntentId: o.payment_intent },
          select: { id: true },
        })
      )?.id;
    if (!id && typeof o.id === "string")
      id = (
        await this.db.collaborationPayment.findFirst({
          where: {
            OR: [
              { providerPaymentIntentId: o.id },
              { providerCheckoutSessionId: o.id },
            ],
          },
          select: { id: true },
        })
      )?.id;
    if (
      (event.type === "checkout.session.completed" ||
        event.type === "payment_intent.succeeded") &&
      id
    ) {
      await this.confirmFunding(
        id,
        Number(o.amount_total ?? o.amount_received ?? o.amount),
        String(o.currency).toUpperCase(),
        typeof o.payment_intent === "string"
          ? o.payment_intent
          : typeof o.id === "string" &&
              event.type === "payment_intent.succeeded"
            ? o.id
            : undefined,
      );
      return true;
    }
    if (
      (event.type === "checkout.session.expired" ||
        event.type === "payment_intent.payment_failed") &&
      id
    ) {
      await this.db.collaborationPayment.update({
        where: { id },
        data: { status: "FAILED" },
      });
      return true;
    }
    if (event.type === "refund.updated" && typeof o.id === "string") {
      const refund = await this.db.collaborationRefund.findUnique({
        where: { providerRefundId: o.id },
      });
      if (refund) {
        if (o.status === "succeeded")
          await this.completeRefund(refund.id, o.id);
        else if (o.status === "failed" || o.status === "canceled")
          await this.db.collaborationRefund.update({
            where: { id: refund.id },
            data: { status: "FAILED" },
          });
        return true;
      }
    }
    if (event.type.startsWith("transfer.") && typeof o.id === "string") {
      const transfer = await this.db.creatorTransfer.findUnique({
        where: { providerTransferId: o.id },
      });
      if (transfer) {
        await this.applyTransferState(
          transfer.id,
          event.type === "transfer.failed"
            ? "failed"
            : event.type === "transfer.created"
              ? "pending"
              : "succeeded",
          String((o.failure_code ?? "") || undefined),
          String((o.failure_message ?? "") || undefined),
        );
        return true;
      }
    }
    if (event.type.startsWith("charge.dispute.") && typeof o.id === "string") {
      const paymentIntent =
        typeof o.payment_intent === "string" ? o.payment_intent : undefined;
      const payment = paymentIntent
        ? await this.db.collaborationPayment.findUnique({
            where: { providerPaymentIntentId: paymentIntent },
            include: { campaignParticipant: true },
          })
        : null;
      if (payment) {
        const business = await this.db.businessProfile.findUniqueOrThrow({
          where: { id: payment.businessId },
          select: { userId: true },
        });
        await this.db.paymentIssue.upsert({
          where: { providerDisputeId: o.id },
          create: {
            campaignParticipantId: payment.campaignParticipantId,
            collaborationPaymentId: payment.id,
            openedByUserId: business.userId,
            type: "PROVIDER_DISPUTE",
            description:
              "Stripe reported a charge dispute. Admin review is required.",
            providerDisputeId: o.id,
          },
          update: { status: "UNDER_REVIEW" },
        });
      }
      return true;
    }
    return false;
  }
}
