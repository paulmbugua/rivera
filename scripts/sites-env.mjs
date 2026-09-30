import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const runtimeRoot = process.env.SITES_RUNTIME_ROOT || path.join(projectRoot, ".sites-runtime");

process.env.CLOUDFLARE_CF_FETCH_ENABLED ||= "false";
process.env.WRANGLER_SEND_METRICS ||= "false";
process.env.WRANGLER_WRITE_LOGS ||= "false";
process.env.WRANGLER_LOG_PATH ||= path.join(runtimeRoot, "wrangler/logs");
process.env.WRANGLER_REGISTRY_PATH ||= path.join(runtimeRoot, "wrangler/dev-registry");
process.env.MINIFLARE_REGISTRY_PATH ||= path.join(runtimeRoot, "wrangler/registry");

process.chdir(projectRoot);
for (const directory of [
  path.dirname(process.env.WRANGLER_LOG_PATH),
  process.env.WRANGLER_REGISTRY_PATH,
  process.env.MINIFLARE_REGISTRY_PATH,
]) {
  mkdirSync(directory, { recursive: true });
}

// A production Vinext build emits a self-contained Wrangler configuration.
// Local Docker environment variables must be copied into Worker bindings before
// Wrangler starts; otherwise process.env is empty inside the Worker runtime.
const wranglerConfigPath = path.join(projectRoot, "dist/server/wrangler.json");
if (existsSync(wranglerConfigPath) && process.env.API_INTERNAL_URL) {
  const config = JSON.parse(readFileSync(wranglerConfigPath, "utf8"));
  config.vars = {
    ...(config.vars || {}),
    API_INTERNAL_URL: process.env.API_INTERNAL_URL,
    ...(process.env.WEB_ORIGIN ? { WEB_ORIGIN: process.env.WEB_ORIGIN } : {}),
  };
  writeFileSync(wranglerConfigPath, `${JSON.stringify(config)}\n`);
}
