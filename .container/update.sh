#!/usr/bin/env bash
set -euo pipefail

CONTAINER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$CONTAINER_DIR/.." && pwd)"
RUNTIME_ENV="${TECHMEDIA_RUNTIME_ENV:-$ROOT_DIR/.env}"
DEPLOY_ENV="${TECHMEDIA_DEPLOY_ENV:-$CONTAINER_DIR/deploy.env}"
COMPOSE_FILE="$CONTAINER_DIR/docker-compose.yml"
BACKUP_DIR="$CONTAINER_DIR/backups"
ASSUME_YES=false
CHECK_ONLY=false

usage() {
  cat <<'EOF'
Usage: bash update.sh [--check] [--yes]

Safely update an existing TechMedia Docker installation while preserving:

  - root .env runtime settings, secrets, and Frappe user credentials
  - .container/deploy.env Docker topology and database credentials
  - the existing MariaDB container, database, and named data volume
  - container names, network names, bind addresses, and host ports

Before application replacement, the updater verifies the build and repository
checks in Docker, creates a validated MariaDB backup, and runs migrations and
repeatable seeds with the new API image. It recreates only API and Web, verifies
Docker health plus both HTTP endpoints, and restores the previous application
images if replacement fails.

The updater never runs the interactive installer, resets or recreates MariaDB,
removes volumes, changes credentials, pulls source, or updates unrelated containers.

Options:
      --check Validate the existing deployment without rebuilding containers.
  -y, --yes  Apply the update without an interactive confirmation.
  -h, --help Show this help.

Run this script after updating the repository source.
EOF
}

while (($# > 0)); do
  case "$1" in
    -y|--yes)
      ASSUME_YES=true
      ;;
    --check)
      CHECK_ONLY=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 64
      ;;
  esac
  shift
done

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command is unavailable: $1" >&2
    exit 69
  }
}

file_value() {
  local file="$1" key="$2" default_value="${3:-}" value
  value="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)"
  printf '%s' "${value:-$default_value}" | tr -d '\r'
}

safe_docker_name() {
  [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] || {
    echo "Unsafe Docker resource name in $DEPLOY_ENV: $1" >&2
    exit 78
  }
}

container_is_running() {
  [[ "$(docker inspect --format '{{.State.Running}}' "$1" 2>/dev/null || true)" == true ]]
}

container_is_compose_service() {
  local container="$1" project="$2" service="$3"
  [[ "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' \
    "$container" 2>/dev/null || true)" == "$project" ]] &&
    [[ "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' \
      "$container" 2>/dev/null || true)" == "$service" ]]
}

compose() {
  TECHMEDIA_RUNTIME_ENV_FILE="$RUNTIME_ENV" docker compose \
    --env-file "$RUNTIME_ENV" \
    --env-file "$DEPLOY_ENV" \
    -f "$COMPOSE_FILE" "$@"
}

require_file() {
  [[ -f "$1" ]] || {
    echo "Required configuration file is missing: $1" >&2
    echo "Run bash setup.sh once before using bash update.sh." >&2
    exit 78
  }
}

require_setting() {
  local file="$1" key="$2"
  [[ -n "$(file_value "$file" "$key")" ]] || {
    echo "$key is missing from $file." >&2
    echo "The updater will not invent or replace existing credentials." >&2
    exit 78
  }
}

require_command docker
require_command curl
docker info >/dev/null 2>&1 || {
  echo "Docker Engine is not reachable." >&2
  exit 69
}
docker compose version >/dev/null 2>&1 || {
  echo "Docker Compose v2 is required." >&2
  exit 69
}

require_file "$RUNTIME_ENV"
require_file "$DEPLOY_ENV"
require_file "$COMPOSE_FILE"

for key in DB_NAME DB_USER DB_PASSWORD JWT_SECRET INITIAL_ADMIN_EMAIL INITIAL_ADMIN_PASSWORD; do
  require_setting "$RUNTIME_ENV" "$key"
done
for key in \
  TECHMEDIA_COMPOSE_PROJECT \
  TECHMEDIA_API_CONTAINER_NAME \
  TECHMEDIA_WEB_CONTAINER_NAME \
  TECHMEDIA_NETWORK; do
  require_setting "$DEPLOY_ENV" "$key"
done

project="$(file_value "$DEPLOY_ENV" TECHMEDIA_COMPOSE_PROJECT techmedia)"
api_container="$(file_value "$DEPLOY_ENV" TECHMEDIA_API_CONTAINER_NAME techmedia-api)"
web_container="$(file_value "$DEPLOY_ENV" TECHMEDIA_WEB_CONTAINER_NAME techmedia-web)"
network="$(file_value "$DEPLOY_ENV" TECHMEDIA_NETWORK techmedia-network)"
network_external="$(file_value "$DEPLOY_ENV" TECHMEDIA_NETWORK_EXTERNAL false)"
image_registry="$(file_value "$DEPLOY_ENV" TECHMEDIA_IMAGE_REGISTRY techmedia)"
image_tag="$(file_value "$DEPLOY_ENV" TECHMEDIA_IMAGE_TAG local)"
backup_retention="$(file_value "$DEPLOY_ENV" TECHMEDIA_BACKUP_RETENTION 10)"
database="$(file_value "$RUNTIME_ENV" DB_NAME)"
database_user="$(file_value "$RUNTIME_ENV" DB_USER)"
database_password="$(file_value "$RUNTIME_ENV" DB_PASSWORD)"
api_image="${image_registry}/api:${image_tag}"
web_image="${image_registry}/web:${image_tag}"

for resource in "$project" "$api_container" "$web_container" "$network"; do
  safe_docker_name "$resource"
done
[[ "$database" =~ ^[A-Za-z0-9_]+$ ]] || {
  echo "DB_NAME contains unsupported characters: $database" >&2
  exit 78
}
[[ "$backup_retention" =~ ^[1-9][0-9]*$ ]] || {
  echo "TECHMEDIA_BACKUP_RETENTION must be a positive integer." >&2
  exit 78
}

for service_spec in "$api_container:api" "$web_container:web"; do
  container="${service_spec%%:*}"
  service="${service_spec##*:}"
  docker container inspect "$container" >/dev/null 2>&1 || {
    echo "Existing TechMedia $service container was not found: $container" >&2
    echo "Run bash setup.sh to create a new installation." >&2
    exit 69
  }
  container_is_compose_service "$container" "$project" "$service" || {
    echo "Refusing to replace container not owned by Compose project $project: $container" >&2
    exit 78
  }
done

if [[ "$network_external" == true ]]; then
  mariadb_container="$(
    file_value "$DEPLOY_ENV" TECHMEDIA_SHARED_MARIADB_CONTAINER_NAME cxapp-mariadb
  )"
  safe_docker_name "$mariadb_container"
  docker network inspect "$network" >/dev/null 2>&1 || {
    echo "Configured external Docker network was not found: $network" >&2
    exit 69
  }
  container_is_running "$mariadb_container" || {
    echo "Configured shared MariaDB container is not running: $mariadb_container" >&2
    exit 69
  }
  infrastructure="shared MariaDB $mariadb_container on external network $network"
else
  mariadb_container="$(
    file_value "$DEPLOY_ENV" TECHMEDIA_MARIADB_CONTAINER_NAME techmedia-mariadb
  )"
  safe_docker_name "$mariadb_container"
  docker container inspect "$mariadb_container" >/dev/null 2>&1 || {
    echo "Existing TechMedia MariaDB container was not found: $mariadb_container" >&2
    exit 69
  }
  container_is_compose_service "$mariadb_container" "$project" mariadb || {
    echo "Refusing to use MariaDB container not owned by Compose project $project: $mariadb_container" >&2
    exit 78
  }
  infrastructure="dedicated MariaDB $mariadb_container"
fi

compose config --quiet

if container_is_running "$api_container"; then
  docker exec "$api_container" node -e \
    "require('node:fs').accessSync(process.env.TECHMEDIA_ENV_FILE_PATH, require('node:fs').constants.R_OK | require('node:fs').constants.W_OK)" \
    >/dev/null 2>&1 || {
      echo "The API container user cannot read and write its mounted runtime environment." >&2
      echo "Fix ownership/permissions of $RUNTIME_ENV for the container user before updating." >&2
      exit 77
    }
fi

echo
echo "TechMedia Docker update plan"
echo "  Runtime configuration: $RUNTIME_ENV (preserved)"
echo "  Deployment configuration: $DEPLOY_ENV (preserved)"
echo "  Compose project: $project"
echo "  Infrastructure: $infrastructure (preserved)"
echo "  Preflight: production build and repository checks in Docker"
echo "  Rebuild: $api_container and $web_container"
echo "  Backup: timestamped SQL dump in $BACKUP_DIR (keep $backup_retention)"
echo "  Database: migrate and seed before application replacement"
echo "  Database containers and volumes: untouched"
echo "  Source code: current repository checkout"

if [[ "$CHECK_ONLY" == true ]]; then
  echo
  echo "Existing TechMedia Docker deployment is ready to update."
  exit 0
fi

if [[ "$ASSUME_YES" != true ]]; then
  read -r -p "Build and update the existing TechMedia containers? [Y/n] " confirmation
  case "${confirmation:-Y}" in
    y|Y|yes|Yes|YES) ;;
    *)
      echo "Update cancelled before Docker changes."
      exit 0
      ;;
  esac
fi

old_api_image="$(docker inspect --format '{{.Image}}' "$api_container")"
old_web_image="$(docker inspect --format '{{.Image}}' "$web_container")"

if [[ "$network_external" != true ]] && ! container_is_running "$mariadb_container"; then
  echo "Starting the existing dedicated MariaDB container without recreating it."
  compose up -d mariadb --no-build --no-recreate --wait --wait-timeout 180
fi

echo "Building the verification, API, and Web images."
compose build verify api web

mkdir -p "$BACKUP_DIR"
resolved_backup_dir="$(cd "$BACKUP_DIR" && pwd -P)"
[[ "$resolved_backup_dir" != "/" && "$resolved_backup_dir" != "$ROOT_DIR" ]] || {
  echo "Refusing to use unsafe backup directory: $resolved_backup_dir" >&2
  exit 78
}
chmod 700 "$resolved_backup_dir" 2>/dev/null || true
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$resolved_backup_dir/${project}-${database}-${timestamp}.sql"
backup_temp="${backup_file}.partial"

echo "Creating MariaDB backup: $backup_file"
if ! MSYS_NO_PATHCONV=1 docker exec \
  -e MYSQL_PWD="$database_password" \
  "$mariadb_container" \
  mariadb-dump \
  --user="$database_user" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  "$database" >"$backup_temp"; then
  rm -f -- "$backup_temp"
  echo "MariaDB backup failed; the running application was not replaced." >&2
  exit 74
fi

if [[ ! -s "$backup_temp" ]] ||
  ! grep -Eq '^(-- (MariaDB|MySQL) dump|CREATE TABLE|-- Dump completed)' "$backup_temp"; then
  rm -f -- "$backup_temp"
  echo "MariaDB backup validation failed; the running application was not replaced." >&2
  exit 74
fi
mv -- "$backup_temp" "$backup_file"
chmod 600 "$backup_file" 2>/dev/null || true

mapfile -t backup_files < <(
  find "$resolved_backup_dir" -maxdepth 1 -type f \
    -name "${project}-${database}-*.sql" -print | sort -r
)
if ((${#backup_files[@]} > backup_retention)); then
  for ((index = backup_retention; index < ${#backup_files[@]}; index++)); do
    rm -f -- "${backup_files[$index]}"
  done
fi

echo "Verifying runtime environment access with the new API image."
compose run --rm --no-deps api node -e \
  "require('node:fs').accessSync(process.env.TECHMEDIA_ENV_FILE_PATH, require('node:fs').constants.R_OK | require('node:fs').constants.W_OK)"

echo "Running database migrations with the new API image."
if ! compose run --rm --no-deps api npm run db:migrate; then
  echo "Migration failed; existing application containers remain in place." >&2
  echo "Validated backup: $backup_file" >&2
  exit 70
fi

echo "Running repeatable database seeds with the new API image."
if ! compose run --rm --no-deps api npm run db:seed; then
  echo "Database seed failed; existing application containers remain in place." >&2
  echo "Validated backup: $backup_file" >&2
  exit 70
fi

rollback_application() {
  local reason="$1" rollback_status=0
  echo "$reason" >&2
  echo "Restoring the previous API and Web images." >&2
  set +e
  docker image tag "$old_api_image" "$api_image" || rollback_status=$?
  docker image tag "$old_web_image" "$web_image" || rollback_status=$?
  compose up -d api web \
    --no-build \
    --no-deps \
    --force-recreate \
    --wait \
    --wait-timeout 300 || rollback_status=$?
  set -e
  if ((rollback_status == 0)); then
    echo "Previous application containers restored. Database backup: $backup_file" >&2
  else
    echo "Automatic application rollback failed. Database backup: $backup_file" >&2
  fi
  exit 70
}

if ! compose up -d api web \
  --no-build \
  --no-deps \
  --force-recreate \
  --wait \
  --wait-timeout 300; then
  rollback_application "The replacement containers did not become healthy."
fi

bind_address="$(file_value "$DEPLOY_ENV" TECHMEDIA_BIND_ADDRESS 127.0.0.1)"
probe_address="$bind_address"
case "$probe_address" in
  0.0.0.0|::|"[::]") probe_address=127.0.0.1 ;;
esac
api_url="http://${probe_address}:$(file_value "$DEPLOY_ENV" TECHMEDIA_API_HOST_PORT 7050)/health"
web_url="http://${probe_address}:$(file_value "$DEPLOY_ENV" TECHMEDIA_WEB_HOST_PORT 7060)/health"

if ! curl --fail --silent --show-error --max-time 15 \
  --retry 5 --retry-delay 2 --retry-connrefused "$api_url" >/dev/null; then
  rollback_application "API HTTP verification failed: $api_url"
fi
if ! curl --fail --silent --show-error --max-time 15 \
  --retry 5 --retry-delay 2 --retry-connrefused "$web_url" >/dev/null; then
  rollback_application "Web HTTP verification failed: $web_url"
fi

echo
echo "TechMedia Docker update completed."
echo "Web: http://$(file_value "$DEPLOY_ENV" TECHMEDIA_BIND_ADDRESS 127.0.0.1):$(file_value "$DEPLOY_ENV" TECHMEDIA_WEB_HOST_PORT 7060)/"
echo "API health: http://$(file_value "$DEPLOY_ENV" TECHMEDIA_BIND_ADDRESS 127.0.0.1):$(file_value "$DEPLOY_ENV" TECHMEDIA_API_HOST_PORT 7050)/health"
echo "Validated database backup: $backup_file"
echo "Existing credentials, MariaDB data, and Frappe user mappings were preserved."
