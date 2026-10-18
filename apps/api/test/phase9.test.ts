import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const schema = source("../prisma/schema.prisma"),
  ops = source("../src/operations/operations.service.ts"),
  controllers = source("../src/operations/operations.controllers.ts"),
  observability = source("../src/common/observability.ts"),
  moduleSource = source("../src/module.ts"),
  main = source("../src/main.ts"),
  docker = source("../../../docker-compose.yml"),
  apiDocker = source("../Dockerfile");
const hostCompose = source("../../../docker-compose.hostpinnacle.yml"),
  deployment = source("../../../deploy/deploy-production.sh");

test("private operational resources are guarded by roles", () => {
  assert.match(controllers, /@UseGuards\(AuthGuard\)/);
  assert.match(controllers, /@Roles\("ADMIN"\)/);
  assert.match(
    ops,
    /conversation: \{ participants: \{ some: \{ userId \} \} \}/,
  );
  assert.match(ops, /campaignParticipant:[\s\S]*creator: \{ userId \}/);
});
test("correlation IDs are validated and returned", () => {
  assert.match(observability, /x-request-id/);
  assert.match(observability, /randomUUID/);
  assert.match(observability, /requestId: req\.requestId/);
});
test("exception responses use stable safe codes", () => {
  assert.match(observability, /INTERNAL_ERROR/);
  assert.match(observability, /Something went wrong/);
  assert.doesNotMatch(observability, /stack/);
});
test("structured logs omit message bodies and secrets", () => {
  assert.match(observability, /durationMs/);
  assert.match(observability, /statusCode/);
  for (const term of ["password", "token", "messageBody", "bankAccount"])
    assert.doesNotMatch(observability, new RegExp(`${term}: req`, "i"));
});
test("readiness checks database and safe configuration", () => {
  assert.match(controllers, /health\/ready|@Get\("ready"\)/);
  assert.match(ops, /SELECT 1/);
  assert.match(ops, /not_ready/);
});
test("deployment identity exposes the immutable build SHA", () => {
  assert.match(controllers, /@Get\("version"\)/);
  assert.match(controllers, /process\.env\.BUILD_SHA/);
  assert.match(hostCompose, /BUILD_SHA:/);
  assert.match(deployment, /health\/version/);
});
test("HostPinnacle tunnel is isolated, pinned and hardened", () => {
  const tunnelBlock = hostCompose.slice(
    hostCompose.indexOf("  cloudflared:"),
    hostCompose.indexOf("  caddy:"),
  );
  assert.match(hostCompose, /cloudflare\/cloudflared:2026\.10\.0/);
  assert.match(hostCompose, /profiles: \[cloudflare-tunnel\]/);
  assert.match(hostCompose, /--no-autoupdate/);
  assert.match(hostCompose, /--protocol[\s\S]*quic/);
  assert.match(hostCompose, /read_only: true/);
  assert.match(hostCompose, /cap_drop: \[ALL\]/);
  assert.match(hostCompose, /no-new-privileges:true/);
  assert.match(hostCompose, /internal: true/);
  assert.match(hostCompose, /127\.0\.0\.1:2000[\s\S]*ready/);
  assert.doesNotMatch(tunnelBlock, /ports:/);
});
test("production rejects unsafe defaults", () => {
  assert.match(moduleSource, /JWT_ACCESS_SECRET\.length < 48/);
  assert.match(moduleSource, /STORAGE_PROVIDER === ["']local["']/);
  assert.match(moduleSource, /sk_test_/);
  assert.match(moduleSource, /COOKIE_SECURE/);
});
test("notification preferences protect critical categories", () => {
  assert.match(schema, /model NotificationPreference/);
  assert.match(ops, /critical = new Set\(\["ACCOUNT", "PAYMENTS"\]\)/);
  assert.match(ops, /forced \? true/);
});
test("reports validate relationship-sensitive targets", () => {
  assert.match(schema, /model SafetyReport/);
  assert.match(ops, /validateReportSubject/);
  assert.match(ops, /You already reported this item/);
});
test("admin moderation and support actions are audited", () => {
  assert.match(schema, /model AdminAuditLog/);
  assert.match(ops, /SAFETY_REPORT_UPDATED/);
  assert.match(ops, /USER_STATUS_CHANGED/);
});
test("analytics never combines different currencies", () => {
  assert.match(ops, /groupBy\([\s\S]*?currencyCode/);
  assert.match(ops, /applicationFeeRevenueByCurrency/);
});
test("data lifecycle requests preserve reviewed workflow", () => {
  assert.match(schema, /model DataLifecycleRequest/);
  assert.match(ops, /A matching request is already open/);
  assert.match(controllers, /settings\/data-requests/);
});
test("reconciliation jobs are bounded and duplicate safe", () => {
  assert.match(schema, /@@unique\(\[jobName, scheduledFor\]\)/);
  assert.match(ops, /take: 25/);
  assert.match(ops, /P2002/);
});
test("money and abuse endpoints have focused throttles", () => {
  assert.match(controllers, /@Throttle/);
  assert.match(
    source("../src/collaborations/collaborations.controllers.ts"),
    /@Throttle\(\{\s*default:\s*\{\s*limit:\s*20/,
  );
  assert.match(
    source("../src/campaigns/campaigns.controllers.ts"),
    /@Throttle/,
  );
});
test("containers separate migrations and run as non-root", () => {
  assert.match(docker, /migrate:/);
  assert.match(docker, /service_completed_successfully/);
  assert.match(apiDocker, /USER rivera/);
  assert.doesNotMatch(apiDocker, /CMD.*migrate deploy/);
});
test("graceful shutdown and analytics hooks are registered", () => {
  assert.match(main, /enableShutdownHooks/);
  assert.match(main, /RequestLoggingInterceptor/);
  assert.match(main, /AnalyticsInterceptor/);
});
