export type TenantUserStatus = "active" | "inactive" | "suspended";
export type TenantUser = {
  frappeApiKeyConfigured: boolean;
  frappeApiSecretConfigured: boolean;
  frappeAuthenticatedUser: string | null;
  frappeEmployeeCode: string | null;
  frappeLastCheckedAt: string | null;
  frappeLastVerifiedAt: string | null;
  frappeVerificationStatus: "live" | "offline" | "unverified";
  id: number;
  isProtected: boolean;
  email: string;
  name: string;
  password?: string;
  status: TenantUserStatus;
  uuid: string;
};
export type TenantUserSavePayload = {
  email: string;
  frappeApiKey?: string;
  frappeApiSecret?: string;
  frappeEmployeeCode?: string | undefined;
  name: string;
  password?: string;
  status: TenantUserStatus;
};
export type TenantUserAccessSelection = {
  roleId: number | null;
};
export type TenantUserAccessOption = {
  description?: string;
  id: number;
  key: string;
  label: string;
};
export type TenantUserListFilters = { search?: string };
export type TenantUserFrappeVerification = {
  authenticatedUser: string;
  baseUrl: string;
  checkedAt: string;
  connected: true;
  employeeCode: string;
  latencyMs: number;
};
export type TenantUserTenantOption = {
  id: number;
  label: string;
  status: string;
  tenantCode: string;
};
