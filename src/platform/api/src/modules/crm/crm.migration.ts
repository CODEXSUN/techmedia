import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export const crmMigrations = [
  { key: "crm.enquiry.foundation-v1" },
  { key: "crm.enquiry.frappe-fields-v2" },
  { key: "crm.enquiry.lifecycle-v3" },
  { key: "crm.enquiry.unassigned-v4" },
  { key: "crm.enquiry.workspace-children-v5" },
  { key: "crm.enquiry.subject-v6" }
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
        subject VARCHAR(220) NOT NULL DEFAULT '',
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
        ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(24) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS subject VARCHAR(220) NOT NULL DEFAULT ''`
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
        message_type VARCHAR(24) NOT NULL DEFAULT 'comment',
        comment TEXT NOT NULL,
        created_by_user_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY crm_enquiry_messages_enquiry_idx (enquiry_id,position),
        CONSTRAINT crm_enquiry_messages_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);

  await sql
    .raw(
      `ALTER TABLE crm_enquiry_messages
        ADD COLUMN IF NOT EXISTS message_type VARCHAR(24) NOT NULL DEFAULT 'comment',
        ADD COLUMN IF NOT EXISTS created_by_user_id INT NULL`
    )
    .execute(database);

  for (const statement of [
    `CREATE TABLE IF NOT EXISTS crm_enquiry_emails (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL UNIQUE,
      enquiry_id INT NOT NULL,
      recipient VARCHAR(320) NOT NULL,
      subject VARCHAR(220) NOT NULL,
      body TEXT NOT NULL,
      created_by_user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY crm_enquiry_emails_enquiry_idx (enquiry_id,created_at),
      CONSTRAINT crm_enquiry_emails_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS crm_enquiry_calls (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL UNIQUE,
      enquiry_id INT NOT NULL,
      phone VARCHAR(40) NOT NULL,
      summary TEXT NOT NULL,
      called_at DATETIME NOT NULL,
      created_by_user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY crm_enquiry_calls_enquiry_idx (enquiry_id,called_at),
      CONSTRAINT crm_enquiry_calls_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS crm_enquiry_tasks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL UNIQUE,
      enquiry_id INT NOT NULL,
      title VARCHAR(220) NOT NULL,
      task_status VARCHAR(24) NOT NULL DEFAULT 'pending',
      due_on DATE NULL,
      created_by_user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY crm_enquiry_tasks_enquiry_idx (enquiry_id,task_status,due_on),
      CONSTRAINT crm_enquiry_tasks_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS crm_enquiry_notes (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL UNIQUE,
      enquiry_id INT NOT NULL,
      note TEXT NOT NULL,
      created_by_user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY crm_enquiry_notes_enquiry_idx (enquiry_id,created_at),
      CONSTRAINT crm_enquiry_notes_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS crm_enquiry_attachments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL UNIQUE,
      enquiry_id INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url VARCHAR(2048) NOT NULL,
      created_by_user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY crm_enquiry_attachments_enquiry_idx (enquiry_id,created_at),
      CONSTRAINT crm_enquiry_attachments_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS crm_enquiry_activities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(8) NOT NULL UNIQUE,
      enquiry_id INT NOT NULL,
      action VARCHAR(80) NOT NULL,
      details TEXT NOT NULL,
      created_by_user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY crm_enquiry_activities_enquiry_idx (enquiry_id,created_at),
      CONSTRAINT crm_enquiry_activities_enquiry_fk FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  ]) {
    await sql.raw(statement).execute(database);
  }

  await database
    .insertInto("schema_migrations")
    .ignore()
    .values(crmMigrations.map((migration) => ({ name: migration.key })))
    .execute();
}
