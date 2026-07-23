import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const frappeMigrations = [
  { key: "frappe.connection.foundation-v1" },
  { key: "frappe.connection.verification-status-v2" },
  { key: "frappe.enquiry.sync-foundation-v3" }
] as const;

export async function migrateFrappeModule(database: Kysely<TenantDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS frappe_connection_settings (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(8) NOT NULL UNIQUE,
        connection_key VARCHAR(64) NOT NULL UNIQUE,
        connection_name VARCHAR(160) NOT NULL,
        base_url VARCHAR(500) NOT NULL,
        api_key_ciphertext LONGTEXT NOT NULL,
        api_secret_ciphertext LONGTEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        verification_status VARCHAR(24) NOT NULL DEFAULT 'unverified',
        last_checked_at DATETIME NULL,
        last_verified_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);

  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS frappe_sync_settings (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(8) NOT NULL UNIQUE,
        setting_key VARCHAR(64) NOT NULL UNIQUE,
        enquiry_doctype VARCHAR(140) NOT NULL DEFAULT 'Enquiry',
        pull_enquiries_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        push_enquiries_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        last_pull_at DATETIME NULL,
        last_push_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);

  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS frappe_enquiry_links (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(8) NOT NULL UNIQUE,
        crm_enquiry_id INT NOT NULL UNIQUE,
        frappe_name VARCHAR(140) NOT NULL UNIQUE,
        frappe_modified_at DATETIME NULL,
        sync_status VARCHAR(24) NOT NULL DEFAULT 'synced',
        last_error TEXT NULL,
        last_synced_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY frappe_enquiry_links_name_idx (frappe_name),
        CONSTRAINT frappe_enquiry_links_crm_fk FOREIGN KEY (crm_enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);

  await sql`INSERT INTO frappe_sync_settings
    (uuid,setting_key,enquiry_doctype,pull_enquiries_enabled,push_enquiries_enabled)
    VALUES ('f0sync01','enquiry','Enquiry',FALSE,FALSE)
    ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key)`.execute(database);

  await sql
    .raw(
      `ALTER TABLE frappe_connection_settings
        ADD COLUMN IF NOT EXISTS verification_status VARCHAR(24) NOT NULL DEFAULT 'unverified',
        ADD COLUMN IF NOT EXISTS last_checked_at DATETIME NULL,
        ADD COLUMN IF NOT EXISTS last_verified_at DATETIME NULL`
    )
    .execute(database);

  await database
    .insertInto("schema_migrations")
    .ignore()
    .values(frappeMigrations.map((migration) => ({ name: migration.key })))
    .execute();
}
