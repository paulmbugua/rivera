import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8"),
  ops = read("../components/rivera/operations.tsx"),
  settings = read("../app/settings/page.tsx"),
  nav = read("../components/rivera/dashboard.tsx");
test("settings expose notification channels and critical locks", () => {
  assert.match(ops, /Notification preferences/);
  assert.match(ops, /disabled=\{item\.critical\}/);
  assert.match(settings, /OperationalSettings/);
});
test("privacy requests explain retention and require deletion confirmation", () => {
  assert.match(ops, /Financial and audit records/);
  assert.match(ops, /window\.confirm/);
  assert.match(ops, /Request data export/);
});
test("admin navigation exposes reports support analytics and lifecycle requests", () => {
  for (const value of [
    "/admin/reports",
    "/admin/support",
    "/admin/analytics",
    "/admin/data-requests",
  ])
    assert.match(nav, new RegExp(value));
});

test("frontend runtime failures use a provider-neutral safe error boundary", () => {
  const boundary = read("../app/global-error.tsx");
  const monitor = read("../lib/error-monitoring.ts");
  assert.match(boundary, /captureFrontendError/);
  assert.match(boundary, /Try again/);
  assert.match(monitor, /NEXT_PUBLIC_ERROR_MONITORING_ENABLED/);
  assert.doesNotMatch(monitor, /password|token|formData|localStorage/i);
});
