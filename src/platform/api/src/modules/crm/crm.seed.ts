import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

const permissions = [
  "assigned.view",
  "created.view",
  "open.view",
  "create",
  "update",
  "assign",
  "suspend",
  "force-delete"
] as const;

const rolePermissions: Record<string, readonly (typeof permissions)[number][]> = {
  admin: permissions,
  manager: permissions.filter((permission) => permission !== "force-delete"),
  staff: ["assigned.view", "created.view", "open.view", "create", "update", "assign", "suspend"],
  user: ["assigned.view", "created.view", "create", "update"]
};

export async function seedCrmModule(database: Kysely<TenantDatabase>) {
  for (const permission of permissions) {
    const key = `crm.enquiry.${permission}`;
    await database
      .insertInto("permissions")
      .values({
        description: `Allows ${permission.replace(".", " ")} for CRM enquiries.`,
        is_protected: true,
        key,
        label: permission
          .split(".")
          .map((part) => part[0]?.toUpperCase() + part.slice(1))
          .join(" · "),
        status: "active",
        uuid: stable(key)
      })
      .onDuplicateKeyUpdate({ status: "active", is_protected: true })
      .execute();
  }

  for (const [roleKey, grants] of Object.entries(rolePermissions)) {
    const role = await database
      .selectFrom("roles")
      .select("id")
      .where("key", "=", roleKey)
      .executeTakeFirst();
    if (!role) continue;
    for (const permission of grants) {
      const key = `crm.enquiry.${permission}`;
      const permissionRecord = await database
        .selectFrom("permissions")
        .select("id")
        .where("key", "=", key)
        .executeTakeFirst();
      if (!permissionRecord) continue;
      await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected)
        VALUES (${stable(`crm-role:${role.id}:${permissionRecord.id}`)},${role.id},${permissionRecord.id},'active',TRUE)
        ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(database);
    }
  }
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
