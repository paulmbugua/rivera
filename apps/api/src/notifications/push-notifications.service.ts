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
import { RegisterPushTokenDto } from "./push-notifications.dto";

const retryDelayMs = 5 * 60_000;
const recentWindowMs = 48 * 60 * 60_000;
const invalidTokenCodes = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

function categoryFor(type: string): NotificationCategory {
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

@Injectable()
export class PushNotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushNotificationsService.name);
  private timer?: NodeJS.Timeout;
  private configured = false;
  private dispatching = false;

  constructor(private readonly db: PrismaService) {}

  onModuleInit() {
    if (process.env.PUSH_NOTIFICATIONS_ENABLED === "false") {
      this.logger.log("Push delivery is disabled by configuration");
      return;
    }
    this.configured = this.initializeFirebase();
    if (!this.configured) {
      this.logger.warn(
        "Push delivery is unavailable until Firebase Admin credentials are configured",
      );
      return;
    }
    const interval = Math.max(
      5_000,
      Number(process.env.PUSH_DISPATCH_INTERVAL_MS ?? 15_000),
    );
    this.timer = setInterval(() => void this.dispatchPending(), interval);
    this.timer.unref();
    setTimeout(() => void this.dispatchPending(), 2_000).unref();
    this.logger.log(`Firebase push delivery enabled (${interval}ms dispatcher)`);
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
    if (!this.configured || this.dispatching) return;
    this.dispatching = true;
    try {
      const now = new Date();
      const retryBefore = new Date(now.getTime() - retryDelayMs);
      const recentAfter = new Date(now.getTime() - recentWindowMs);
      const pending = await this.db.notification.findMany({
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
      });

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
    } catch (error) {
      this.logger.error(
        `Push dispatcher failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    } finally {
      this.dispatching = false;
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
