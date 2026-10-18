#!/usr/bin/env bash
set -Eeuo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

env_file="${ENV_FILE:-.env}"
compose=(docker compose --env-file "$env_file" -f docker-compose.yml -f docker-compose.hostpinnacle.yml)

fail() {
  printf 'Deployment failed: %s\n' "$*" >&2
  exit 1
}

[[ -f "$env_file" ]] || fail "missing production environment file: $env_file"
chmod 600 "$env_file"

env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "$env_file" | tail -n 1
}

edge_mode="${EDGE_MODE:-$(env_value EDGE_MODE)}"
edge_mode="${edge_mode:-caddy}"

profile=()
services=(postgres api web caddy)
if [[ "$edge_mode" == "cloudflare-tunnel" ]]; then
  tunnel_token="$(env_value CLOUDFLARE_TUNNEL_TOKEN)"
  [[ -n "$tunnel_token" ]] || fail "CLOUDFLARE_TUNNEL_TOKEN is required for EDGE_MODE=cloudflare-tunnel"
  profile=(--profile cloudflare-tunnel)
  services+=(cloudflared)
elif [[ "$edge_mode" != "caddy" ]]; then
  fail "EDGE_MODE must be caddy or cloudflare-tunnel"
fi

export BUILD_SHA="$(git rev-parse HEAD)"
[[ -n "$BUILD_SHA" ]] || fail "unable to resolve the deployed Git SHA"

"${compose[@]}" "${profile[@]}" config --quiet
available_services="$("${compose[@]}" "${profile[@]}" config --services)"
for optional_service in cache worker; do
  if grep -qx "$optional_service" <<<"$available_services"; then
    services+=("$optional_service")
  fi
done
if [[ "$edge_mode" == "cloudflare-tunnel" ]]; then
  "${compose[@]}" "${profile[@]}" pull cloudflared
fi
"${compose[@]}" "${profile[@]}" build migrate api web
"${compose[@]}" "${profile[@]}" up -d "${services[@]}"

wait_for_service() {
  local service="$1" timeout="${2:-180}" elapsed=0 id status health
  while (( elapsed < timeout )); do
    id="$("${compose[@]}" "${profile[@]}" ps -q "$service")"
    if [[ -n "$id" ]]; then
      status="$(docker inspect --format '{{.State.Status}}' "$id")"
      health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id")"
      if [[ "$status" == "running" && ( "$health" == "healthy" || "$health" == "none" ) ]]; then
        printf '%s is %s (%s)\n' "$service" "$status" "$health"
        return 0
      fi
      [[ "$status" != "exited" && "$status" != "dead" ]] || return 1
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done
  return 1
}

for service in postgres api web caddy; do
  wait_for_service "$service" || fail "$service did not become healthy"
done
if [[ "$edge_mode" == "cloudflare-tunnel" ]]; then
  wait_for_service cloudflared || fail "cloudflared did not establish a healthy tunnel"
fi

# Rivera currently has no cache or separate worker service. If either is added,
# wait for it automatically without granting cloudflared access to its network.
for optional_service in cache worker; do
  if grep -qx "$optional_service" <<<"$available_services"; then
    wait_for_service "$optional_service" || fail "$optional_service did not become healthy"
  fi
done

local_sha="$("${compose[@]}" exec -T api node -e 'fetch("http://127.0.0.1:4000/api/v1/health/version").then(r=>r.json()).then(v=>process.stdout.write(String(v.buildSha||"")))')"
[[ "$local_sha" == "$BUILD_SHA" ]] || fail "local API build identity does not match deployed Git SHA"

if [[ "${VERIFY_PUBLIC_DEPLOYMENT:-false}" == "true" ]]; then
  public_base="${PUBLIC_API_BASE_URL:-$(env_value PUBLIC_API_BASE_URL)}"
  [[ -n "$public_base" ]] || fail "PUBLIC_API_BASE_URL is required for public deployment verification"
  public_sha="$(curl --fail --silent --show-error --max-time 20 "${public_base%/}/health/version" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("buildSha", ""), end="")')"
  [[ "$public_sha" == "$BUILD_SHA" ]] || fail "public API is not serving the newly deployed Git SHA"
  ENV_FILE="$env_file" deploy/backup-production.sh
fi

printf 'Rivera deployment verified at Git SHA %s using edge mode %s.\n' "$BUILD_SHA" "$edge_mode"
