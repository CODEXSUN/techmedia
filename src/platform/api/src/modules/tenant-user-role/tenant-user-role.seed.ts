import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
export async function seedTenantUserRoleModule(database: Kysely<TenantDatabase>) {
  for (const roleKey of ["admin", "user"]) {
    const users = await database
        .selectFrom("users")
        .select("id")
        .where("role", "=", roleKey)
        .where("status", "=", "active")
        .execute(),
      role = await database
        .selectFrom("roles")
        .select("id")
        .where("key", "=", roleKey)
        .executeTakeFirst();
    if (!role) continue;
    for (const user of users)
      await sql`INSERT INTO user_roles (uuid,user_id,role_id,status,is_protected) VALUES (${stable(`user-role:${user.id}:${role.id}`)},${user.id},${role.id},'active',TRUE) ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(
        database
      );
  }
}
function stable(v: string) {
  return createHash("sha256").update(v).digest("hex").slice(0, 8);
}
