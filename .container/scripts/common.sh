#!/usr/bin/env sh
set -eu

CONTAINER_DIR=${CONTAINER_DIR:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)}
PROJECT_ROOT=$(CDPATH= cd -- "$CONTAINER_DIR/.." && pwd)
DEPLOY_ENV=${TECHMEDIA_DEPLOY_ENV:-$CONTAINER_DIR/deploy.env}
INFRA_ENV=${CODEXSUN_INFRA_ENV:-$PROJECT_ROOT/../codexsun/.container/deploy.env}

env_value() {
  key="$1"; default_value=${2:-}
  value=$(grep -E "^${key}=" "$DEPLOY_ENV" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)
  printf '%s' "${value:-$default_value}"
}

infra_env_value() {
  key="$1"
  value=$(grep -E "^${key}=" "$INFRA_ENV" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)
  printf '%s' "$value"
}

set_env_value() {
  key="$1"; value="$2"; tmp="$DEPLOY_ENV.tmp"
  KEY="$key" VALUE="$value" awk '
    BEGIN { found = 0 }
    index($0, ENVIRON["KEY"] "=") == 1 { print ENVIRON["KEY"] "=" ENVIRON["VALUE"]; found = 1; next }
    { print }
    END { if (!found) print ENVIRON["KEY"] "=" ENVIRON["VALUE"] }
  ' "$DEPLOY_ENV" > "$tmp"
  mv "$tmp" "$DEPLOY_ENV"
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex 32
  else node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  fi
}

ensure_secret() {
  key="$1"
  case "$(env_value "$key" "")" in
    ""|change_this*) set_env_value "$key" "$(generate_secret)"; echo "Generated $key." ;;
  esac
}

prepare_env() {
  if [ ! -f "$DEPLOY_ENV" ]; then cp "$CONTAINER_DIR/deploy.env.example" "$DEPLOY_ENV"; echo "Created $DEPLOY_ENV."; fi
  version=$(grep -m1 '"version"' "$PROJECT_ROOT/package.json" | cut -d'"' -f4)
  node_version=$(grep -m1 -E '"node"[[:space:]]*:' "$PROJECT_ROOT/package.json" | cut -d'"' -f4 | sed 's/^[^0-9]*//')
  npm_version=$(grep -m1 '"packageManager"' "$PROJECT_ROOT/package.json" | cut -d'"' -f4 | sed 's/^npm@//')
  set_env_value TECHMEDIA_VERSION "$version"
  set_env_value NODE_RUNTIME_VERSION "$node_version"
  set_env_value NPM_RUNTIME_VERSION "$npm_version"
  set_env_value TECHMEDIA_API_IMAGE_TAG "$version"
  set_env_value TECHMEDIA_WEB_IMAGE_TAG "$version"
  set_env_value TECHMEDIA_MIGRATIONS_IMAGE_TAG "$version"
  [ -f "$INFRA_ENV" ] || { echo "Shared CODEXSUN deployment env is missing: $INFRA_ENV" >&2; echo "Install CODEXSUN infrastructure first." >&2; exit 69; }
  set_env_value DB_USER "$(infra_env_value DB_USER)"
  set_env_value DB_PASSWORD "$(infra_env_value DB_PASSWORD)"
  set_env_value TECHMEDIA_REDIS_PASSWORD "$(infra_env_value REDIS_PASSWORD)"
  set_env_value CODEXSUN_EDGE_NETWORK "$(infra_env_value CODEXSUN_DOCKER_NETWORK)"
  for key in JWT_SECRET SUPER_ADMIN_PASSWORD TENANT_ADMIN_PASSWORD DEFAULT_TENANT_ADMIN_PASSWORD; do ensure_secret "$key"; done
  redis_password=$(env_value TECHMEDIA_REDIS_PASSWORD)
  set_env_value TECHMEDIA_REDIS_URL "redis://:${redis_password}@codexsun-redis:6379/1"
  chmod 600 "$DEPLOY_ENV" 2>/dev/null || true
}

validate_env() {
  [ "$(env_value DB_USER codexsun_app)" != "root" ] || { echo "DB_USER must be a dedicated non-root account." >&2; exit 78; }
  [ "$(env_value TECHMEDIA_DB_FRESH_ON_START 0)" = "0" ] || { echo "Production database reset must remain disabled." >&2; exit 78; }
  [ "$(env_value TECHMEDIA_ALLOW_PRODUCTION_DB_RESET 0)" = "0" ] || { echo "Production database reset must remain disabled." >&2; exit 78; }
  [ "$(env_value TECHMEDIA_ALLOW_LIVE_RESTORE 0)" = "0" ] || { echo "Live restore must remain disabled during deployment." >&2; exit 78; }
  for key in DEFAULT_TENANT_CORPORATE_ID DEFAULT_TENANT_DB_NAME DEFAULT_TENANT_DOMAIN DEFAULT_TENANT_NAME DEFAULT_TENANT_SLUG; do
    [ -n "$(env_value "$key" "")" ] || { echo "$key is required." >&2; exit 78; }
  done
}

require_shared_network() {
  network=$(env_value CODEXSUN_EDGE_NETWORK codexsun-network)
  docker network inspect "$network" >/dev/null 2>&1 || {
    echo "Shared CODEXSUN network is missing: $network" >&2
    echo "Install or repair CODEXSUN infrastructure first; Tech Media will not create the shared network." >&2
    exit 69
  }
}

require_shared_infrastructure() {
  for container in codexsun-mariadb codexsun-redis codexsun-media; do
    [ "$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || true)" = "healthy" ] || {
      echo "Shared infrastructure container $container is not healthy. Install CODEXSUN first." >&2
      exit 69
    }
  done
}

ensure_master_database() {
  database=$(env_value DB_MASTER_NAME techmedia_master)
  case "$database" in ""|*[!A-Za-z0-9_]*) echo "Unsafe DB_MASTER_NAME." >&2; exit 78 ;; esac
  docker exec -e MYSQL_PWD="$(env_value DB_PASSWORD)" codexsun-mariadb \
    mariadb -u "$(env_value DB_USER codexsun_app)" \
    -e "CREATE DATABASE IF NOT EXISTS \`$database\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >/dev/null
}

compose() { docker compose --env-file "$DEPLOY_ENV" -f "$CONTAINER_DIR/docker-compose.yml" "$@"; }
