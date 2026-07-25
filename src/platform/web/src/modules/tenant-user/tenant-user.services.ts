import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  getToken,
  setToken
} from "../../shared/api/platform-api";
import { requiredClientEnv } from "../../shared/env/client-env";
import type {
  TenantUser,
  TenantUserFrappeVerification,
  TenantUserListFilters,
  TenantUserSavePayload,
  TenantUserTenantOption,
  TenantUserProfile,
  TenantUserProfileSavePayload
} from "./tenant-user.types";
const path = "/tenant/access/users";
type ProfileApiRecord = Omit<TenantUserProfile, "avatarUrl">;
export async function getTenantUserProfile(): Promise<TenantUserProfile> {
  return withAvatarUrl(await apiGet<ProfileApiRecord>("/tenant/profile", "tenant"));
}
export async function updateTenantUserProfile(payload: TenantUserProfileSavePayload) {
  const response = await apiPut<{ accessToken: string; profile: ProfileApiRecord }>(
    "/tenant/profile",
    payload,
    "tenant"
  );
  setToken("tenant", response.accessToken);
  return withAvatarUrl(response.profile);
}
export async function uploadTenantUserAvatar(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Select a PNG, JPEG, or WebP image.");
  if (file.size > 1024 * 1024) throw new Error("Avatar images must be 1 MB or smaller.");
  return apiPost<{ path: string }>(
    "/tenant/media/user-avatar",
    { contentBase64: await fileToBase64(file), mimeType: file.type },
    "tenant"
  );
}
function withAvatarUrl(profile: ProfileApiRecord): TenantUserProfile {
  const base = requiredClientEnv("VITE_PLATFORM_API_URL").replace(/\/$/, "");
  const revision = getToken("tenant")?.slice(-12) ?? "profile";
  return { ...profile, avatarUrl: `${base}${profile.avatarPath}?v=${revision}` };
}
function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read the selected avatar."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}
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
