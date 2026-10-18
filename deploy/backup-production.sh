#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

env_file="${ENV_FILE:-.env}"
backup_dir="${BACKUP_DIR:-$root_dir/backups}"
compose=(docker compose --env-file "$env_file" -f docker-compose.yml -f docker-compose.hostpinnacle.yml)
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="$backup_dir/rivera-$timestamp.dump"

[[ -f "$env_file" ]] || { printf 'Missing environment file: %s\n' "$env_file" >&2; exit 1; }
install -d -m 700 "$backup_dir"
"${compose[@]}" exec -T postgres pg_dump --username rivera --dbname rivera --format custom --no-owner > "$destination"
[[ -s "$destination" ]] || { rm -f "$destination"; printf 'Database backup was empty.\n' >&2; exit 1; }
chmod 600 "$destination"
sha256sum "$destination" > "$destination.sha256"
chmod 600 "$destination.sha256"
printf 'Verified production backup created: %s\n' "$destination"
