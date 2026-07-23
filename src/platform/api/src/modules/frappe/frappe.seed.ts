import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

const permissions = ["view", "update"] as const;

export async function seedFrappeModule(database: Kysely<TenantDatabase>) {
  for (const permission of permissions) {
    const key = `frappe.connection.${permission}`;
    await database
      .insertInto("permissions")
      .values({
        description: `Allows ${permission} access to the tenant Frappe connection.`,
        is_protected: true,
        key,
        label: `Frappe connection · ${permission[0]?.toUpperCase()}${permission.slice(1)}`,
        status: "active",
        uuid: stable(key)
      })
      .onDuplicateKeyUpdate({ status: "active", is_protected: true })
      .execute();
  }

  const adminRole = await database
    .selectFrom("roles")
    .select("id")
    .where("key", "=", "admin")
    .executeTakeFirst();
  if (!adminRole) return;
  for (const permission of permissions) {
    const permissionRecord = await database
      .selectFrom("permissions")
      .select("id")
      .where("key", "=", `frappe.connection.${permission}`)
      .executeTakeFirst();
    if (!permissionRecord) continue;
    await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected)
      VALUES (${stable(`frappe-role:${adminRole.id}:${permissionRecord.id}`)},
        ${adminRole.id},${permissionRecord.id},'active',TRUE)
      ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(database);
  }
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
