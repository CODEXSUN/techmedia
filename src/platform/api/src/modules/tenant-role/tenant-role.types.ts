import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
export const TENANT_SUPER_ADMIN_ROLE_KEY = "super-admin" as const;
export const TENANT_ADMIN_ROLE_KEY = "admin" as const;
export type TenantRoleStatus = "active" | "inactive";
export type TenantRole = {
  description: string;
  id: number;
  isProtected: boolean;
  key: string;
  label: string;
  status: TenantRoleStatus;
  uuid: string;
};
export type TenantRoleSavePayload = {
  description: string;
  key: string;
  label: string;
  status: TenantRoleStatus;
};
export type TenantRoleListFilters = { search?: string };
export type TenantRoleContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<TenantDatabase>;
  tenantId: string;
};
