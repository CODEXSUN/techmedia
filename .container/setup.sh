#!/usr/bin/env bash
set -euo pipefail

CONTAINER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$CONTAINER_DIR/.." && pwd)"
WORKSPACE_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
RUNTIME_ENV="${TECHMEDIA_RUNTIME_ENV:-$CONTAINER_DIR/.env}"
DEPLOY_ENV="${TECHMEDIA_DEPLOY_ENV:-$CONTAINER_DIR/deploy.env}"
DEPLOY_ENV_EXAMPLE="$CONTAINER_DIR/deploy.env.example"
COMPOSE_FILE="$CONTAINER_DIR/docker-compose.yml"
SHARED_REPOSITORIES=(framework ui core)

usage() {
  cat <<'EOF'
Usage: bash setup.sh

Interactive standalone TechMedia container installation.

Configuration:
  .container/.env         TechMedia production runtime and application secrets
  .container/deploy.env  Docker topology and MariaDB infrastructure secret

Included:
  - Framework public platform contracts
  - UI
  - Core build dependency
  - TechMedia Platform API and Web
  - TechMedia-owned MariaDB

Excluded:
  - CXApp, Billing, DevKit, Mail, TMApp, Trades, Redis, Media, and all other stacks

The setup asks whether to reuse or freshly clone shared source checkouts.
If TechMedia MariaDB data already exists, it separately asks whether to reuse
or freshly recreate only the TechMedia database volume.
EOF
}

case "${1:-}" in
  "") ;;
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

set_file_value() {
  local file="$1" key="$2" value="$3" temporary
  temporary="${file}.tmp"
  KEY="$key" VALUE="$value" awk '
    BEGIN { found = 0 }
    index($0, ENVIRON["KEY"] "=") == 1 {
      print ENVIRON["KEY"] "=" ENVIRON["VALUE"]
      found = 1
      next
    }
    { print }
    END { if (!found) print ENVIRON["KEY"] "=" ENVIRON["VALUE"] }
  ' "$file" > "$temporary"
  mv "$temporary" "$file"
}

set_default_if_empty() {
  local file="$1" key="$2" value="$3"
  [[ -n "$(file_value "$file" "$key")" ]] || set_file_value "$file" "$key" "$value"
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  fi
}

ensure_secret() {
  local file="$1" key="$2" value
  value="$(file_value "$file" "$key")"
  case "$value" in
    ""|generate-with-setup|change_this*)
      set_file_value "$file" "$key" "$(generate_secret)"
      ;;
  esac
}

prompt_setting_if_empty() {
  local file="$1" key="$2" label="$3" default_value="$4" value
  [[ -n "$(file_value "$file" "$key")" ]] && return
  read -r -p "$label [default: $default_value]: " value
  set_file_value "$file" "$key" "${value:-$default_value}"
}

prompt_secret_if_empty() {
  local file="$1" key="$2" label="$3" value confirmation
  [[ -n "$(file_value "$file" "$key")" ]] && return
  while true; do
    read -r -s -p "$label: " value
    echo
    [[ -n "$value" ]] || {
      echo "$label cannot be empty." >&2
      continue
    }
    read -r -s -p "Confirm $label: " confirmation
    echo
    if [[ "$value" == "$confirmation" ]]; then
      set_file_value "$file" "$key" "$value"
      return
    fi
    echo "Values do not match. Try again." >&2
  done
}

prepare_deploy_environment() {
  if [[ ! -f "$DEPLOY_ENV" ]]; then
    cp "$DEPLOY_ENV_EXAMPLE" "$DEPLOY_ENV"
    echo "Created protected deployment settings: $DEPLOY_ENV"
  fi

  local version node_version npm_version
  case "$(file_value "$DEPLOY_ENV" DB_USER)" in
    ""|root)
      set_file_value "$DEPLOY_ENV" DB_USER techmedia
      echo "Configured the dedicated deployment database user: techmedia"
      ;;
  esac
  set_default_if_empty "$DEPLOY_ENV" DB_NAME techmedia_db
  ensure_secret "$DEPLOY_ENV" MARIADB_ROOT_PASSWORD
  ensure_secret "$DEPLOY_ENV" DB_PASSWORD
  version="$(grep -m1 '"version"' "$ROOT_DIR/package.json" | cut -d'"' -f4)"
  node_version="$(grep -m1 '"node"' "$ROOT_DIR/package.json" | cut -d'"' -f4 | sed 's/^[^0-9]*//')"
  npm_version="$(grep -m1 '"packageManager"' "$ROOT_DIR/package.json" | cut -d'"' -f4 | sed 's/^npm@//')"
  set_file_value "$DEPLOY_ENV" TECHMEDIA_IMAGE_TAG "$version"
  set_file_value "$DEPLOY_ENV" NODE_RUNTIME_VERSION "$node_version"
  set_file_value "$DEPLOY_ENV" NPM_RUNTIME_VERSION "$npm_version"
  chmod 600 "$DEPLOY_ENV" 2>/dev/null || true
}

prepare_runtime_environment() {
  if [[ ! -f "$RUNTIME_ENV" ]]; then
    if [[ -f "$ROOT_DIR/.env" ]]; then
      cp "$ROOT_DIR/.env" "$RUNTIME_ENV"
      echo "Created production runtime settings from the root .env: $RUNTIME_ENV"
    else
      cp "$ROOT_DIR/.env.example" "$RUNTIME_ENV"
      echo "Created production runtime settings: $RUNTIME_ENV"
    fi
  fi

  ensure_secret "$RUNTIME_ENV" JWT_SECRET

  prompt_setting_if_empty "$RUNTIME_ENV" INITIAL_ADMIN_NAME \
    "Initial administrator name" Administrator
  prompt_setting_if_empty "$RUNTIME_ENV" INITIAL_ADMIN_EMAIL \
    "Initial administrator email" admin@techmedia.in
  prompt_secret_if_empty "$RUNTIME_ENV" INITIAL_ADMIN_PASSWORD \
    "Initial administrator password"

  set_file_value "$RUNTIME_ENV" NODE_ENV production
  set_file_value "$RUNTIME_ENV" AUTH_MODE jwt
  set_file_value "$RUNTIME_ENV" DEV_AUTO_LOGIN 0
  set_file_value "$RUNTIME_ENV" VITE_DEV_AUTO_LOGIN 0
  set_file_value "$RUNTIME_ENV" DB_DRIVER mariadb
  set_file_value "$RUNTIME_ENV" DB_HOST mariadb
  set_file_value "$RUNTIME_ENV" DB_PORT 3306
  set_file_value "$RUNTIME_ENV" DB_USER "$(file_value "$DEPLOY_ENV" DB_USER)"
  set_file_value "$RUNTIME_ENV" DB_PASSWORD "$(file_value "$DEPLOY_ENV" DB_PASSWORD)"
  set_file_value "$RUNTIME_ENV" DB_NAME "$(file_value "$DEPLOY_ENV" DB_NAME)"
  set_file_value "$RUNTIME_ENV" PLATFORM_API_PORT \
    "$(file_value "$DEPLOY_ENV" TECHMEDIA_API_INTERNAL_PORT 7050)"
  set_file_value "$RUNTIME_ENV" PLATFORM_WEB_PORT \
    "$(file_value "$DEPLOY_ENV" TECHMEDIA_WEB_HOST_PORT 7060)"
  set_file_value "$RUNTIME_ENV" TECHMEDIA_DB_FRESH_ON_START 0
  set_file_value "$RUNTIME_ENV" TECHMEDIA_DB_RESET_CONFIRM ""
  set_file_value "$RUNTIME_ENV" TECHMEDIA_ALLOW_PRODUCTION_DB_RESET 0
  set_default_if_empty "$RUNTIME_ENV" PLATFORM_API_URL http://127.0.0.1:7050
  set_default_if_empty "$RUNTIME_ENV" PLATFORM_WEB_ORIGIN http://127.0.0.1:7060
  set_default_if_empty "$RUNTIME_ENV" PLATFORM_WEB_HEALTH_URL http://127.0.0.1:7060/status
  set_default_if_empty "$RUNTIME_ENV" FRAPPE_ENABLED 1
  set_default_if_empty "$RUNTIME_ENV" FRAPPE_CONNECTION_NAME Frappe
  set_default_if_empty "$RUNTIME_ENV" FRAPPE_VERIFICATION_STATUS unverified
  chmod 600 "$RUNTIME_ENV" 2>/dev/null || true
}

validate_runtime_environment() {
  local key value
  for key in DB_USER DB_PASSWORD DB_NAME JWT_SECRET INITIAL_ADMIN_EMAIL INITIAL_ADMIN_PASSWORD; do
    [[ -n "$(file_value "$RUNTIME_ENV" "$key")" ]] || {
      echo "$key must be configured in $RUNTIME_ENV." >&2
      exit 78
    }
  done
  value="$(file_value "$RUNTIME_ENV" DB_USER)"
  [[ "$value" != root ]] || {
    echo "DB_USER must be a dedicated non-root account." >&2
    exit 78
  }
  [[ "$value" =~ ^[A-Za-z0-9_]+$ ]] || {
    echo "DB_USER may contain only letters, numbers, and underscores." >&2
    exit 78
  }
  value="$(file_value "$RUNTIME_ENV" DB_NAME)"
  [[ "$value" =~ ^[A-Za-z0-9_]+$ ]] || {
    echo "DB_NAME may contain only letters, numbers, and underscores." >&2
    exit 78
  }
}

repository_path() {
  printf '%s/%s' "$WORKSPACE_ROOT" "$1"
}

clone_repository() {
  local repository="$1"
  git clone --branch main --single-branch \
    "https://github.com/CODEXSUN/${repository}.git" "$(repository_path "$repository")"
}

validate_repository() {
  local repository="$1" directory
  directory="$(repository_path "$repository")"
  [[ -d "$directory/.git" && -f "$directory/package.json" ]] || {
    echo "Invalid shared repository checkout: $directory" >&2
    exit 73
  }
}

select_shared_mode() {
  local answer
  while true; do
    read -r -p "Reuse existing Framework/UI/Core source or prepare fresh checkouts? [reuse/fresh] " answer
    case "${answer:-reuse}" in
      reuse|Reuse|REUSE)
        printf 'reuse'
        return
        ;;
      fresh|Fresh|FRESH)
        printf 'fresh'
        return
        ;;
      *)
        echo "Enter reuse or fresh." >&2
        ;;
    esac
  done
}

prepare_shared_repositories() {
  local mode="$1" repository directory
  if [[ "$mode" == fresh ]]; then
    for repository in "${SHARED_REPOSITORIES[@]}"; do
      directory="$(repository_path "$repository")"
      [[ ! -e "$directory" ]] || {
        echo "Fresh shared source requires this path to be moved aside manually: $directory" >&2
        exit 73
      }
    done
  fi

  for repository in "${SHARED_REPOSITORIES[@]}"; do
    directory="$(repository_path "$repository")"
    [[ -e "$directory" ]] || clone_repository "$repository"
    validate_repository "$repository"
  done
}

compose() {
  TECHMEDIA_RUNTIME_ENV_FILE="$RUNTIME_ENV" docker compose \
    --env-file "$RUNTIME_ENV" \
    --env-file "$DEPLOY_ENV" \
    -f "$COMPOSE_FILE" "$@"
}

safe_docker_name() {
  [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] || {
    echo "Unsafe Docker resource name: $1" >&2
    exit 78
  }
}

select_database_mode() {
  local volume="$1" answer confirmation
  if ! docker volume inspect "$volume" >/dev/null 2>&1; then
    printf 'fresh'
    return
  fi

  while true; do
    read -r -p "Reuse or freshly recreate TechMedia MariaDB data? [reuse/fresh] " answer
    case "${answer:-reuse}" in
      reuse|Reuse|REUSE)
        printf 'reuse'
        return
        ;;
      fresh|Fresh|FRESH)
        read -r -p "Type FRESH $volume to delete only this TechMedia volume: " confirmation
        [[ "$confirmation" == "FRESH $volume" ]] || {
          echo "Fresh database preparation cancelled." >&2
          exit 78
        }
        printf 'fresh'
        return
        ;;
      *)
        echo "Enter reuse or fresh." >&2
        ;;
    esac
  done
}

sql_string() {
  printf '%s' "$1" | sed "s/'/''/g"
}

reconcile_database_user() {
  local container database user password root_password escaped_password
  container="$(file_value "$DEPLOY_ENV" TECHMEDIA_MARIADB_CONTAINER_NAME techmedia-mariadb)"
  database="$(file_value "$RUNTIME_ENV" DB_NAME)"
  user="$(file_value "$RUNTIME_ENV" DB_USER)"
  password="$(file_value "$RUNTIME_ENV" DB_PASSWORD)"
  root_password="$(file_value "$DEPLOY_ENV" MARIADB_ROOT_PASSWORD)"
  escaped_password="$(sql_string "$password")"
  safe_docker_name "$container"

  if ! MSYS_NO_PATHCONV=1 docker exec -i -e MYSQL_PWD="$root_password" "$container" \
    mariadb --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`$database\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$user'@'%' IDENTIFIED BY '$escaped_password';
ALTER USER '$user'@'%' IDENTIFIED BY '$escaped_password';
GRANT ALL PRIVILEGES ON \`$database\`.* TO '$user'@'%';
FLUSH PRIVILEGES;
SQL
  then
    echo "Could not reconcile the TechMedia MariaDB application user." >&2
    echo "For reused data, verify MARIADB_ROOT_PASSWORD in $DEPLOY_ENV." >&2
    exit 78
  fi
}

require_command git
require_command node
require_command docker
docker info >/dev/null 2>&1 || {
  echo "Docker Engine is not reachable." >&2
  exit 69
}
docker compose version >/dev/null 2>&1 || {
  echo "Docker Compose v2 is required." >&2
  exit 69
}

prepare_deploy_environment
prepare_runtime_environment
validate_runtime_environment
shared_mode="$(select_shared_mode)"
prepare_shared_repositories "$shared_mode"

database_volume="$(file_value "$DEPLOY_ENV" TECHMEDIA_MARIADB_DATA_VOLUME techmedia-mariadb-data)"
safe_docker_name "$database_volume"
database_mode="$(select_database_mode "$database_volume")"

compose config --quiet

echo
echo "Standalone TechMedia deployment plan"
echo "  Runtime env: $RUNTIME_ENV"
echo "  Deploy env: $DEPLOY_ENV"
echo "  Shared source: $shared_mode"
echo "  MariaDB data: $database_mode"
echo "  Images: Framework -> UI -> Core -> TechMedia Platform API/Web"
echo "  Runtime: TechMedia API, TechMedia Web, TechMedia MariaDB"
echo "  Excluded: CXApp, TMApp, Billing, DevKit, Mail, Trades, Redis, and Media"
read -r -p "Build and apply this standalone TechMedia installation? [Y/n] " confirmation
case "${confirmation:-Y}" in
  y|Y|yes|Yes|YES) ;;
  *)
    echo "Setup cancelled before Docker changes."
    exit 0
    ;;
esac

if [[ "$database_mode" == fresh ]] && docker volume inspect "$database_volume" >/dev/null 2>&1; then
  compose down --remove-orphans
  docker volume rm "$database_volume" >/dev/null
fi

compose build api web
compose up -d mariadb --wait --wait-timeout 180
reconcile_database_user
compose up -d api web --no-build --force-recreate --wait --wait-timeout 300

echo
echo "TechMedia standalone installation completed."
echo "Web: http://$(file_value "$DEPLOY_ENV" TECHMEDIA_BIND_ADDRESS 127.0.0.1):$(file_value "$DEPLOY_ENV" TECHMEDIA_WEB_HOST_PORT 7060)/"
echo "API health: http://$(file_value "$DEPLOY_ENV" TECHMEDIA_BIND_ADDRESS 127.0.0.1):$(file_value "$DEPLOY_ENV" TECHMEDIA_API_HOST_PORT 7050)/health"
