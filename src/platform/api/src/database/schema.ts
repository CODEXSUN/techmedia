import type { ColumnType, Generated } from "kysely";
import type { PlatformAppId } from "../modules/app-registry/app-registry.types.js";
import type { TenantStatus } from "../modules/tenant/tenant.types.js";

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string | undefined
>;

export type PlatformDatabase = {
  access_permissions: AccessPermissionsTable;
  access_roles: AccessRolesTable;
  access_users: AccessUsersTable;
  techmedia_migrations: PlatformMigrationsTable;
  database_maintenance_runs: DatabaseMaintenanceRunsTable;
  entitlements: EntitlementsTable;
  industries: IndustriesTable;
  plans: PlansTable;
  platform_activity: PlatformActivityTable;
  platform_apps: PlatformAppsTable;
  queue_jobs: QueueJobsTable;
  queue_runtime_settings: QueueRuntimeSettingsTable;
  storage_objects: StorageObjectsTable;
  subscriptions: SubscriptionsTable;
  tenant_domains: TenantDomainsTable;
  tenant_audit_events: TenantAuditEventsTable;
  tenants: TenantsTable;
};

export type TenantDatabase = {
  crm_enquiries: CrmEnquiriesTable;
  crm_enquiry_messages: CrmEnquiryMessagesTable;
  crm_enquiry_schedules: CrmEnquirySchedulesTable;
  frappe_connection_settings: FrappeConnectionSettingsTable;
  frappe_enquiry_links: FrappeEnquiryLinksTable;
  frappe_sync_settings: FrappeSyncSettingsTable;
  schema_migrations: TenantMigrationsTable;
  module_settings: TenantModuleSettingsTable;
  permissions: TenantPermissionsTable;
  role_permissions: TenantRolePermissionsTable;
  roles: TenantRolesTable;
  user_roles: TenantUserRolesTable;
  users: TenantUsersTable;
};

export type FrappeConnectionSettingsTable = {
  api_key_ciphertext: string;
  api_secret_ciphertext: string;
  base_url: string;
  connection_key: string;
  connection_name: string;
  created_at: TimestampColumn;
  enabled: boolean | number;
  id: Generated<number>;
  last_checked_at: TimestampColumn | null;
  last_verified_at: TimestampColumn | null;
  updated_at: TimestampColumn;
  uuid: string;
  verification_status: "live" | "offline" | "unverified";
};

export type CrmEnquiriesTable = {
  assigned_to_user_id: number | null;
  created_at: TimestampColumn;
  created_by_user_id: number;
  customer: string;
  enquiry_date: string | null;
  enquiry_group: string;
  id: Generated<number>;
  lifecycle_status: "active" | "suspended";
  mobile: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "follow" | "escalation" | "won" | "lost";
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
  workspace: string;
};

export type CrmEnquiryMessagesTable = {
  comment: string;
  created_at: TimestampColumn;
  enquiry_id: number;
  id: Generated<number>;
  position: number;
  updated_at: TimestampColumn;
};

export type CrmEnquirySchedulesTable = {
  created_at: TimestampColumn;
  enquiry_id: number;
  id: Generated<number>;
  scheduled_on: string;
  updated_at: TimestampColumn;
};

export type FrappeSyncSettingsTable = {
  created_at: TimestampColumn;
  enquiry_doctype: string;
  id: Generated<number>;
  last_pull_at: TimestampColumn | null;
  last_push_at: TimestampColumn | null;
  pull_enquiries_enabled: boolean | number;
  push_enquiries_enabled: boolean | number;
  setting_key: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type FrappeEnquiryLinksTable = {
  created_at: TimestampColumn;
  crm_enquiry_id: number;
  frappe_modified_at: TimestampColumn | null;
  frappe_name: string;
  id: Generated<number>;
  last_error: string | null;
  last_synced_at: TimestampColumn | null;
  sync_status: "error" | "synced";
  updated_at: TimestampColumn;
  uuid: string;
};

export type PlatformAppsTable = {
  always_enabled: boolean | number;
  app_id: string;
  created_at: TimestampColumn;
  default_landing: boolean | number;
  description: string;
  id: Generated<number>;
  label: string;
  module_key: string;
  stack: "platform";
  updated_at: TimestampColumn;
  uuid: string;
};

export type AccessPermissionsTable = {
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  key: string;
  label: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type AccessRolesTable = {
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  key: string;
  label: string;
  permission_keys_json: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type AccessUsersTable = {
  created_at: TimestampColumn;
  email: string;
  id: Generated<number>;
  name: string;
  role_key: string;
  status: "active" | "inactive" | "suspended";
  updated_at: TimestampColumn;
  uuid: string;
};

export type PlatformActivityTable = {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  module_key: string;
  record_id: number | null;
  record_label: string;
  record_uuid: string | null;
  uuid: string;
};

export type DatabaseMaintenanceRunsTable = {
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  database_name: string;
  database_scope: "master" | "tenant";
  details_json: string;
  id: Generated<number>;
  operation: "backup" | "migrate" | "refresh" | "reinstall" | "restore" | "setup" | "status";
  status: "completed" | "failed" | "requested" | "running";
  target_key: string;
  uuid: string;
};

export type QueueJobsTable = {
  actor_email: string | null;
  attempts: number;
  available_at: TimestampColumn;
  completed_at: TimestampColumn | null;
  correlation_id: string | null;
  created_at: TimestampColumn;
  error_message: string | null;
  id: Generated<number>;
  idempotency_key: string | null;
  job_name: string;
  max_attempts: number;
  payload_json: string;
  priority: number;
  queue_name: string;
  result_json: string;
  source_module: string;
  started_at: TimestampColumn | null;
  status: "cancelled" | "completed" | "failed" | "pending" | "running";
  tenant_id: string | null;
  updated_at: TimestampColumn;
  uuid: string;
};

export type QueueRuntimeSettingsTable = {
  backend: "bullmq-redis" | "database";
  id: Generated<number>;
  setting_key: string;
  updated_at: TimestampColumn;
  updated_by: string | null;
  uuid: string;
};

export type StorageObjectsTable = {
  checksum: string | null;
  created_at: TimestampColumn;
  disk_path: string;
  id: Generated<number>;
  mime_type: string | null;
  object_type: "file" | "folder";
  relative_path: string;
  scope: "app" | "tenant";
  size_bytes: number;
  tenant_id: number | null;
  updated_at: TimestampColumn;
  uuid: string;
  visibility: "private" | "public";
};

export type PlansTable = {
  annual_price: number;
  code: string;
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  limits_json: string;
  monthly_price: number;
  name: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type SubscriptionsTable = {
  billing_cycle: "monthly" | "annual";
  created_at: TimestampColumn;
  ends_on: string | null;
  id: Generated<number>;
  plan_id: number;
  starts_on: string;
  status: "active" | "cancelled" | "expired" | "trial";
  tenant_id: number;
  updated_at: TimestampColumn;
  uuid: string;
};

export type IndustriesTable = {
  code: string;
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  module_keys_json: string;
  name: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type EntitlementsTable = {
  app_id: number;
  created_at: TimestampColumn;
  ends_on: string | null;
  id: Generated<number>;
  module_key: string;
  plan_id: number | null;
  scope: "tenant" | "plan";
  source: "manual" | "seed" | "subscription";
  starts_on: string;
  status: "active" | "inactive";
  tenant_id: number | null;
  updated_at: TimestampColumn;
  uuid: string;
};

export type PlatformMigrationsTable = {
  applied_at: TimestampColumn;
  id: Generated<number>;
  name: string;
};

export type TenantsTable = {
  corporate_id: string | null;
  created_at: TimestampColumn;
  db_host: string;
  db_name: string;
  db_port: number;
  db_secret_ref: string;
  db_type: string;
  db_user: string;
  default_landing_app: PlatformAppId;
  enabled_module_keys: string;
  id: Generated<number>;
  mobile: string | null;
  payload_settings: string;
  slug: string;
  status: TenantStatus;
  storage_private_root: string;
  storage_public_root: string;
  storage_root: string;
  tenant_code: string;
  tenant_name: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TenantAuditEventsTable = {
  actor_email: string;
  created_at: TimestampColumn;
  event_name: string;
  id: Generated<number>;
  tenant_id: number;
  uuid: string;
};

export type TenantDomainsTable = {
  created_at: TimestampColumn;
  domain: string;
  id: Generated<number>;
  is_primary: boolean | number;
  tenant_id: number;
  uuid: string;
};

export type TenantMigrationsTable = {
  applied_at: TimestampColumn;
  id: Generated<number>;
  name: string;
};

export type TenantModuleSettingsTable = {
  created_at: TimestampColumn;
  enabled: boolean | number;
  id: Generated<number>;
  module_key: string;
  settings_json: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TenantUsersTable = {
  created_at: TimestampColumn;
  email: string;
  id: Generated<number>;
  is_protected: boolean | number;
  name: string;
  password_hash: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  updated_at: TimestampColumn;
  uuid: string;
};

export type TenantRolesTable = {
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

export type TenantPermissionsTable = {
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

export type TenantRolePermissionsTable = {
  created_at: TimestampColumn;
  id: Generated<number>;
  is_protected: boolean | number;
  permission_id: number;
  role_id: number;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type TenantUserRolesTable = {
  created_at: TimestampColumn;
  id: Generated<number>;
  is_protected: boolean | number;
  role_id: number;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  user_id: number;
  uuid: string;
};
