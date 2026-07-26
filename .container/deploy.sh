#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.container/scripts/common.sh
. "$SCRIPT_DIR/scripts/common.sh"

ACTION=${1:-up}
case "$ACTION" in
  up|--reinstall|build|migrate|ps|logs|down) ;;
  *)
    echo "Usage: .container/deploy.sh <up|--reinstall|build|migrate|ps|logs|down>" >&2
    exit 64
    ;;
esac

run_preflight
ensure_master_database

build_stack() {
  echo "Building TMApp API and Web images from synchronized sibling sources."
  compose_all config --quiet
  compose_all build platform-api platform-web
}

migrate_stack() {
  echo "Applying forward TechMedia migrations from the version-matched TMApp API image."
  compose_all run --rm platform-migrate run db:migrations:run
  echo "Applied migration state:"
  compose_all run --rm platform-migrate run db:migrations:list
}

start_stack() {
  echo "Replacing only TMApp application containers."
  compose_app up -d --no-build --remove-orphans --wait --wait-timeout 300
}

remove_legacy_application_containers() {
  for container in techmedia-api techmedia-web; do
    if docker container inspect "$container" >/dev/null 2>&1; then
      docker container rm --force "$container" >/dev/null
      echo "Removed legacy Techmedia application container: $container"
    fi
  done
}

case "$ACTION" in
  build)
    build_stack
    ;;
  migrate)
    migrate_stack
    ;;
  up)
    build_stack
    migrate_stack
    remove_legacy_application_containers
    start_stack
    ;;
  --reinstall)
    echo "Building replacement TMApp images before stopping the current application."
    build_stack
    compose_app down --remove-orphans
    remove_legacy_application_containers
    migrate_stack
    start_stack
    ;;
  ps)
    compose_app ps
    ;;
  logs)
    compose_app logs -f --tail=150
    ;;
  down)
    compose_app down --remove-orphans
    ;;
esac

echo "TMApp action completed: $ACTION"
