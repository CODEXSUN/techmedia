#!/usr/bin/env bash
set -euo pipefail

CONTAINER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$CONTAINER_DIR/.." && pwd)"
RUNTIME_ENV="${TECHMEDIA_RUNTIME_ENV:-$ROOT_DIR/.env}"
RUNTIME_ENV_EXAMPLE="$ROOT_DIR/.env.example"
DEPLOY_ENV="${TECHMEDIA_DEPLOY_ENV:-$CONTAINER_DIR/deploy.env}"
DEPLOY_ENV_EXAMPLE="$CONTAINER_DIR/deploy.env.example"
COMPOSE_FILE="$CONTAINER_DIR/docker-compose.yml"

usage() {
  cat <<'EOF'
Usage: bash setup.sh

Interactive standalone TechMedia container installation.

The installer reviews Docker resources, host ports, database identity, and
administrator credentials. Application URLs, encryption, and Frappe connection
values are read from the root .env without prompting. Frappe is always enabled.
Press Enter at any prompt to keep the displayed value.

Configuration:
  .env                    TechMedia runtime, application, and Frappe settings
  .container/deploy.env  Docker topology and MariaDB infrastructure secret

Included:
  - Repository-owned Framework public platform contracts
  - Repository-owned UI
  - TechMedia Platform API and Web
  - Reused existing Docker network and MariaDB, or TechMedia-owned infrastructure

Excluded:
  - CXApp, Billing, DevKit, Mail, TMApp, Trades, Redis, Media, and all other stacks

The setup builds only this self-contained TechMedia repository. It asks whether
to reuse an existing Docker network and running MariaDB container or create a
dedicated TechMedia network and MariaDB. TechMedia uses only MariaDB; optional
Redis and Media containers are detected and left untouched.
If dedicated TechMedia MariaDB data already exists, setup separately asks
whether to reuse or freshly recreate only the TechMedia database volume.
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

prompt_setting() {
  local file="$1" key="$2" label="$3" default_value="$4" current value
  current="$(file_value "$file" "$key" "$default_value")"
  read -r -p "$label [$current]: " value
  set_file_value "$file" "$key" "${value:-$current}"
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

prompt_secret() {
  local file="$1" key="$2" label="$3" current answer
  current="$(file_value "$file" "$key")"
  if [[ -n "$current" && "$current" != generate-with-setup && "$current" != change_this* ]]; then
    read -r -p "$label is configured. Keep it? [Y/n] " answer
    case "${answer:-Y}" in
      n|N|no|No|NO)
        set_file_value "$file" "$key" ""
        ;;
      *)
        return
        ;;
    esac
  fi
  prompt_secret_if_empty "$file" "$key" "$label"
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
  set_file_value "$DEPLOY_ENV" TECHMEDIA_VERSION "$version"
  set_file_value "$DEPLOY_ENV" TECHMEDIA_IMAGE_TAG "$version"
  set_file_value "$DEPLOY_ENV" TECHMEDIA_MIGRATION_COMPATIBLE_VERSION "$version"
  set_default_if_empty "$DEPLOY_ENV" TECHMEDIA_BACKUP_RETENTION 10
  set_default_if_empty "$DEPLOY_ENV" TECHMEDIA_UPDATE_MIN_BACKUP_FREE_MB 1024
  set_default_if_empty "$DEPLOY_ENV" TECHMEDIA_UPDATE_MIN_DOCKER_FREE_MB 5120
  set_default_if_empty "$DEPLOY_ENV" TECHMEDIA_FILE_MANAGER_STORAGE_VOLUME techmedia-file-manager-storage
  set_file_value "$DEPLOY_ENV" NODE_RUNTIME_VERSION "$node_version"
  set_file_value "$DEPLOY_ENV" NPM_RUNTIME_VERSION "$npm_version"
  chmod 600 "$DEPLOY_ENV" 2>/dev/null || true
}

configure_deploy_environment() {
  echo
  echo "Docker deployment settings"
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_COMPOSE_PROJECT "Compose project" techmedia
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_IMAGE_REGISTRY "Image registry/prefix" techmedia
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_API_CONTAINER_NAME "API container name" techmedia-api
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_WEB_CONTAINER_NAME "Web container name" techmedia-web
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_BIND_ADDRESS "Host bind address" 127.0.0.1
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_API_HOST_PORT "API host port" 7050
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_WEB_HOST_PORT "Web host port" 7060
  prompt_setting "$DEPLOY_ENV" DB_NAME "Application database name" techmedia_db
  prompt_setting "$DEPLOY_ENV" DB_USER "Application database user" techmedia
  prompt_secret "$DEPLOY_ENV" DB_PASSWORD "Application database password"
}

prepare_runtime_environment() {
  local infrastructure_mode="$1" database_host
  ensure_secret "$RUNTIME_ENV" JWT_SECRET
  ensure_secret "$RUNTIME_ENV" FILE_MANAGER_ENCRYPTION_KEY

  set_file_value "$RUNTIME_ENV" NODE_ENV production
  set_file_value "$RUNTIME_ENV" AUTH_MODE jwt
  set_file_value "$RUNTIME_ENV" DEV_AUTO_LOGIN 0
  set_file_value "$RUNTIME_ENV" VITE_DEV_AUTO_LOGIN 0
  set_file_value "$RUNTIME_ENV" DB_DRIVER mariadb
  if [[ "$infrastructure_mode" == shared ]]; then
    database_host="$(file_value "$DEPLOY_ENV" TECHMEDIA_SHARED_MARIADB_CONTAINER_NAME cxapp-mariadb)"
  else
    database_host=mariadb
  fi
  set_file_value "$RUNTIME_ENV" DB_HOST "$database_host"
  set_file_value "$RUNTIME_ENV" DB_PORT 3306
  set_file_value "$RUNTIME_ENV" DB_USER "$(file_value "$DEPLOY_ENV" DB_USER)"
  set_file_value "$RUNTIME_ENV" DB_PASSWORD "$(file_value "$DEPLOY_ENV" DB_PASSWORD)"
  set_file_value "$RUNTIME_ENV" DB_NAME "$(file_value "$DEPLOY_ENV" DB_NAME)"
  set_file_value "$RUNTIME_ENV" FILE_MANAGER_DB_HOST "$database_host"
  set_file_value "$RUNTIME_ENV" FILE_MANAGER_DB_PORT 3306
  set_file_value "$RUNTIME_ENV" FILE_MANAGER_DB_USER "$(file_value "$DEPLOY_ENV" DB_USER)"
  set_file_value "$RUNTIME_ENV" FILE_MANAGER_DB_PASSWORD "$(file_value "$DEPLOY_ENV" DB_PASSWORD)"
  set_file_value "$RUNTIME_ENV" FILE_MANAGER_DB_NAME "$(file_value "$DEPLOY_ENV" DB_NAME)"
  set_file_value "$RUNTIME_ENV" FILE_MANAGER_LOCAL_ROOT /storage/file-manager
  set_default_if_empty "$RUNTIME_ENV" FILE_MANAGER_MAX_UPLOAD_BYTES 26214400
  set_file_value "$RUNTIME_ENV" PLATFORM_API_PORT \
    "$(file_value "$DEPLOY_ENV" TECHMEDIA_API_INTERNAL_PORT 7050)"
  set_file_value "$RUNTIME_ENV" PLATFORM_WEB_PORT \
    "$(file_value "$DEPLOY_ENV" TECHMEDIA_WEB_HOST_PORT 7060)"
  set_file_value "$RUNTIME_ENV" TECHMEDIA_DB_FRESH_ON_START 0
  set_file_value "$RUNTIME_ENV" TECHMEDIA_DB_RESET_CONFIRM ""
  set_file_value "$RUNTIME_ENV" TECHMEDIA_ALLOW_PRODUCTION_DB_RESET 0
  set_file_value "$RUNTIME_ENV" FRAPPE_ENABLED 1
  set_default_if_empty "$RUNTIME_ENV" FRAPPE_CONNECTION_NAME Frappe
  set_default_if_empty "$RUNTIME_ENV" FRAPPE_VERIFICATION_STATUS unverified
  chmod 600 "$RUNTIME_ENV" 2>/dev/null || true
}

ensure_runtime_environment_file() {
  if [[ ! -f "$RUNTIME_ENV" ]]; then
    cp "$RUNTIME_ENV_EXAMPLE" "$RUNTIME_ENV"
    chmod 600 "$RUNTIME_ENV" 2>/dev/null || true
    echo "Created runtime environment from .env.example: $RUNTIME_ENV"
  fi
}

configure_runtime_environment() {
  echo
  echo "Administrator settings"
  prompt_setting "$RUNTIME_ENV" INITIAL_ADMIN_NAME "Initial administrator name" Administrator
  prompt_setting "$RUNTIME_ENV" INITIAL_ADMIN_EMAIL \
    "Initial administrator email" admin@techmedia.in
  prompt_secret "$RUNTIME_ENV" INITIAL_ADMIN_PASSWORD "Initial administrator password"
}

validate_runtime_environment() {
  local key value
  for key in \
    DB_USER \
    DB_PASSWORD \
    DB_NAME \
    FILE_MANAGER_DB_HOST \
    FILE_MANAGER_DB_PORT \
    FILE_MANAGER_DB_USER \
    FILE_MANAGER_DB_PASSWORD \
    FILE_MANAGER_DB_NAME \
    FILE_MANAGER_ENCRYPTION_KEY \
    FILE_MANAGER_LOCAL_ROOT \
    FILE_MANAGER_MAX_UPLOAD_BYTES \
    JWT_SECRET \
    INITIAL_ADMIN_EMAIL \
    INITIAL_ADMIN_PASSWORD \
    PLATFORM_API_URL \
    PLATFORM_WEB_ORIGIN \
    PLATFORM_WEB_HEALTH_URL; do
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

select_infrastructure_mode() {
  local answer
  while true; do
    read -r -p \
      "Reuse an existing Docker network and MariaDB, or create dedicated TechMedia infrastructure? [reuse/dedicated] " \
      answer
    case "${answer:-dedicated}" in
      reuse|Reuse|REUSE)
        printf 'shared'
        return
        ;;
      dedicated|Dedicated|DEDICATED|fresh|Fresh|FRESH)
        printf 'dedicated'
        return
        ;;
      *)
        echo "Enter reuse or dedicated." >&2
        ;;
    esac
  done
}

prepare_shared_infrastructure() {
  local mariadb network redis media root_password name
  mariadb="$(file_value "$DEPLOY_ENV" TECHMEDIA_SHARED_MARIADB_CONTAINER_NAME cxapp-mariadb)"
  network="$(file_value "$DEPLOY_ENV" TECHMEDIA_NETWORK techmedia-network)"
  redis="$(file_value "$DEPLOY_ENV" TECHMEDIA_SHARED_REDIS_CONTAINER_NAME cxapp-redis)"
  media="$(file_value "$DEPLOY_ENV" TECHMEDIA_SHARED_MEDIA_CONTAINER_NAME cxapp-media)"
  for name in "$mariadb" "$redis" "$media"; do
    safe_docker_name "$name"
  done
  container_is_running "$mariadb" || {
    echo "Existing MariaDB container is not running: $mariadb" >&2
    exit 69
  }
  docker network inspect "$network" >/dev/null 2>&1 || {
    echo "Existing Docker network was not found: $network" >&2
    exit 69
  }
  for name in "$redis" "$media"; do
    if container_is_running "$name"; then
      echo "Detected shared container (left untouched; TechMedia does not consume it): $name"
    else
      echo "Shared optional container is unavailable and is not required by TechMedia: $name"
    fi
  done

  root_password="$(file_value "$DEPLOY_ENV" TECHMEDIA_SHARED_MARIADB_ROOT_PASSWORD)"
  [[ -n "$root_password" ]] || {
    echo "Shared MariaDB root password is unavailable." >&2
    echo "Configure TECHMEDIA_SHARED_MARIADB_ROOT_PASSWORD in $DEPLOY_ENV." >&2
    exit 78
  }
}

configure_shared_infrastructure() {
  echo
  echo "Existing infrastructure settings"
  echo "Running containers:"
  docker ps --format '  {{.Names}} ({{.Image}})' || true
  echo "Available Docker networks:"
  docker network ls --format '  {{.Name}}' || true
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_SHARED_MARIADB_CONTAINER_NAME \
    "Existing MariaDB container name" cxapp-mariadb
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_NETWORK "Existing Docker network" techmedia-network
  set_file_value "$DEPLOY_ENV" TECHMEDIA_NETWORK_EXTERNAL true
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_SHARED_REDIS_CONTAINER_NAME \
    "Shared Redis container name (detected only)" cxapp-redis
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_SHARED_MEDIA_CONTAINER_NAME \
    "Shared Media container name (detected only)" cxapp-media
  prompt_secret "$DEPLOY_ENV" TECHMEDIA_SHARED_MARIADB_ROOT_PASSWORD \
    "Shared MariaDB root password"
}

configure_dedicated_infrastructure() {
  local container replacement
  echo
  echo "Dedicated TechMedia infrastructure settings"
  if [[ "$(file_value "$DEPLOY_ENV" TECHMEDIA_NETWORK_EXTERNAL false)" == true ]]; then
    set_file_value "$DEPLOY_ENV" TECHMEDIA_NETWORK techmedia-network
  fi
  set_file_value "$DEPLOY_ENV" TECHMEDIA_NETWORK_EXTERNAL false
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_MARIADB_CONTAINER_NAME \
    "Dedicated MariaDB container name" techmedia-mariadb
  container="$(file_value "$DEPLOY_ENV" TECHMEDIA_MARIADB_CONTAINER_NAME techmedia-mariadb)"
  while docker container inspect "$container" >/dev/null 2>&1 &&
    ! container_is_compose_service "$container" \
      "$(file_value "$DEPLOY_ENV" TECHMEDIA_COMPOSE_PROJECT techmedia)" mariadb; do
    echo "Container name is already owned by existing infrastructure: $container" >&2
    read -r -p "Choose another dedicated MariaDB container name: " replacement
    set_file_value "$DEPLOY_ENV" TECHMEDIA_MARIADB_CONTAINER_NAME "$replacement"
    container="$replacement"
  done
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_NETWORK "Dedicated Docker network" techmedia-network
  prompt_setting "$DEPLOY_ENV" TECHMEDIA_MARIADB_DATA_VOLUME \
    "MariaDB data volume" techmedia-mariadb-data
  prompt_setting "$DEPLOY_ENV" MARIADB_IMAGE "MariaDB image" mariadb:11.8
  prompt_secret "$DEPLOY_ENV" MARIADB_ROOT_PASSWORD "Dedicated MariaDB root password"
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

validate_port() {
  local port="$1"
  [[ "$port" =~ ^[0-9]+$ ]] && ((port >= 1 && port <= 65535))
}

host_port_available() {
  local bind_address="$1" port="$2"
  node -e '
    const server = require("node:net").createServer();
    server.unref();
    server.once("error", () => process.exit(1));
    server.listen(Number(process.argv[2]), process.argv[1], () => {
      server.close(() => process.exit(0));
    });
  ' "$bind_address" "$port"
}

container_publishes_port() {
  local container="$1" bind_address="$2" port="$3"
  docker container inspect "$container" >/dev/null 2>&1 || return 1
  docker port "$container" 2>/dev/null | grep -Eq "(^|[[:space:]])${bind_address}:${port}$"
}

ensure_available_host_port() {
  local key="$1" label="$2" container="$3" bind_address port replacement
  bind_address="$(file_value "$DEPLOY_ENV" TECHMEDIA_BIND_ADDRESS 127.0.0.1)"
  while true; do
    port="$(file_value "$DEPLOY_ENV" "$key")"
    validate_port "$port" || {
      read -r -p "$label must be between 1 and 65535. Enter a valid port: " replacement
      set_file_value "$DEPLOY_ENV" "$key" "$replacement"
      continue
    }
    if host_port_available "$bind_address" "$port" ||
      container_publishes_port "$container" "$bind_address" "$port"; then
      return
    fi
    echo "$label $bind_address:$port is already in use." >&2
    read -r -p "Choose another $label: " replacement
    set_file_value "$DEPLOY_ENV" "$key" "$replacement"
  done
}

validate_deploy_environment() {
  local key
  for key in \
    TECHMEDIA_COMPOSE_PROJECT \
    TECHMEDIA_API_CONTAINER_NAME \
    TECHMEDIA_WEB_CONTAINER_NAME \
    TECHMEDIA_MARIADB_CONTAINER_NAME \
    TECHMEDIA_NETWORK \
    TECHMEDIA_MARIADB_DATA_VOLUME; do
    safe_docker_name "$(file_value "$DEPLOY_ENV" "$key")"
  done
  ensure_available_host_port \
    TECHMEDIA_API_HOST_PORT \
    "API host port" \
    "$(file_value "$DEPLOY_ENV" TECHMEDIA_API_CONTAINER_NAME techmedia-api)"
  ensure_available_host_port \
    TECHMEDIA_WEB_HOST_PORT \
    "Web host port" \
    "$(file_value "$DEPLOY_ENV" TECHMEDIA_WEB_CONTAINER_NAME techmedia-web)"
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
  local infrastructure_mode="$1" container database user password root_password escaped_password
  if [[ "$infrastructure_mode" == shared ]]; then
    container="$(file_value "$DEPLOY_ENV" TECHMEDIA_SHARED_MARIADB_CONTAINER_NAME cxapp-mariadb)"
    root_password="$(file_value "$DEPLOY_ENV" TECHMEDIA_SHARED_MARIADB_ROOT_PASSWORD)"
  else
    container="$(file_value "$DEPLOY_ENV" TECHMEDIA_MARIADB_CONTAINER_NAME techmedia-mariadb)"
    root_password="$(file_value "$DEPLOY_ENV" MARIADB_ROOT_PASSWORD)"
  fi
  database="$(file_value "$RUNTIME_ENV" DB_NAME)"
  user="$(file_value "$RUNTIME_ENV" DB_USER)"
  password="$(file_value "$RUNTIME_ENV" DB_PASSWORD)"
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

connect_shared_mariadb() {
  local network container
  network="$(file_value "$DEPLOY_ENV" TECHMEDIA_NETWORK techmedia-network)"
  container="$(file_value "$DEPLOY_ENV" TECHMEDIA_SHARED_MARIADB_CONTAINER_NAME cxapp-mariadb)"
  safe_docker_name "$network"
  safe_docker_name "$container"
  docker network inspect "$network" >/dev/null 2>&1 || {
    echo "Existing Docker network was not found: $network" >&2
    exit 69
  }
  if ! docker inspect --format \
    '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{println}}{{end}}' \
    "$container" | grep -Fxq "$network"; then
    docker network connect "$network" "$container"
    echo "Connected existing MariaDB container $container to external network $network."
  fi
}

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

ensure_runtime_environment_file
prepare_deploy_environment
configure_deploy_environment
infrastructure_mode="$(select_infrastructure_mode)"
if [[ "$infrastructure_mode" == shared ]]; then
  configure_shared_infrastructure
  prepare_shared_infrastructure
else
  configure_dedicated_infrastructure
fi
prepare_runtime_environment "$infrastructure_mode"
validate_deploy_environment
configure_runtime_environment
validate_runtime_environment

if [[ "$infrastructure_mode" == dedicated ]]; then
  database_volume="$(file_value "$DEPLOY_ENV" TECHMEDIA_MARIADB_DATA_VOLUME techmedia-mariadb-data)"
  safe_docker_name "$database_volume"
  database_mode="$(select_database_mode "$database_volume")"
  infrastructure_label="dedicated TechMedia network and MariaDB"
else
  database_volume=""
  database_mode="reuse existing MariaDB"
  infrastructure_label="reuse existing Docker network and MariaDB"
fi

compose config --quiet

echo
echo "Standalone TechMedia deployment plan"
echo "  Runtime env: $RUNTIME_ENV"
echo "  Deploy env: $DEPLOY_ENV"
echo "  Source: self-contained TechMedia monorepo"
echo "  Infrastructure: $infrastructure_label"
echo "  MariaDB data: $database_mode"
echo "  Images: internal Framework/UI -> TechMedia Platform API/Web"
echo "  Runtime: TechMedia API, TechMedia Web, selected MariaDB"
echo "  Excluded: CXApp, TMApp, Billing, DevKit, Mail, Trades, Redis, and Media"
read -r -p "Build and apply this standalone TechMedia installation? [Y/n] " confirmation
case "${confirmation:-Y}" in
  y|Y|yes|Yes|YES) ;;
  *)
    echo "Setup cancelled before Docker changes."
    exit 0
    ;;
esac

if [[ "$infrastructure_mode" == dedicated && "$database_mode" == fresh ]] &&
  docker volume inspect "$database_volume" >/dev/null 2>&1; then
  compose down --remove-orphans
  docker volume rm "$database_volume" >/dev/null
fi

compose build api web
if [[ "$infrastructure_mode" == shared ]]; then
  connect_shared_mariadb
  reconcile_database_user shared
  compose up -d api web --no-build --no-deps --force-recreate --wait --wait-timeout 300
else
  compose up -d mariadb --wait --wait-timeout 180
  reconcile_database_user dedicated
  compose up -d api web --no-build --force-recreate --wait --wait-timeout 300
fi

echo
echo "TechMedia standalone installation completed."
echo "Web: http://$(file_value "$DEPLOY_ENV" TECHMEDIA_BIND_ADDRESS 127.0.0.1):$(file_value "$DEPLOY_ENV" TECHMEDIA_WEB_HOST_PORT 7060)/"
echo "API health: http://$(file_value "$DEPLOY_ENV" TECHMEDIA_BIND_ADDRESS 127.0.0.1):$(file_value "$DEPLOY_ENV" TECHMEDIA_API_HOST_PORT 7050)/health"
