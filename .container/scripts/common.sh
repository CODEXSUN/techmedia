#!/usr/bin/env sh
set -eu

CONTAINER_DIR=${CONTAINER_DIR:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)}
if [ "$(basename "$CONTAINER_DIR")" = "scripts" ]; then
  CONTAINER_DIR=$(CDPATH= cd -- "$CONTAINER_DIR/.." && pwd)
fi
PROJECT_ROOT=$(CDPATH= cd -- "$CONTAINER_DIR/.." && pwd)
DEPLOY_ENV=${TMAPP_DEPLOY_ENV:-${TECHMEDIA_DEPLOY_ENV:-$CONTAINER_DIR/deploy.env}}
INFRA_ENV=${CXAPP_INFRA_ENV:-${CODEXSUN_INFRA_ENV:-$PROJECT_ROOT/../codexsun/.container/deploy.env}}

env_value() {
  key="$1"
  default_value=${2:-}
  value=$(grep -E "^${key}=" "$DEPLOY_ENV" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)
  printf '%s' "${value:-$default_value}"
}

infra_env_value() {
  key="$1"
  default_value=${2:-}
  value=$(grep -E "^${key}=" "$INFRA_ENV" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)
  printf '%s' "${value:-$default_value}"
}

set_env_value() {
  key="$1"
  value="$2"
  tmp="$DEPLOY_ENV.tmp"
  KEY="$key" VALUE="$value" awk '
    BEGIN { found = 0 }
    index($0, ENVIRON["KEY"] "=") == 1 {
      print ENVIRON["KEY"] "=" ENVIRON["VALUE"]
      found = 1
      next
    }
    { print }
    END { if (!found) print ENVIRON["KEY"] "=" ENVIRON["VALUE"] }
  ' "$DEPLOY_ENV" > "$tmp"
  mv "$tmp" "$DEPLOY_ENV"
}

set_default_if_empty() {
  key="$1"
  default_value="$2"
  [ -n "$(env_value "$key" "")" ] || set_env_value "$key" "$default_value"
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v node >/dev/null 2>&1; then
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  else
    od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
  fi
}

ensure_secret() {
  key="$1"
  case "$(env_value "$key" "")" in
    ""|change_this*)
      set_env_value "$key" "$(generate_secret)"
      echo "Generated $key."
      ;;
  esac
}

prepare_env() {
  if [ ! -f "$DEPLOY_ENV" ]; then
    cp "$CONTAINER_DIR/deploy.env.example" "$DEPLOY_ENV"
    echo "Created $DEPLOY_ENV."
  fi

  version=$(grep -m1 '"version"' "$PROJECT_ROOT/package.json" | cut -d'"' -f4)
  node_version=$(grep -m1 -E '"node"[[:space:]]*:' "$PROJECT_ROOT/package.json" | cut -d'"' -f4 | sed 's/^[^0-9]*//')
  npm_version=$(grep -m1 '"packageManager"' "$PROJECT_ROOT/package.json" | cut -d'"' -f4 | sed 's/^npm@//')
  set_env_value TMAPP_VERSION "$version"
  set_env_value NODE_RUNTIME_VERSION "$node_version"
  set_env_value NPM_RUNTIME_VERSION "$npm_version"
  set_env_value TMAPP_IMAGE_REGISTRY tmapp
  set_env_value TMAPP_API_IMAGE_TAG "$version"
  set_env_value TMAPP_WEB_IMAGE_TAG "$version"

  set_default_if_empty TMAPP_BIND_ADDRESS "$(env_value TECHMEDIA_BIND_ADDRESS 127.0.0.1)"
  set_default_if_empty TMAPP_WEB_HOST "$(env_value TECHMEDIA_WEB_HOST logicx.tmnext.in)"
  for key in TMAPP_WEB_HOST TECHMEDIA_WEB_HOST; do
    if [ "$(env_value "$key" "")" = "app.techmedia.in" ]; then
      set_env_value "$key" "logicx.tmnext.in"
    fi
  done
  if [ "$(env_value PLATFORM_WEB_ORIGIN "")" = "https://app.techmedia.in" ]; then
    set_env_value PLATFORM_WEB_ORIGIN "https://logicx.tmnext.in"
  fi
  if [ "$(env_value DEFAULT_TENANT_DOMAIN "")" = "app.techmedia.in" ]; then
    set_env_value DEFAULT_TENANT_DOMAIN "logicx.tmnext.in"
  fi
  legacy_tenants=$(env_value DEFAULT_TENANTS_JSON "")
  case "$legacy_tenants" in
    *app.techmedia.in*)
      set_env_value DEFAULT_TENANTS_JSON "$(printf '%s' "$legacy_tenants" | sed 's/app\.techmedia\.in/logicx.tmnext.in/g')"
      ;;
  esac
  if [ -z "$(env_value TMAPP_DATA_VOLUME "")" ]; then
    legacy_volume=$(env_value TECHMEDIA_DATA_VOLUME "")
    set_env_value TMAPP_DATA_VOLUME "${legacy_volume:-tmapp-data}"
  fi
  if [ "$(env_value PLATFORM_API_URL "")" = "http://techmedia-api:7050" ]; then
    set_env_value PLATFORM_API_URL "http://platform-api:7050"
  fi
  if [ "$(env_value PLATFORM_WEB_HEALTH_URL "")" = "http://techmedia-web:80" ]; then
    set_env_value PLATFORM_WEB_HEALTH_URL "http://platform-web:80"
  fi

  [ -f "$INFRA_ENV" ] || {
    echo "Shared CXApp infrastructure env is missing: $INFRA_ENV" >&2
    echo "Install or repair the shared infrastructure from the CODEXSUN repository first." >&2
    exit 69
  }

  set_env_value SHARED_DOCKER_NETWORK "$(infra_env_value CODEXSUN_DOCKER_NETWORK cxapp-network)"
  set_env_value SHARED_EDGE_NETWORK "$(infra_env_value CODEXSUN_EDGE_NETWORK cxapp-edge)"
  set_env_value MARIADB_CONTAINER_NAME "$(infra_env_value MARIADB_CONTAINER_NAME cxapp-mariadb)"
  set_env_value REDIS_CONTAINER_NAME "$(infra_env_value REDIS_CONTAINER_NAME cxapp-redis)"
  set_env_value MEDIA_CONTAINER_NAME "$(infra_env_value MEDIA_CONTAINER_NAME cxapp-media)"
  set_env_value DB_HOST "$(infra_env_value MARIADB_CONTAINER_NAME cxapp-mariadb)"
  set_env_value DB_USER "$(infra_env_value DB_USER cxapp_app)"
  set_env_value DB_PASSWORD "$(infra_env_value DB_PASSWORD "")"
  set_env_value SHARED_REDIS_USER "$(infra_env_value REDIS_USER default)"
  set_env_value SHARED_REDIS_PASSWORD "$(infra_env_value REDIS_PASSWORD "")"

  for key in JWT_SECRET SUPER_ADMIN_PASSWORD TENANT_ADMIN_PASSWORD DEFAULT_TENANT_ADMIN_PASSWORD; do
    ensure_secret "$key"
  done

  redis_user=$(env_value SHARED_REDIS_USER default)
  redis_password=$(env_value SHARED_REDIS_PASSWORD "")
  redis_container=$(env_value REDIS_CONTAINER_NAME cxapp-redis)
  set_env_value TECHMEDIA_REDIS_URL "redis://${redis_user}:${redis_password}@${redis_container}:6379/1"
  chmod 600 "$DEPLOY_ENV" 2>/dev/null || true
}

validate_env() {
  [ -n "$(env_value DB_PASSWORD "")" ] || { echo "Shared DB_PASSWORD is unavailable." >&2; exit 78; }
  [ -n "$(env_value SHARED_REDIS_PASSWORD "")" ] || { echo "Shared Redis password is unavailable." >&2; exit 78; }
  [ "$(env_value DB_USER root)" != "root" ] || { echo "DB_USER must be a dedicated non-root account." >&2; exit 78; }
  [ "$(env_value TECHMEDIA_DB_FRESH_ON_START 0)" = "0" ] || { echo "Production database reset must remain disabled." >&2; exit 78; }
  [ "$(env_value TECHMEDIA_ALLOW_PRODUCTION_DB_RESET 0)" = "0" ] || { echo "Production database reset must remain disabled." >&2; exit 78; }
  [ "$(env_value TECHMEDIA_ALLOW_LIVE_RESTORE 0)" = "0" ] || { echo "Live restore must remain disabled during deployment." >&2; exit 78; }
  [ -n "$(env_value TECHMEDIA_VERIFIED_BACKUP_ID "")" ] || {
    echo "TECHMEDIA_VERIFIED_BACKUP_ID must identify a verified backup before migrations." >&2
    exit 78
  }
  for key in \
    DEFAULT_TENANT_CORPORATE_ID DEFAULT_TENANT_DB_NAME DEFAULT_TENANT_DOMAIN \
    DEFAULT_TENANT_NAME DEFAULT_TENANT_SLUG DEFAULT_TENANT_ADMIN_NAME \
    DEFAULT_TENANT_ADMIN_EMAIL DEFAULT_TENANT_ADMIN_PASSWORD; do
    [ -n "$(env_value "$key" "")" ] || { echo "$key is required." >&2; exit 78; }
  done
}

container_health() {
  docker inspect "$1" \
    --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    2>/dev/null || true
}

require_shared_network() {
  for network in \
    "$(env_value SHARED_DOCKER_NETWORK cxapp-network)" \
    "$(env_value SHARED_EDGE_NETWORK cxapp-edge)"; do
    docker network inspect "$network" >/dev/null 2>&1 || {
      echo "Shared CXApp network is missing: $network" >&2
      echo "TMApp will not create or replace shared infrastructure." >&2
      exit 69
    }
  done
}

require_shared_infrastructure() {
  for container in \
    "$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)" \
    "$(env_value REDIS_CONTAINER_NAME cxapp-redis)" \
    "$(env_value MEDIA_CONTAINER_NAME cxapp-media)"; do
    health=$(container_health "$container")
    [ "$health" = "healthy" ] || {
      echo "Shared infrastructure container $container is ${health:-missing}, not healthy." >&2
      exit 69
    }
  done
}

ensure_master_database() {
  database=$(env_value DB_MASTER_NAME techmedia_master)
  case "$database" in ""|*[!A-Za-z0-9_]*) echo "Unsafe DB_MASTER_NAME." >&2; exit 78 ;; esac
  mariadb_container=$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)
  MSYS_NO_PATHCONV=1 docker exec -e MYSQL_PWD="$(env_value DB_PASSWORD)" "$mariadb_container" \
    mariadb -u "$(env_value DB_USER cxapp_app)" \
    -e "CREATE DATABASE IF NOT EXISTS \`$database\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >/dev/null
}

techmedia_database_exists() {
  database=$(env_value DB_MASTER_NAME techmedia_master)
  docker exec -e MYSQL_PWD="$(env_value DB_PASSWORD)" \
    "$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)" \
    mariadb --batch --skip-column-names -u "$(env_value DB_USER cxapp_app)" \
    -e "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${database}';" \
    | grep -qx 1
}

drop_techmedia_databases() {
  master=$(env_value DB_MASTER_NAME techmedia_master)
  tenant=$(env_value DEFAULT_TENANT_DB_NAME techmedia_tenant_default)
  for database in "$master" "$tenant"; do
    case "$database" in
      cxsun_master_db|codexsun_db)
        echo "Protected CXApp database cannot be dropped by TMApp: $database" >&2
        exit 78 ;;
      ""|*[!A-Za-z0-9_]*) echo "Unsafe TMApp database name: $database" >&2; exit 78 ;;
    esac
  done
  docker exec -e MYSQL_PWD="$(env_value DB_PASSWORD)" \
    "$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)" \
    mariadb -u "$(env_value DB_USER cxapp_app)" \
    -e "DROP DATABASE IF EXISTS \`$tenant\`; DROP DATABASE IF EXISTS \`$master\`;" >/dev/null
}

compose_all() {
  docker compose --env-file "$DEPLOY_ENV" -f "$CONTAINER_DIR/tmapp/docker-compose.yml" --profile tools "$@"
}

compose_app() {
  docker compose --env-file "$DEPLOY_ENV" -f "$CONTAINER_DIR/tmapp/docker-compose.yml" "$@"
}

run_preflight() {
  prepare_env
  validate_env
  docker info >/dev/null 2>&1 || { echo "Docker Engine is not reachable." >&2; exit 69; }
  require_shared_network
  require_shared_infrastructure
}
