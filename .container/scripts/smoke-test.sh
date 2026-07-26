#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.container/scripts/common.sh
. "$SCRIPT_DIR/common.sh"
prepare_env
validate_env
require_shared_network
require_shared_infrastructure

bind=$(env_value TMAPP_BIND_ADDRESS 127.0.0.1)
api_port=$(env_value PLATFORM_API_HOST_PORT 18050)
web_port=$(env_value PLATFORM_WEB_HOST_PORT 18060)
curl --fail --silent --show-error "http://${bind}:${api_port}/health" >/dev/null
echo "ok tmapp-api: http://${bind}:${api_port}/health"
curl --fail --silent --show-error "http://${bind}:${web_port}/health" >/dev/null
echo "ok tmapp-web: http://${bind}:${web_port}/health"

redis_container=$(env_value REDIS_CONTAINER_NAME cxapp-redis)
docker exec -e REDISCLI_AUTH="$(env_value SHARED_REDIS_PASSWORD)" "$redis_container" \
  redis-cli --user "$(env_value SHARED_REDIS_USER default)" ping | grep -qx PONG
echo "ok authenticated shared Redis"

docker exec tmapp-api node --input-type=module -e '
  const base = `http://127.0.0.1:${process.env.PLATFORM_API_PORT}`;
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, options);
    const body = await response.json();
    if (!response.ok || body.success !== true) throw new Error(`${path} failed (${response.status})`);
    return body.data;
  };
  const login = await request("/auth/login", {
    body: JSON.stringify({
      desk: "super_admin",
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const headers = { authorization: `Bearer ${login.accessToken}` };
  const apps = await request("/admin/app-operations", { headers });
  if (apps.map((app) => app.id).join(",") !== "platform")
    throw new Error("TMApp must expose only its Platform runtime.");
  if (apps[0]?.status !== "online")
    throw new Error(`TMApp Platform status is ${apps[0]?.status}`);
'
echo "ok authenticated TechMedia Platform runtime"

mariadb_container=$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)
db_password=$(env_value DB_PASSWORD)
db_user=$(env_value DB_USER cxapp_app)
master_db=$(env_value DB_MASTER_NAME techmedia_master)
tenant_db=$(env_value DEFAULT_TENANT_DB_NAME techmedia_tenant_default)
for database in "$master_db" "$tenant_db"; do
  count=$(MSYS_NO_PATHCONV=1 docker exec -e MYSQL_PWD="$db_password" "$mariadb_container" \
    mariadb --batch --skip-column-names -u "$db_user" \
    -e "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${database}';")
  [ "$count" = "1" ] || { echo "Expected TechMedia database is missing: $database" >&2; exit 69; }
done
echo "ok TechMedia master and tenant databases"

echo "TMApp container smoke test passed: logicx.tmnext.in, API, Web, Redis, and MariaDB ready."
