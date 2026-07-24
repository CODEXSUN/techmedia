import type { Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";

export type TenantUserStatus = "active" | "inactive" | "suspended";
export type TenantUserFrappeVerificationStatus = "live" | "offline" | "unverified";
export type TenantUser = {
  email: string;
  frappeApiKeyConfigured: boolean;
  frappeApiSecretConfigured: boolean;
  frappeAuthenticatedUser: string | null;
  frappeEmployeeCode: string | null;
  frappeLastCheckedAt: string | null;
  frappeLastVerifiedAt: string | null;
  frappeVerificationStatus: TenantUserFrappeVerificationStatus;
  id: number;
  isProtected: boolean;
  name: string;
  status: TenantUserStatus;
  uuid: string;
};
export type TenantUserSavePayload = {
  email: string;
  frappeApiKey?: string | undefined;
  frappeApiSecret?: string | undefined;
  frappeEmployeeCode?: string | undefined;
  name: string;
  password?: string | undefined;
  status: TenantUserStatus;
};
export type TenantUserListFilters = { search?: string };
export type TenantUserReference = Pick<TenantUser, "email" | "id" | "name" | "uuid">;
export type TenantUserFrappeCredentials = {
  apiKey: string;
  apiSecret: string;
  authenticatedUser: string | null;
  employeeCode: string | null;
  lastCheckedAt: string | null;
  lastVerifiedAt: string | null;
  verificationStatus: TenantUserFrappeVerificationStatus;
};
export type TenantUserFrappeImportPayload = {
  email: string;
  name: string;
};
export type TenantUserFrappeImportResult = {
  created: boolean;
  temporaryPassword: string | null;
  user: TenantUser;
};
export type TenantUserContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<TenantDatabase>;
  tenantId: string;
};
