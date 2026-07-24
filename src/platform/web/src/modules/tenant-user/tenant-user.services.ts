import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  TenantUser,
  TenantUserFrappeVerification,
  TenantUserListFilters,
  TenantUserSavePayload,
  TenantUserTenantOption
} from "./tenant-user.types";
const path = "/tenant/access/users";
export function listTenantUsers(filters: TenantUserListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return apiGet<TenantUser[]>(`${path}${query.size ? `?${query}` : ""}`, "tenant");
}
export function createTenantUser(payload: TenantUserSavePayload) {
  return apiPost<TenantUser>(path, toApi(payload), "tenant");
}
export function updateTenantUser(id: number, payload: TenantUserSavePayload) {
  return apiPut<TenantUser>(`${path}/${id}`, toApi(payload), "tenant");
}
export function activateTenantUser(id: number) {
  return apiPost<TenantUser>(`${path}/${id}/activate`, {}, "tenant");
}
export function deactivateTenantUser(id: number) {
  return apiPost<TenantUser>(`${path}/${id}/deactivate`, {}, "tenant");
}
export function suspendTenantUser(id: number) {
  return apiPost<TenantUser>(`${path}/${id}/suspend`, {}, "tenant");
}
export function forceDeleteTenantUser(id: number) {
  return apiDelete<TenantUser>(`${path}/${id}/force`, "tenant");
}
export function verifyTenantUserFrappeCredentials(id: number) {
  return apiPost<TenantUserFrappeVerification>(
    `/tenant/frappe/settings/users/${id}/verify`,
    {},
    "tenant"
  );
}
function toApi(payload: TenantUserSavePayload) {
  const { frappeApiKey, frappeApiSecret, frappeEmployeeCode, password, ...value } = payload;
  return {
    ...value,
    ...(frappeApiKey ? { frappeApiKey } : {}),
    ...(frappeApiSecret ? { frappeApiSecret } : {}),
    ...(frappeEmployeeCode !== undefined ? { frappeEmployeeCode } : {}),
    ...(password ? { password } : {})
  };
}

type TenantOptionResponse = {
  id: number;
  status: string;
  tenantCode: string;
  tenantName: string;
};

const adminPath = "/admin/tenant-users";

export async function listTenantUserTenants(): Promise<TenantUserTenantOption[]> {
  const tenants = await apiGet<TenantOptionResponse[]>("/admin/tenants/options", "sa");
  return tenants.map((tenant) => ({
    id: tenant.id,
    label: tenant.tenantName,
    status: tenant.status,
    tenantCode: tenant.tenantCode
  }));
}

export function listAdminTenantUsers(tenantId: number, filters: TenantUserListFilters = {}) {
  const query = new URLSearchParams({ tenantId: String(tenantId) });
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return apiGet<TenantUser[]>(`${adminPath}?${query}`, "sa");
}

export function createAdminTenantUser(tenantId: number, payload: TenantUserSavePayload) {
  return apiPost<TenantUser>(adminPath, { ...toApi(payload), tenantId: String(tenantId) }, "sa");
}

export function updateAdminTenantUser(
  tenantId: number,
  id: number,
  payload: TenantUserSavePayload
) {
  return apiPut<TenantUser>(
    `${adminPath}/${id}`,
    { ...toApi(payload), tenantId: String(tenantId) },
    "sa"
  );
}

export function activateAdminTenantUser(tenantId: number, id: number) {
  return apiPost<TenantUser>(`${adminPath}/${id}/activate`, { tenantId: String(tenantId) }, "sa");
}

export function deactivateAdminTenantUser(tenantId: number, id: number) {
  return apiPost<TenantUser>(`${adminPath}/${id}/deactivate`, { tenantId: String(tenantId) }, "sa");
}

export function forceDeleteAdminTenantUser(tenantId: number, id: number) {
  return apiDelete<TenantUser>(`${adminPath}/${id}/force?tenantId=${tenantId}`, "sa");
}
