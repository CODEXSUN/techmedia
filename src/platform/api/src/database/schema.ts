import type { ColumnType, Generated } from "kysely";

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string | undefined
>;

export type NullableTimestampColumn = ColumnType<
  Date | null,
  Date | string | null | undefined,
  Date | string | null | undefined
>;

export type NullableStringColumn = ColumnType<
  string | null,
  string | null | undefined,
  string | null | undefined
>;

export type DefaultedStringColumn<Value extends string> = ColumnType<
  Value,
  Value | undefined,
  Value | undefined
>;

export type DefaultedNumberColumn = ColumnType<number, number | undefined, number | undefined>;

export type UsersTable = {
  created_at: TimestampColumn;
  email: string;
  frappe_api_key_ciphertext: NullableStringColumn;
  frappe_api_secret_ciphertext: NullableStringColumn;
  frappe_authenticated_user: NullableStringColumn;
  frappe_employee_code: NullableStringColumn;
  frappe_last_checked_at: NullableTimestampColumn;
  frappe_last_verified_at: NullableTimestampColumn;
  frappe_verification_status: DefaultedStringColumn<"live" | "offline" | "unverified">;
  id: Generated<number>;
  is_protected: boolean | number;
  name: string;
  password_hash: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  updated_at: TimestampColumn;
  uuid: string;
};

export type RolesTable = {
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  is_protected: boolean | number;
  key: string;
  label: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type PermissionsTable = {
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  is_protected: boolean | number;
  key: string;
  label: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type UserRolesTable = {
  created_at: TimestampColumn;
  id: Generated<number>;
  is_protected: boolean | number;
  role_id: number;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  user_id: number;
  uuid: string;
};

export type RolePermissionsTable = {
  created_at: TimestampColumn;
  id: Generated<number>;
  is_protected: boolean | number;
  permission_id: number;
  role_id: number;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type SchemaMigrationsTable = {
  applied_at: TimestampColumn;
  id: Generated<number>;
  name: string;
};

export type NotificationsTable = {
  actor_user_id: number | null;
  body: string;
  created_at: TimestampColumn;
  event_type: "assignment" | "comment" | "reply" | "status";
  id: Generated<number>;
  read_at: NullableTimestampColumn;
  recipient_user_id: number;
  resource_id: string;
  status: DefaultedStringColumn<"read" | "unread">;
  title: string;
  uuid: string;
};

export type NotificationOutboxTable = {
  attempts: DefaultedNumberColumn;
  created_at: TimestampColumn;
  delivered_at: NullableTimestampColumn;
  id: Generated<number>;
  notification_id: number;
  status: DefaultedStringColumn<"delivered" | "pending">;
  uuid: string;
};

export type AiHoneyThreadsTable = {
  actor_user_id: number;
  archived_at: NullableTimestampColumn;
  created_at: TimestampColumn;
  id: Generated<number>;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type AiHoneyMessagesTable = {
  actor_user_id: number;
  body: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  metadata_json: string;
  role: "assistant" | "user";
  thread_uuid: string;
  uuid: string;
};
export type AiHoneySkillsTable = {
  created_at: TimestampColumn;
  description: string;
  enabled: boolean | number;
  id: Generated<number>;
  instructions: string;
  name: string;
  updated_at: TimestampColumn;
};
export type AiHoneySettingsTable = {
  enabled: boolean | number;
  id: Generated<number>;
  setting_key: string;
  updated_at: TimestampColumn;
};

export type TechMediaDatabase = {
  ai_honey_messages: AiHoneyMessagesTable;
  ai_honey_settings: AiHoneySettingsTable;
  ai_honey_skills: AiHoneySkillsTable;
  ai_honey_threads: AiHoneyThreadsTable;
  notification_outbox: NotificationOutboxTable;
  notifications: NotificationsTable;
  permissions: PermissionsTable;
  role_permissions: RolePermissionsTable;
  roles: RolesTable;
  schema_migrations: SchemaMigrationsTable;
  user_roles: UserRolesTable;
  users: UsersTable;
};
