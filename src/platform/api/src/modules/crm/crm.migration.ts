import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const crmMigrations = [
  { key: "crm.enquiry.foundation-v1" },
  { key: "crm.enquiry.frappe-fields-v2" },
  { key: "crm.enquiry.lifecycle-v3" },
  { key: "crm.enquiry.unassigned-v4" }
] as const;

export async function migrateCrmModule(database: Kysely<TenantDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS crm_enquiries (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(8) NOT NULL UNIQUE,
        title VARCHAR(220) NOT NULL,
        priority VARCHAR(24) NOT NULL DEFAULT 'normal',
        status VARCHAR(24) NOT NULL DEFAULT 'open',
        assigned_to_user_id INT NULL,
        created_by_user_id INT NOT NULL,
        mobile VARCHAR(40) NOT NULL DEFAULT '',
        customer VARCHAR(220) NOT NULL DEFAULT '',
        enquiry_group VARCHAR(80) NOT NULL DEFAULT '',
        enquiry_date DATE NULL,
        lifecycle_status VARCHAR(24) NOT NULL DEFAULT 'active',
        workspace LONGTEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY crm_enquiries_assigned_status_idx (assigned_to_user_id,status),
        KEY crm_enquiries_created_status_idx (created_by_user_id,status),
        CONSTRAINT crm_enquiries_assigned_user_fk FOREIGN KEY (assigned_to_user_id) REFERENCES users(id),
        CONSTRAINT crm_enquiries_created_user_fk FOREIGN KEY (created_by_user_id) REFERENCES users(id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);

  await sql
    .raw(
      `ALTER TABLE crm_enquiries
        ADD COLUMN IF NOT EXISTS mobile VARCHAR(40) NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS customer VARCHAR(220) NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS enquiry_group VARCHAR(80) NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS enquiry_date DATE NULL,
        ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(24) NOT NULL DEFAULT 'active'`
    )
    .execute(database);

  await sql`UPDATE crm_enquiries SET status='follow' WHERE status='in_progress'`.execute(database);
  await sql`UPDATE crm_enquiries SET status='lost' WHERE status='closed'`.execute(database);
  await sql.raw(`ALTER TABLE crm_enquiries MODIFY assigned_to_user_id INT NULL`).execute(database);

  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS crm_enquiry_schedules (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        enquiry_id INT NOT NULL,
        scheduled_on DATE NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY crm_enquiry_schedules_unique (enquiry_id,scheduled_on),
        KEY crm_enquiry_schedules_date_idx (scheduled_on),
        CONSTRAINT crm_enquiry_schedules_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);

  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS crm_enquiry_messages (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        enquiry_id INT NOT NULL,
        position INT NOT NULL DEFAULT 0,
        comment TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY crm_enquiry_messages_enquiry_idx (enquiry_id,position),
        CONSTRAINT crm_enquiry_messages_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);

  await database
    .insertInto("schema_migrations")
    .ignore()
    .values(crmMigrations.map((migration) => ({ name: migration.key })))
    .execute();
}
