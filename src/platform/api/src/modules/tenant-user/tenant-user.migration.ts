import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const tenantUserMigrations = [
  { key: "platform.tenant-user.foundation-v1" },
  { key: "platform.tenant-user.frappe-credentials-v2" },
  { key: "platform.tenant-user.frappe-employee-code-v3" }
] as const;
export const tenantUserMigration = tenantUserMigrations[0];

export async function migrateTenantUserModule(database: Kysely<TenantDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(8) NOT NULL UNIQUE,
    name VARCHAR(180) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(80) NOT NULL DEFAULT 'user',
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    is_protected BOOLEAN NOT NULL DEFAULT FALSE,
    frappe_api_key_ciphertext LONGTEXT NULL,
    frappe_api_secret_ciphertext LONGTEXT NULL,
    frappe_verification_status VARCHAR(24) NOT NULL DEFAULT 'unverified',
    frappe_authenticated_user VARCHAR(180) NULL,
    frappe_employee_code VARCHAR(180) NULL,
    frappe_last_checked_at DATETIME NULL,
    frappe_last_verified_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  if (!(await columnExists(database, "users", "is_protected"))) {
    await sql
      .raw("ALTER TABLE users ADD COLUMN is_protected BOOLEAN NOT NULL DEFAULT FALSE AFTER status")
      .execute(database);
  }
  await sql
    .raw(
      `ALTER TABLE users
        ADD COLUMN IF NOT EXISTS frappe_api_key_ciphertext LONGTEXT NULL,
        ADD COLUMN IF NOT EXISTS frappe_api_secret_ciphertext LONGTEXT NULL,
        ADD COLUMN IF NOT EXISTS frappe_verification_status VARCHAR(24) NOT NULL DEFAULT 'unverified',
        ADD COLUMN IF NOT EXISTS frappe_authenticated_user VARCHAR(180) NULL,
        ADD COLUMN IF NOT EXISTS frappe_employee_code VARCHAR(180) NULL,
        ADD COLUMN IF NOT EXISTS frappe_last_checked_at DATETIME NULL,
        ADD COLUMN IF NOT EXISTS frappe_last_verified_at DATETIME NULL`
    )
    .execute(database);
  await database
    .insertInto("schema_migrations")
    .ignore()
    .values(tenantUserMigrations.map((migration) => ({ name: migration.key })))
    .execute();
}

async function columnExists(database: Kysely<TenantDatabase>, table: string, column: string) {
  const result = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) count FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${table} AND COLUMN_NAME=${column}`.execute(
    database
  );
  return Number(result.rows[0]?.count ?? 0) > 0;
}
