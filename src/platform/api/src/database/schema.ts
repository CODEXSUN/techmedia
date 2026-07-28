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

export type TechMediaDatabase = {
  permissions: PermissionsTable;
  role_permissions: RolePermissionsTable;
  roles: RolesTable;
  schema_migrations: SchemaMigrationsTable;
  user_roles: UserRolesTable;
  users: UsersTable;
};
