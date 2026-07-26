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
Usage: bash update.sh [options]

Synchronizes the four mapped repositories, builds replacement TMApp images,
applies forward migrations, replaces only TMApp API/Web, and verifies that
shared CXApp infrastructure identities did not change.

Options:
  --yes                    Run non-interactively.
  --local-source           Build current sibling checkouts without Git sync.
  --skip-git               Alias for --local-source.
  --discard-local-changes  After review, discard mapped-repository changes.
  -h, --help               Show this help.
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
    [ "$confirmation" = "DISCARD" ] || { echo "Update cancelled." >&2; exit 65; }
    DISCARD_LOCAL_CHANGES=true
  fi
  [ "$DISCARD_LOCAL_CHANGES" = "false" ] || export TMAPP_DISCARD_LOCAL_CHANGES=1
  bash "$CONTAINER_DIR/scripts/source-stack.sh" update
}

shared_state() {
  for container in \
    "$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)" \
    "$(env_value REDIS_CONTAINER_NAME cxapp-redis)" \
    "$(env_value MEDIA_CONTAINER_NAME cxapp-media)"; do
    docker inspect "$container" --format '{{.Name}}|container={{.Id}}'
    docker inspect "$container" \
      --format '{{range .Mounts}}{{if eq .Type "volume"}}volume={{.Name}}|destination={{.Destination}}{{println}}{{end}}{{end}}'
  done
  for network in \
    "$(env_value SHARED_DOCKER_NETWORK cxapp-network)" \
    "$(env_value SHARED_EDGE_NETWORK cxapp-edge)"; do
    docker network inspect "$network" --format '{{.Name}}|network={{.Id}}'
  done
}

confirm_git_update() {
  if [ "$LOCAL_SOURCE" = "true" ]; then
    return
  fi
  if [ "$ASSUME_YES" = "true" ]; then
    return
  fi
  read -r -p "Check and update Git repositories before update? [Y/n] " answer
  case "${answer:-Y}" in
    y|Y|yes|YES|Yes) ;;
    *) LOCAL_SOURCE=true ;;
  esac
}

echo "TMApp update"
confirm_git_update
command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 69; }
sync_sources
run_preflight
ensure_master_database

if [ "$ASSUME_YES" = "false" ]; then
  read -r -p "Build and replace only TMApp application containers? [Y/n] " answer
  case "${answer:-Y}" in y|Y|yes|YES|Yes) ;; *) echo "Update cancelled."; exit 0 ;; esac
fi

shared_before=$(shared_state | sort)
tmapp_volume=$(env_value TMAPP_DATA_VOLUME tmapp-data)
volume_before=$(docker volume inspect "$tmapp_volume" --format '{{.Name}}={{.Mountpoint}}' 2>/dev/null || true)

bash "$CONTAINER_DIR/deploy.sh" --reinstall
bash "$CONTAINER_DIR/scripts/smoke-test.sh"

[ "$(shared_state | sort)" = "$shared_before" ] || {
  echo "Shared infrastructure identity changed unexpectedly." >&2
  diff -u <(printf '%s\n' "$shared_before") <(shared_state | sort) || true
  exit 74
}
[ "$(docker volume inspect "$tmapp_volume" --format '{{.Name}}={{.Mountpoint}}')" = "$volume_before" ] || {
  echo "TMApp persistent volume identity changed unexpectedly." >&2
  exit 74
}

echo
echo "TMApp update completed and healthy."
echo "Shared MariaDB, Redis, Media, backend and edge networks, and persistent volumes were preserved."
