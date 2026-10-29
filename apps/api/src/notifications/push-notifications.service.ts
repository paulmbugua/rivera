import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { NotificationCategory } from "@prisma/client";
import { cert, getApps, initializeApp, ServiceAccount } from "firebase-admin/app";
import { BatchResponse, getMessaging } from "firebase-admin/messaging";
import { readFileSync } from "node:fs";
import { PrismaService } from "../common/prisma.service";
import { MailService } from "../auth/mail.service";
import { RegisterPushTokenDto } from "./push-notifications.dto";

const retryDelayMs = 5 * 60_000;
const recentWindowMs = 48 * 60 * 60_000;
const providerCircuitDelayMs = 30 * 60_000;
const invalidTokenCodes = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

export function categoryFor(type: string): NotificationCategory {
  const value = type.toUpperCase();
  if (value.includes("MESSAGE") || value.includes("CONVERSATION")) return "MESSAGES";
  if (value.includes("OFFER")) return "OFFERS";
  if (/PAYMENT|FUND|TRANSFER|PAYOUT|REFUND|EARNING|CREDIT/.test(value)) return "PAYMENTS";
  if (value.includes("REVIEW")) return "REVIEWS";
  if (/DELIVERABLE|REVISION|COLLABORATION|PARTICIPANT/.test(value)) return "COLLABORATIONS";
  if (/APPLICATION|PROPOSAL|SHORTLIST/.test(value)) return "APPLICATIONS";
  if (value.includes("CAMPAIGN")) return "CAMPAIGNS";
  if (value.includes("MARKETING")) return "MARKETING";
  return "ACCOUNT";
}

function routeFor(type: string, roles: string[]) {
  const value = type.toUpperCase();
  const admin = roles.includes("ADMIN");
  const business = roles.includes("BUSINESS");
  const role = business ? "business" : "creator";
  if (value.startsWith("PAYOUT_") && admin) return "/admin/transfers";
  if (value.startsWith("WISE_"))
    return admin
      ? "/admin/wise-payouts"
      : business
        ? "/dashboard/business/payments"
        : "/dashboard/creator/payouts";
  if (value.includes("MESSAGE")) return `/dashboard/${role}/messages`;
  if (/PAYMENT|FUND|TRANSFER|PAYOUT|REFUND|EARNING|CREDIT/.test(value))
    return admin
      ? "/admin/collaboration-payments"
      : business
        ? "/dashboard/business/payments"
        : "/dashboard/creator/earnings";
  if (value.includes("OFFER"))
    return business
      ? "/dashboard/business/campaigns"
      : "/dashboard/creator/offers";
  if (/COLLAB|DELIVERABLE|REVISION|PARTICIPANT/.test(value))
    return business
      ? "/dashboard/business/campaigns"
      : "/dashboard/creator/collaborations";
  if (/APPLICATION|PROPOSAL|SHORTLIST/.test(value))
    return business
      ? "/dashboard/business/campaigns"
      : "/dashboard/creator/applications";
  if (value.includes("CAMPAIGN"))
    return business
      ? "/dashboard/business/campaigns"
      : "/dashboard/creator/opportunities";
  return admin ? "/admin" : `/dashboard/${role}`;
}

@Injectable()
export class PushNotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushNotificationsService.name);
  private timer?: NodeJS.Timeout;
  private configured = false;
  private dispatching = false;
  private emailPausedUntil = 0;

  constructor(
    private readonly db: PrismaService,
    private readonly mail: MailService,
  ) {}

  onModuleInit() {
    const pushEnabled = process.env.PUSH_NOTIFICATIONS_ENABLED !== "false";
    const emailEnabled = process.env.EMAIL_NOTIFICATIONS_ENABLED !== "false";
    this.configured = pushEnabled && this.initializeFirebase();
    if (pushEnabled && !this.configured) {
      this.logger.warn(
        "Push delivery is unavailable until Firebase Admin credentials are configured",
      );
    }
    if (!pushEnabled) this.logger.log("Push delivery is disabled by configuration");
    if (!emailEnabled) this.logger.log("Notification email delivery is disabled by configuration");
    if (!this.configured && !emailEnabled) return;
    const interval = Math.max(
      5_000,
      Number(process.env.PUSH_DISPATCH_INTERVAL_MS ?? 15_000),
    );
    this.timer = setInterval(() => void this.dispatchPending(), interval);
    this.timer.unref();
    setTimeout(() => void this.dispatchPending(), 2_000).unref();
    this.logger.log(
      `Notification delivery enabled (${interval}ms dispatcher; push=${this.configured}; email=${emailEnabled})`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private initializeFirebase() {
    if (getApps().length) return true;
    try {
      const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
      const encoded =
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
        (credentialPath ? readFileSync(credentialPath, "utf8") : undefined);
      const serviceAccount = encoded
        ? (JSON.parse(encoded) as ServiceAccount)
        : process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY
          ? ({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            } satisfies ServiceAccount)
          : null;
      if (!serviceAccount) return false;
      initializeApp({ credential: cert(serviceAccount) });
      return true;
    } catch (error) {
      this.logger.error(
        `Firebase Admin initialization failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      return false;
    }
  }

  async registerDevice(userId: string, dto: RegisterPushTokenDto) {
    const token = dto.token.trim();
    const device = await this.db.pushDeviceToken.upsert({
      where: { token },
      create: {
        userId,
        token,
        platform: dto.platform,
        deviceName: dto.deviceName?.trim(),
      },
      update: {
        userId,
        platform: dto.platform,
        deviceName: dto.deviceName?.trim(),
        enabled: true,
        lastSeenAt: new Date(),
      },
      select: { id: true, platform: true, enabled: true, lastSeenAt: true },
    });
    return { ...device, pushConfigured: this.configured };
  }

  async removeDevice(userId: string, token: string) {
    await this.db.pushDeviceToken.deleteMany({
      where: { userId, token: token.trim() },
    });
    return { success: true };
  }

  private async dispatchPending() {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      const now = new Date();
      const retryBefore = new Date(now.getTime() - retryDelayMs);
      const recentAfter = new Date(now.getTime() - recentWindowMs);
      const pending = this.configured ? await this.db.notification.findMany({
        where: {
          createdAt: { gte: recentAfter },
          pushDeliveredAt: null,
          pushAttemptCount: { lt: 3 },
          OR: [
            { pushAttemptedAt: null },
            { pushAttemptedAt: { lt: retryBefore } },
          ],
          user: { pushTokens: { some: { enabled: true } } },
        },
        include: {
          user: {
            select: {
              pushTokens: {
                where: { enabled: true },
                select: { token: true },
              },
              notificationPreferences: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      }) : [];

      for (const notification of pending) {
        const category = categoryFor(notification.type);
        const preference = notification.user.notificationPreferences.find(
          (item) => item.category === category,
        );
        const pushEnabled =
          category === "ACCOUNT" ||
          category === "PAYMENTS" ||
          (preference?.pushEnabled ?? category !== "MARKETING");
        if (!pushEnabled) {
          await this.db.notification.update({
            where: { id: notification.id },
            data: {
              pushAttemptedAt: now,
              pushAttemptCount: { increment: 1 },
              pushLastError: "PUSH_DISABLED_BY_USER",
            },
          });
          continue;
        }

        const tokens = notification.user.pushTokens.map((item) => item.token);
        if (!tokens.length) continue;
        try {
          const response = await getMessaging().sendEachForMulticast({
            tokens,
            notification: {
              title: notification.title,
              body: notification.body,
            },
            data: {
              notificationId: notification.id,
              type: notification.type,
              route: "/notifications",
              ...(notification.applicationId
                ? { applicationId: notification.applicationId }
                : {}),
            },
            android: {
              priority: "high",
              notification: {
                channelId: "rivera_activity",
                icon: "ic_stat_rivera",
                color: "#CDEA74",
                sound: "default",
              },
            },
            apns: {
              payload: { aps: { sound: "default", badge: 1 } },
            },
          });
          await this.removeInvalidTokens(tokens, response);
          await this.db.notification.update({
            where: { id: notification.id },
            data: {
              pushAttemptedAt: now,
              pushDeliveredAt: response.successCount ? now : null,
              pushAttemptCount: { increment: 1 },
              pushLastError: response.failureCount
                ? `${response.failureCount} device delivery failure(s)`
                : null,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Push send failed";
          await this.db.notification.update({
            where: { id: notification.id },
            data: {
              pushAttemptedAt: now,
              pushAttemptCount: { increment: 1 },
              pushLastError: message.slice(0, 500),
            },
          });
          this.logger.warn(`Push ${notification.id} failed: ${message}`);
        }
      }
      if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== "false")
        await this.dispatchPendingEmail(now, retryBefore, recentAfter);
    } catch (error) {
      this.logger.error(
        `Push dispatcher failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    } finally {
      this.dispatching = false;
    }
  }

  private async dispatchPendingEmail(
    now: Date,
    retryBefore: Date,
    recentAfter: Date,
  ) {
    if (Date.now() < this.emailPausedUntil) return;
    const pending = await this.db.notification.findMany({
      where: {
        createdAt: { gte: recentAfter },
        emailDeliveredAt: null,
        emailAttemptCount: { lt: 3 },
        OR: [
          { emailAttemptedAt: null },
          { emailAttemptedAt: { lt: retryBefore } },
        ],
        user: {
          emailVerifiedAt: { not: null },
          status: "ACTIVE",
        },
      },
      include: {
        user: {
          select: {
            email: true,
            roles: { select: { role: true } },
            notificationPreferences: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    for (const notification of pending) {
      const category = categoryFor(notification.type);
      const preference = notification.user.notificationPreferences.find(
        (item) => item.category === category,
      );
      const emailEnabled =
        category === "ACCOUNT" ||
        category === "PAYMENTS" ||
        (preference?.emailEnabled ?? category !== "MARKETING");
      if (!emailEnabled) {
        await this.db.notification.update({
          where: { id: notification.id },
          data: {
            emailAttemptedAt: now,
            emailAttemptCount: 3,
            emailLastError: "EMAIL_DISABLED_BY_USER",
          },
        });
        continue;
      }

      // Claim atomically so multiple API replicas cannot email the same event.
      const claimed = await this.db.notification.updateMany({
        where: {
          id: notification.id,
          emailDeliveredAt: null,
          OR: [
            { emailAttemptedAt: null },
            { emailAttemptedAt: { lt: retryBefore } },
          ],
        },
        data: {
          emailAttemptedAt: now,
          emailAttemptCount: { increment: 1 },
          emailLastError: null,
        },
      });
      if (claimed.count !== 1) continue;

      try {
        const roles = notification.user.roles.map((item) => item.role);
        const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
        await this.mail.sendNotificationEmail(
          notification.user.email,
          notification.title,
          notification.body,
          `${baseUrl}${routeFor(notification.type, roles)}`,
        );
        await this.db.notification.update({
          where: { id: notification.id },
          data: { emailDeliveredAt: new Date(), emailLastError: null },
        });
        this.logger.log(
          JSON.stringify({ event: "notification_email_delivered", notificationId: notification.id, category }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Email send failed";
        const providerBlocked = /Unusual sending activity|temporarily blocked/i.test(message);
        await this.db.notification.update({
          where: { id: notification.id },
          data: { emailLastError: message.slice(0, 500) },
        });
        this.logger.warn(
          JSON.stringify({ event: "notification_email_failed", notificationId: notification.id, category }),
        );
        if (providerBlocked) {
          this.emailPausedUntil = Date.now() + providerCircuitDelayMs;
          this.logger.warn(
            JSON.stringify({ event: "notification_email_provider_circuit_open", retryAfterMinutes: 30 }),
          );
          break;
        }
      }
    }
  }

  private async removeInvalidTokens(tokens: string[], response: BatchResponse) {
    const invalid = response.responses
      .map((item, index) =>
        !item.success && item.error && invalidTokenCodes.has(item.error.code)
          ? tokens[index]
          : null,
      )
      .filter((token): token is string => Boolean(token));
    if (invalid.length) {
      await this.db.pushDeviceToken.deleteMany({ where: { token: { in: invalid } } });
    }
  }
}
