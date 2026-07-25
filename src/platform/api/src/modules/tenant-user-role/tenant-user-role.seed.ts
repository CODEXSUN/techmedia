import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
import { TENANT_SUPER_ADMIN_ROLE_KEY } from "../tenant-role/index.js";
export async function seedTenantUserRoleModule(database: Kysely<TenantDatabase>) {
  await sql`DELETE ur FROM user_roles ur INNER JOIN users u ON u.id=ur.user_id INNER JOIN roles r ON r.id=ur.role_id WHERE (u.is_protected=TRUE AND r.\`key\`<>${TENANT_SUPER_ADMIN_ROLE_KEY}) OR (r.\`key\`=${TENANT_SUPER_ADMIN_ROLE_KEY} AND (u.is_protected=FALSE OR u.role<>${TENANT_SUPER_ADMIN_ROLE_KEY}))`.execute(
    database
  );
  const superAdminUser = await database
      .selectFrom("users")
      .select("id")
      .where("role", "=", TENANT_SUPER_ADMIN_ROLE_KEY)
      .where("is_protected", "=", true)
      .where("status", "=", "active")
      .orderBy("id")
      .executeTakeFirst(),
    superAdminRole = await database
      .selectFrom("roles")
      .select("id")
      .where("key", "=", TENANT_SUPER_ADMIN_ROLE_KEY)
      .where("status", "=", "active")
      .executeTakeFirst();
  if (superAdminUser && superAdminRole)
    await sql`INSERT INTO user_roles (uuid,user_id,role_id,status,is_protected) VALUES (${stable(`user-role:${superAdminUser.id}:${superAdminRole.id}`)},${superAdminUser.id},${superAdminRole.id},'active',TRUE) ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(
      database
    );
  for (const roleKey of ["admin", "user"]) {
    const users = await database
        .selectFrom("users")
        .select("id")
        .where("role", "=", roleKey)
        .where("is_protected", "=", false)
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
