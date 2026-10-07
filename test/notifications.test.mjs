import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web notification center exposes unread and desktop alert flows", async () => {
  const notificationCenter = await source("components/rivera/notification-center.tsx");
  const provider = await source("components/rivera/auth-provider.tsx");
  assert.match(notificationCenter, /Notification\.requestPermission/);
  assert.match(notificationCenter, /notifications\/read-all/);
  assert.match(notificationCenter, /setInterval\(.*25_000/s);
  assert.match(provider, /<NotificationCenter user=\{user\}/);
});

test("mobile notifications use a high priority channel and register FCM tokens", async () => {
  const service = await source("apps/mobile/lib/core/notification_service.dart");
  const manifest = await source("apps/mobile/android/app/src/main/AndroidManifest.xml");
  assert.match(service, /Importance\.max/);
  assert.match(service, /Priority\.high/);
  assert.match(service, /FirebaseMessaging\.onBackgroundMessage/);
  assert.match(service, /\/notifications\/devices/);
  assert.match(manifest, /com\.google\.firebase\.messaging\.default_notification_channel_id/);
  assert.match(manifest, /ic_stat_rivera/);
});

test("server persists device tokens and dispatches durable notifications", async () => {
  const schema = await source("apps/api/prisma/schema.prisma");
  const controller = await source("apps/api/src/applications/applications.controllers.ts");
  const push = await source("apps/api/src/notifications/push-notifications.service.ts");
  assert.match(schema, /model PushDeviceToken/);
  assert.match(schema, /pushDeliveredAt\s+DateTime\?/);
  assert.match(controller, /@Post\("devices"\)/);
  assert.match(push, /sendEachForMulticast/);
  assert.match(push, /channelId: "rivera_activity"/);
});
