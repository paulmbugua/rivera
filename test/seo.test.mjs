import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("site metadata includes canonical, social, crawler and structured-data signals", () => {
  const layout = read("app/layout.tsx");
  for (const signal of ["metadataBase", "alternates", "openGraph", "twitter", "googleBot", "application/ld+json"]) {
    assert.match(layout, new RegExp(signal.replace("+", "\\+")));
  }
  assert.match(layout, /Organization/);
  assert.match(layout, /WebSite/);
  assert.doesNotMatch(layout, /codex-preview/);
});

test("crawler endpoints advertise public pages and exclude private product areas", () => {
  const robots = read("app/robots.ts");
  const sitemap = read("app/sitemap.ts");
  for (const path of ["/admin", "/dashboard", "/onboarding", "/settings", "/api/"]) {
    assert.match(robots, new RegExp(path.replaceAll("/", "\\/")));
  }
  for (const path of ["/creators", "/campaigns", "/privacy", "/terms"]) {
    assert.match(sitemap, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.match(sitemap, /campaign\.business\.slug/);
});

test("public entities have unique canonical and social metadata", () => {
  for (const path of ["app/creators/[slug]/page.tsx", "app/businesses/[slug]/page.tsx", "app/campaigns/[slug]/page.tsx"]) {
    const source = read(path);
    assert.match(source, /alternates:\{canonical:/);
    assert.match(source, /openGraph:/);
    assert.match(source, /twitter:/);
    assert.match(source, /robots:\{index:false/);
  }
});

test("public creator, business and campaign entities emit schema.org JSON-LD", () => {
  const creator = read("app/creators/[slug]/layout.tsx");
  const business = read("app/businesses/[slug]/layout.tsx");
  const campaign = read("app/campaigns/[slug]/layout.tsx");
  assert.match(creator, /"@type": "Person"/);
  assert.match(business, /"@type": "Organization"/);
  assert.match(campaign, /"@type": "JobPosting"/);
  for (const source of [creator, business, campaign]) assert.match(source, /<JsonLd data=/);
});

test("private layouts are noindex and the branded social image exists", () => {
  for (const path of ["app/(auth)/layout.tsx", "app/admin/layout.tsx", "app/dashboard/layout.tsx", "app/onboarding/layout.tsx", "app/register/layout.tsx", "app/settings/layout.tsx"]) {
    assert.match(read(path), /index:\s*false/);
  }
  assert.ok(existsSync(new URL("../public/images/rivera-social-card.png", import.meta.url)));
});

test("the apex domain permanently redirects to the canonical www host", () => {
  const caddy = read("deploy/Caddyfile");
  assert.match(caddy, /riveracreators\.com \{/);
  assert.match(caddy, /redir https:\/\/www\.riveracreators\.com\{uri\} permanent/);
});

test("Docker exposes optional Google Search Console verification to the web runtime", () => {
  assert.match(read("docker-compose.yml"), /GOOGLE_SITE_VERIFICATION: \$\{GOOGLE_SITE_VERIFICATION:-\}/);
});
