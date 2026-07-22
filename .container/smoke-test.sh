#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/scripts/common.sh"
prepare_env

bind=$(env_value TECHMEDIA_BIND_ADDRESS 127.0.0.1)
curl --fail --silent --show-error "http://${bind}:$(env_value PLATFORM_API_HOST_PORT 18050)/health" >/dev/null
curl --fail --silent --show-error "http://${bind}:$(env_value PLATFORM_WEB_HOST_PORT 18060)/health" >/dev/null
docker exec -e REDISCLI_AUTH="$(env_value TECHMEDIA_REDIS_PASSWORD)" codexsun-redis redis-cli ping | grep -qx PONG

docker exec techmedia-api node --input-type=module -e '
  const base = `http://127.0.0.1:${process.env.PLATFORM_API_PORT}`;
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, options);
    const body = await response.json();
    if (!response.ok || body.success !== true) throw new Error(`${path} failed (${response.status})`);
    return body.data;
  };
  const login = await request("/auth/login", {
    body: JSON.stringify({ desk: "super_admin", email: process.env.SUPER_ADMIN_EMAIL, password: process.env.SUPER_ADMIN_PASSWORD }),
    headers: { "content-type": "application/json" }, method: "POST"
  });
  const headers = { authorization: `Bearer ${login.accessToken}` };
  const apps = await request("/admin/app-operations", { headers });
  if (apps.map((app) => app.id).join(",") !== "platform") throw new Error("Techmedia must expose only its Platform runtime.");
  if (apps[0]?.status !== "online") throw new Error(`Techmedia Platform status is ${apps[0]?.status}`);
'

db_password=$(env_value DB_PASSWORD)
tenant_db=$(env_value DEFAULT_TENANT_DB_NAME techmedia_tenant_default)
tenant_count=$(docker exec -e MYSQL_PWD="$db_password" codexsun-mariadb mariadb --batch --skip-column-names -u "$(env_value DB_USER codexsun_app)" -e "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='$tenant_db';")
[ "$tenant_count" = "1" ] || { echo "Techmedia default tenant database is missing." >&2; exit 69; }
echo "Techmedia container smoke test passed: app.techmedia.in tenant, API, Web, Redis, and MariaDB ready."
