#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$CONTAINER_DIR/.." && pwd)"
WORKSPACE_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
ACTION=${1:-update}
DISCARD_LOCAL_CHANGES=${TMAPP_DISCARD_LOCAL_CHANGES:-0}
PACKAGE_REPOSITORIES="framework ui core"

case "$ACTION" in
  install|update) ;;
  *) echo "Usage: .container/scripts/source-stack.sh <install|update>" >&2; exit 64 ;;
esac

command -v git >/dev/null 2>&1 || { echo "Git is required." >&2; exit 69; }
echo "Git preflight: $(git --version)"

for repository in $PACKAGE_REPOSITORIES; do
  directory="$WORKSPACE_ROOT/$repository"
  remote="https://github.com/CODEXSUN/${repository}.git"
  if [ ! -d "$directory/.git" ]; then
    if [ -e "$directory" ]; then
      echo "Cannot clone $repository: $directory exists but is not a Git repository." >&2
      exit 73
    fi
    git clone --branch main --single-branch "$remote" "$directory"
  fi
done

directories=(
  "$PROJECT_ROOT"
  "$WORKSPACE_ROOT/framework"
  "$WORKSPACE_ROOT/ui"
  "$WORKSPACE_ROOT/core"
)

for directory in "${directories[@]}"; do
  repository=$(basename "$directory")
  branch=$(git -C "$directory" branch --show-current)
  [ "$branch" = "main" ] || {
    echo "Source update stopped: $repository is on ${branch:-a detached HEAD}, not main." >&2
    exit 65
  }
  git -C "$directory" remote get-url origin >/dev/null 2>&1 || {
    echo "Source update stopped: $repository has no origin remote." >&2
    exit 65
  }
  if [ -n "$(git -C "$directory" status --porcelain)" ]; then
    if [ "$DISCARD_LOCAL_CHANGES" != "1" ]; then
      echo "Source update stopped: uncommitted changes in $repository ($directory)." >&2
      exit 65
    fi
    echo "Discarding reviewed local changes in $repository."
    git -C "$directory" restore --staged --worktree .
    git -C "$directory" clean -fd
  fi
done

echo "Fetching origin/main for all four TMApp repositories."
for directory in "${directories[@]}"; do
  git -C "$directory" fetch --prune origin main
done

for directory in "${directories[@]}"; do
  repository=$(basename "$directory")
  read -r ahead behind < <(git -C "$directory" rev-list --left-right --count HEAD...refs/remotes/origin/main)
  printf '%-10s local=%s remote=%s ahead=%s behind=%s\n' \
    "$repository" \
    "$(git -C "$directory" rev-parse --short HEAD)" \
    "$(git -C "$directory" rev-parse --short refs/remotes/origin/main)" \
    "$ahead" "$behind"
  [ "$ahead" -eq 0 ] || {
    echo "Source update stopped: $repository is ahead of or diverged from origin/main." >&2
    exit 65
  }
done

for directory in "${directories[@]}"; do
  repository=$(basename "$directory")
  before=$(git -C "$directory" rev-parse --short HEAD)
  git -C "$directory" merge --ff-only refs/remotes/origin/main
  echo "$repository: $before -> $(git -C "$directory" rev-parse --short HEAD)"
done

echo "TMApp sources are synchronized under $WORKSPACE_ROOT."
