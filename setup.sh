#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_DIR="$ROOT_DIR/.container"
WORKSPACE_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
# shellcheck source=.container/scripts/common.sh
. "$CONTAINER_DIR/scripts/common.sh"

ASSUME_YES=false
LOCAL_SOURCE=false
DISCARD_LOCAL_CHANGES=false

usage() {
  cat <<'EOF'
Usage: bash setup.sh [options]

Installs only the TechMedia TMApp application against existing shared CXApp
MariaDB, Redis, Media, and Docker network resources.

Options:
  --yes                    Accept the safe application-only defaults.
  --local-source           Build current sibling checkouts without Git sync.
  --skip-git               Alias for --local-source.
  --discard-local-changes  After review, discard changes only in the four mapped
                           TMApp repositories before fast-forwarding.
  -h, --help               Show this help.

This command never creates, stops, rebuilds, removes, or prunes shared services.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=true ;;
    --local-source|--skip-git) LOCAL_SOURCE=true ;;
    --discard-local-changes) DISCARD_LOCAL_CHANGES=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 64 ;;
  esac
done

sync_sources() {
  if [ "$LOCAL_SOURCE" = "true" ]; then
    echo "Git check/update skipped; current checkouts will be built."
    return
  fi
  command -v git >/dev/null 2>&1 || { echo "Git is required when source checking is enabled." >&2; exit 69; }

  dirty=false
  for directory in "$ROOT_DIR" "$WORKSPACE_ROOT/framework" "$WORKSPACE_ROOT/ui" "$WORKSPACE_ROOT/core"; do
    if [ -d "$directory/.git" ] && [ -n "$(git -C "$directory" status --porcelain)" ]; then
      dirty=true
      echo "Dirty mapped repository: $directory"
      git -C "$directory" status --short
    fi
  done
  if [ "$dirty" = "true" ] && [ "$DISCARD_LOCAL_CHANGES" = "false" ]; then
    [ "$ASSUME_YES" = "false" ] || {
      echo "Dirty repositories require explicit --discard-local-changes; --yes never discards work." >&2
      exit 65
    }
    read -r -p "Type DISCARD to restore the listed mapped repositories: " confirmation
    [ "$confirmation" = "DISCARD" ] || { echo "Setup cancelled." >&2; exit 65; }
    DISCARD_LOCAL_CHANGES=true
  fi
  [ "$DISCARD_LOCAL_CHANGES" = "false" ] || export TMAPP_DISCARD_LOCAL_CHANGES=1
  bash "$CONTAINER_DIR/scripts/source-stack.sh" install
}

confirm_git_update() {
  if [ "$LOCAL_SOURCE" = "true" ]; then
    return
  fi
  if [ "$ASSUME_YES" = "true" ]; then
    return
  fi
  read -r -p "Check and update Git repositories before setup? [Y/n] " answer
  case "${answer:-Y}" in
    y|Y|yes|YES|Yes) ;;
    *) LOCAL_SOURCE=true ;;
  esac
}

echo "TMApp setup"
confirm_git_update
command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 69; }
sync_sources
prepare_env
docker info >/dev/null 2>&1 || { echo "Docker Engine is not reachable." >&2; exit 69; }
require_shared_network
require_shared_infrastructure

if techmedia_database_exists; then
  reuse_database=true
  if [ "$ASSUME_YES" = "false" ]; then
    read -r -p "Use the existing TMApp databases? [Y/n] " answer
    case "${answer:-Y}" in y|Y|yes|YES|Yes) ;; *) reuse_database=false ;; esac
  fi
  if [ "$reuse_database" = "false" ]; then
    master=$(env_value DB_MASTER_NAME techmedia_master)
    tenant=$(env_value DEFAULT_TENANT_DB_NAME techmedia_tenant_default)
    read -r -p "Type DROP $master $tenant to permanently recreate only these TMApp databases: " confirmation
    [ "$confirmation" = "DROP $master $tenant" ] || {
      echo "TMApp database recreation cancelled." >&2
      exit 78
    }
    drop_techmedia_databases
    set_env_value TECHMEDIA_VERIFIED_BACKUP_ID "initial-empty-database-$(date -u +%Y%m%dT%H%M%SZ)"
    echo "Dropped only TMApp-owned databases."
  fi
fi

if [ -z "$(env_value TECHMEDIA_VERIFIED_BACKUP_ID "")" ]; then
  database=$(env_value DB_MASTER_NAME techmedia_master)
  mariadb_container=$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)
  count=$(MSYS_NO_PATHCONV=1 docker exec -e MYSQL_PWD="$(env_value DB_PASSWORD)" "$mariadb_container" \
    mariadb --batch --skip-column-names -u "$(env_value DB_USER cxapp_app)" \
    -e "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${database}';")
  [ "$count" = "0" ] || {
    echo "A verified backup ID is required because database $database already exists." >&2
    exit 78
  }
  set_env_value TECHMEDIA_VERIFIED_BACKUP_ID "initial-empty-database-$(date -u +%Y%m%dT%H%M%SZ)"
fi

validate_env
ensure_master_database

if [ "$ASSUME_YES" = "false" ]; then
  read -r -p "Build and install only the TechMedia TMApp application? [Y/n] " answer
  case "${answer:-Y}" in y|Y|yes|YES|Yes) ;; *) echo "Setup cancelled."; exit 0 ;; esac
fi

if docker container inspect tmapp-api >/dev/null 2>&1 \
  || docker container inspect techmedia-api >/dev/null 2>&1; then
  bash "$CONTAINER_DIR/deploy.sh" --reinstall
else
  bash "$CONTAINER_DIR/deploy.sh" up
fi
bash "$CONTAINER_DIR/scripts/smoke-test.sh"

echo
echo "TMApp setup completed."
echo "API: http://$(env_value TMAPP_BIND_ADDRESS 127.0.0.1):$(env_value PLATFORM_API_HOST_PORT 18050)/health"
echo "Web: http://$(env_value TMAPP_BIND_ADDRESS 127.0.0.1):$(env_value PLATFORM_WEB_HOST_PORT 18060)/"
echo "Next updates: bash update.sh"
