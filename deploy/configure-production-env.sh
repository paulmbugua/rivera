#!/usr/bin/env bash
set -euo pipefail

domain="${1:-riveracreators.com}"
env_file="${2:-.env}"

if [[ ! -f "$env_file" ]]; then
  cp .env.example "$env_file"
fi

set_env() {
  local key="$1"
  local value="$2"
  local temporary
  temporary="$(mktemp)"
  grep -v "^${key}=" "$env_file" > "$temporary" || true
  printf '%s=%s\n' "$key" "$value" >> "$temporary"
  cat "$temporary" > "$env_file"
  rm -f "$temporary"
}

current_database_password="$(sed -n 's/^POSTGRES_PASSWORD=//p' "$env_file" | tail -n 1)"
if [[ -z "$current_database_password" || "$current_database_password" == "rivera_dev" ]]; then
  set_env POSTGRES_PASSWORD "$(openssl rand -hex 32)"
fi

current_jwt_secret="$(sed -n 's/^JWT_ACCESS_SECRET=//p' "$env_file" | tail -n 1)"
if [[ ${#current_jwt_secret} -lt 32 || "$current_jwt_secret" == dev-only-* ]]; then
  set_env JWT_ACCESS_SECRET "$(openssl rand -base64 48 | tr -d '\n' | tr '/+' '_-')"
fi

set_env POSTGRES_PORT 55432
set_env API_HOST_PORT 4100
set_env WEB_HOST_PORT 3100
set_env WEB_ORIGIN "https://${domain}"
set_env APP_URL "https://${domain}"
set_env NEXT_PUBLIC_API_URL /api/v1
set_env COOKIE_SECURE true
set_env NODE_ENV production
set_env GOOGLE_REDIRECT_URI "https://${domain}/api/v1/auth/google/callback"
set_env GOOGLE_AUTH_API_URL "https://${domain}/api/v1"
set_env MEDIA_PUBLIC_URL "https://${domain}/media"
set_env NEXT_PUBLIC_MEDIA_URL "https://${domain}/media"

chmod 600 "$env_file"
docker compose -f docker-compose.yml -f docker-compose.production.yml config --quiet
echo "Production environment configured for ${domain}."
