import {
  ConflictException,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Observable, tap } from "rxjs";
import { ErrorMonitor, RiveraRequest } from "../common/observability";
import { PrismaService } from "../common/prisma.service";
import { MarketplacePaymentService } from "../payments/marketplace-payment.service";
import {
  CreateDataRequestDto,
  CreateSafetyReportDto,
  ModerateSafetyReportDto,
  ModerateUserDto,
  PreferenceDto,
  UpdateDataRequestDto,
} from "./operations.dto";

const categories = [
  "ACCOUNT",
  "CAMPAIGNS",
  "APPLICATIONS",
  "MESSAGES",
  "OFFERS",
  "COLLABORATIONS",
  "PAYMENTS",
  "REVIEWS",
  "MARKETING",
] as const;
const critical = new Set(["ACCOUNT", "PAYMENTS"]);

@Injectable()
export class OperationsService {
  constructor(private readonly db: PrismaService) {}

  async readiness() {
    const checks: Record<string, { status: string; detail?: string }> = {};
    try {
      await this.db.$queryRaw`SELECT 1`;
      checks.postgres = { status: "ok" };
    } catch {
      checks.postgres = { status: "failed" };
    }
    checks.mail = {
      status:
        process.env.MAIL_PROVIDER === "smtp" && process.env.SMTP_HOST
          ? "ok"
          : "degraded",
      detail:
        process.env.MAIL_PROVIDER === "smtp"
          ? undefined
          : "Transactional mail is not configured.",
    };
    checks.storage = {
      status:
        process.env.NODE_ENV === "production" &&
        process.env.STORAGE_PROVIDER === "local"
          ? "failed"
          : "ok",
    };
    checks.payments = {
      status:
        process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET
          ? "ok"
          : "degraded",
      detail: process.env.STRIPE_SECRET_KEY
        ? undefined
        : "Stripe operations are disabled until configured.",
    };
    const notReady = Object.values(checks).some((x) => x.status === "failed");
    const degraded = Object.values(checks).some((x) => x.status === "degraded");
    const body = {
      status: notReady ? "not_ready" : degraded ? "degraded" : "ready",
      service: "rivera-api",
      checks,
    };
    if (notReady) throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    return body;
  }

  async preferences(userId: string) {
    const stored = await this.db.notificationPreference.findMany({
      where: { userId },
    });
    return categories.map((category) => {
      const row = stored.find((x) => x.category === category);
      return {
        category,
        emailEnabled: critical.has(category)
          ? true
          : (row?.emailEnabled ?? category !== "MARKETING"),
        inAppEnabled: critical.has(category)
          ? true
          : (row?.inAppEnabled ?? true),
        critical: critical.has(category),
      };
    });
  }

  async updatePreference(userId: string, dto: PreferenceDto) {
    const forced = critical.has(dto.category);
    return this.db.notificationPreference.upsert({
      where: { userId_category: { userId, category: dto.category } },
      create: {
        userId,
        category: dto.category,
        emailEnabled: forced ? true : dto.emailEnabled,
        inAppEnabled: forced ? true : dto.inAppEnabled,
      },
      update: {
        emailEnabled: forced ? true : dto.emailEnabled,
        inAppEnabled: forced ? true : dto.inAppEnabled,
      },
    });
  }

  private async validateReportSubject(
    userId: string,
    dto: CreateSafetyReportDto,
  ) {
    if (dto.type === "USER") {
      if (dto.subjectId === userId)
        throw new ConflictException("You cannot report your own account.");
      return this.db.user.findFirst({
        where: { id: dto.subjectId, deletedAt: null },
        select: { id: true },
      });
    }
    if (dto.type === "CAMPAIGN")
      return this.db.campaign.findUnique({
        where: { id: dto.subjectId },
        select: { id: true },
      });
    if (dto.type === "REVIEW")
      return this.db.review.findUnique({
        where: { id: dto.subjectId },
        select: { id: true },
      });
    if (dto.type === "MESSAGE")
      return this.db.message.findFirst({
        where: {
          id: dto.subjectId,
          conversation: { participants: { some: { userId } } },
        },
        select: { id: true },
      });
    return this.db.collaborationPayment.findFirst({
      where: {
        id: dto.subjectId,
        campaignParticipant: {
          OR: [{ creator: { userId } }, { business: { userId } }],
        },
      },
      select: { id: true },
    });
  }

  async report(userId: string, dto: CreateSafetyReportDto) {
    if (!(await this.validateReportSubject(userId, dto)))
      throw new NotFoundException("Report target not found or inaccessible.");
    try {
      return await this.db.safetyReport.create({
        data: {
          reporterId: userId,
          type: dto.type,
          subjectId: dto.subjectId,
          reason: dto.reason.trim(),
        },
        select: { id: true, type: true, status: true, createdAt: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("You already reported this item.");
      throw error;
    }
  }

  reports() {
    return this.db.safetyReport.findMany({
      include: {
        reporter: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async moderateReport(
    adminId: string,
    id: string,
    dto: ModerateSafetyReportDto,
  ) {
    const report = await this.db.safetyReport.update({
      where: { id },
      data: {
        status: dto.status,
        privateAdminNote: dto.privateAdminNote?.trim(),
        reviewedById: adminId,
        resolvedAt: ["RESOLVED", "DISMISSED"].includes(dto.status)
          ? new Date()
          : null,
      },
    });
    await this.audit(adminId, "SAFETY_REPORT_UPDATED", "SafetyReport", id, {
      status: dto.status,
    });
    return report;
  }

  async supportSearch(term: string) {
    const q = term.trim();
    if (q.length < 3)
      return {
        users: [],
        campaigns: [],
        applications: [],
        collaborations: [],
        payments: [],
      };
    const [users, campaigns, applications, collaborations, payments] =
      await Promise.all([
        this.db.user.findMany({
          where: {
            OR: [{ id: q }, { email: { contains: q, mode: "insensitive" } }],
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            emailVerifiedAt: true,
          },
          take: 20,
        }),
        this.db.campaign.findMany({
          where: { id: q },
          select: { id: true, title: true, status: true, businessId: true },
          take: 5,
        }),
        this.db.campaignApplication.findMany({
          where: { id: q },
          select: { id: true, status: true, campaignId: true, creatorId: true },
          take: 5,
        }),
        this.db.campaignParticipant.findMany({
          where: { id: q },
          select: {
            id: true,
            status: true,
            campaignId: true,
            creatorId: true,
            businessId: true,
          },
          take: 5,
        }),
        this.db.collaborationPayment.findMany({
          where: {
            OR: [
              { id: q },
              { providerPaymentIntentId: q },
              { providerCheckoutSessionId: q },
            ],
          },
          select: {
            id: true,
            status: true,
            currencyCode: true,
            grossAmountMinor: true,
            providerPaymentIntentId: true,
            campaignParticipantId: true,
          },
          take: 10,
        }),
      ]);
    return { users, campaigns, applications, collaborations, payments };
  }

  async moderateUser(adminId: string, id: string, dto: ModerateUserDto) {
    const user = await this.db.user.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, email: true, status: true },
    });
    await this.audit(adminId, "USER_STATUS_CHANGED", "User", id, {
      status: dto.status,
      reason: dto.reason.trim(),
    });
    return user;
  }

  async analytics() {
    const since = new Date(Date.now() - 30 * 86400_000);
    const [
      newUsers,
      activeCreators,
      activeBusinesses,
      campaignsPublished,
      applicationsSubmitted,
      shortlisted,
      offers,
      acceptedOffers,
      completed,
      appRevenue,
      marketRevenue,
      refunds,
    ] = await Promise.all([
      this.db.user.count({ where: { createdAt: { gte: since } } }),
      this.db.creatorProfile.count({
        where: { user: { lastLoginAt: { gte: since }, deletedAt: null } },
      }),
      this.db.businessProfile.count({
        where: { user: { lastLoginAt: { gte: since }, deletedAt: null } },
      }),
      this.db.campaign.count({ where: { publishedAt: { gte: since } } }),
      this.db.campaignApplication.count({
        where: { submittedAt: { gte: since } },
      }),
      this.db.campaignApplication.count({
        where: {
          status: { in: ["SHORTLISTED", "OFFERED", "ACCEPTED"] },
          submittedAt: { gte: since },
        },
      }),
      this.db.collaborationOffer.count({
        where: { createdAt: { gte: since } },
      }),
      this.db.collaborationOffer.count({
        where: { status: "ACCEPTED", createdAt: { gte: since } },
      }),
      this.db.campaignParticipant.count({
        where: { status: "COMPLETED", completedAt: { gte: since } },
      }),
      this.db.applicationPayment.groupBy({
        by: ["currencyCode"],
        where: { status: "PAID", paidAt: { gte: since } },
        _sum: { amountMinor: true },
      }),
      this.db.collaborationPayment.groupBy({
        by: ["currencyCode"],
        where: {
          fundedAt: { gte: since },
          status: { notIn: ["PAYMENT_PENDING", "FAILED", "CANCELLED"] },
        },
        _sum: { platformFeeMinor: true },
      }),
      this.db.collaborationRefund.groupBy({
        by: ["currencyCode"],
        where: { status: "SUCCEEDED", completedAt: { gte: since } },
        _sum: { amountMinor: true },
      }),
    ]);
    return {
      periodDays: 30,
      newUsers,
      activeCreators,
      activeBusinesses,
      campaignsPublished,
      applicationsSubmitted,
      averageApplicationsPerCampaign: campaignsPublished
        ? Number((applicationsSubmitted / campaignsPublished).toFixed(2))
        : 0,
      shortlistRate: applicationsSubmitted
        ? Number((shortlisted / applicationsSubmitted).toFixed(4))
        : 0,
      offerAcceptanceRate: offers
        ? Number((acceptedOffers / offers).toFixed(4))
        : 0,
      completedCollaborations: completed,
      applicationFeeRevenueByCurrency: appRevenue,
      marketplaceFeeRevenueByCurrency: marketRevenue,
      refundTotalsByCurrency: refunds,
    };
  }

  dataRequests(userId: string) {
    return this.db.dataLifecycleRequest.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        status: true,
        requestedAt: true,
        completedAt: true,
      },
      orderBy: { requestedAt: "desc" },
    });
  }

  async createDataRequest(userId: string, dto: CreateDataRequestDto) {
    const existing = await this.db.dataLifecycleRequest.findFirst({
      where: {
        userId,
        type: dto.type,
        status: { in: ["REQUESTED", "IN_PROGRESS"] },
      },
    });
    if (existing)
      throw new ConflictException("A matching request is already open.");
    return this.db.dataLifecycleRequest.create({
      data: { userId, type: dto.type },
      select: { id: true, type: true, status: true, requestedAt: true },
    });
  }

  adminDataRequests() {
    return this.db.dataLifecycleRequest.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { requestedAt: "desc" },
      take: 100,
    });
  }

  async updateDataRequest(
    adminId: string,
    id: string,
    dto: UpdateDataRequestDto,
  ) {
    const row = await this.db.dataLifecycleRequest.update({
      where: { id },
      data: {
        status: dto.status,
        privateNote: dto.privateNote?.trim(),
        completedAt: dto.status === "COMPLETED" ? new Date() : null,
      },
    });
    await this.audit(
      adminId,
      "DATA_REQUEST_UPDATED",
      "DataLifecycleRequest",
      id,
      { status: dto.status },
    );
    return row;
  }

  private audit(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.db.adminAuditLog.create({
      data: { actorId, action, targetType, targetId, metadata },
    });
  }
}

const eventRoutes: Array<[RegExp, string]> = [
  [/^POST .*\/auth\/register$/, "SIGNUP"],
  [/^POST .*\/campaigns\/[^/]+\/publish$/, "CAMPAIGN_PUBLISHED"],
  [/^POST .*\/applications\/[^/]+\/submit$/, "APPLICATION_SUBMITTED"],
  [/^POST .*\/offers\/[^/]+\/accept$/, "OFFER_ACCEPTED"],
  [/^POST .*\/payment$/, "COLLABORATION_FUNDING_STARTED"],
  [/^POST .*\/release$/, "PAYMENT_RELEASED"],
  [/^POST .*\/reviews$/, "REVIEW_CREATED"],
];

@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  constructor(private readonly db: PrismaService) {}
  intercept(
    context: ExecutionContext,
    next: { handle(): Observable<unknown> },
  ) {
    const req = context.switchToHttp().getRequest<RiveraRequest>();
    const key = `${req.method} ${req.originalUrl.split("?")[0]}`;
    const event = eventRoutes.find(([pattern]) => pattern.test(key))?.[1];
    return next.handle().pipe(
      tap(() => {
        if (event)
          void this.db.analyticsEvent
            .create({
              data: { event, userId: req.user?.id, requestId: req.requestId },
            })
            .catch(() => undefined);
      }),
    );
  }
}

@Injectable()
export class ReconciliationScheduler implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(
    private readonly db: PrismaService,
    private readonly payments: MarketplacePaymentService,
    private readonly monitor: ErrorMonitor,
  ) {}
  onModuleInit() {
    if (process.env.JOBS_ENABLED !== "true") return;
    const seconds = Math.max(
      60,
      Number(process.env.RECONCILIATION_INTERVAL_SECONDS ?? 300),
    );
    this.timer = setInterval(
      () =>
        void this.run().catch((error: unknown) =>
          this.monitor.capture(error, {
            jobName: "PAYMENT_RECONCILIATION",
            errorCode: "RECONCILIATION_JOB_FAILED",
          }),
        ),
      seconds * 1000,
    );
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async run() {
    const scheduledFor = new Date(Math.floor(Date.now() / 60000) * 60000);
    try {
      const job = await this.db.operationalJobRun.create({
        data: { jobName: "PAYMENT_RECONCILIATION", scheduledFor },
      });
      const pending = await this.db.collaborationPayment.findMany({
        where: { status: { in: ["PAYMENT_PENDING", "RELEASE_PENDING"] } },
        select: { id: true },
        orderBy: { updatedAt: "asc" },
        take: 25,
      });
      let failed = 0;
      for (const item of pending)
        try {
          await this.payments.reconcile(item.id);
        } catch {
          failed += 1;
        }
      await this.db.operationalJobRun.update({
        where: { id: job.id },
        data: {
          status: failed ? "FAILED" : "SUCCEEDED",
          processed: pending.length,
          failed,
          finishedAt: new Date(),
          errorCode: failed ? "ITEM_FAILURES" : null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return;
      throw error;
    }
  }
}
