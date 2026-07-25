import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
import { TENANT_ADMIN_ROLE_KEY, TENANT_SUPER_ADMIN_ROLE_KEY } from "../tenant-role/index.js";
export async function seedTenantRolePermissionModule(database: Kysely<TenantDatabase>) {
  const permissions = await database.selectFrom("permissions").select("id").execute();
  for (const roleKey of [TENANT_SUPER_ADMIN_ROLE_KEY, TENANT_ADMIN_ROLE_KEY]) {
    const role = await database
      .selectFrom("roles")
      .select("id")
      .where("key", "=", roleKey)
      .executeTakeFirst();
    if (!role) continue;
    for (const p of permissions)
      await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected) VALUES (${stable(`role-permission:${role.id}:${p.id}`)},${role.id},${p.id},'active',TRUE) ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(
        database
      );
  }
}
function stable(v: string) {
  return createHash("sha256").update(v).digest("hex").slice(0, 8);
}
