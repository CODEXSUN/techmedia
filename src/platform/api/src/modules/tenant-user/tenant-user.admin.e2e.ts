import assert from "node:assert/strict";
import { createApp } from "../../app.js";
import { signAuthToken } from "../../auth/jwt.js";

type Envelope<T> = { data: T; error?: { message?: string }; success: boolean };
type TenantOption = { id: number; status: string; tenantCode: string; tenantName: string };
type User = { email: string; id: number; name: string; status: string; uuid: string };

const app = await createApp();
const accessToken = signAuthToken({
  email: "tenant-user-e2e@codexsun.app",
  name: "Tenant User E2E",
  userId: "tenant-user-e2e",
  userType: "super_admin"
});
const headers = { authorization: `Bearer ${accessToken}` };
let created: User | null = null;
let tenantId = 0;

try {
  const forbidden = await app.inject({ method: "GET", url: "/admin/tenants/options" });
  assert.equal(forbidden.statusCode, 403, "Tenant options must require Super Admin access.");

  const options = await request<TenantOption[]>("GET", "/admin/tenants/options");
  const tenant = options.data.find((item) => item.status === "active") ?? options.data[0];
  assert.ok(tenant, "At least one provisioned tenant is required.");
  tenantId = tenant.id;

  const before = await request<User[]>("GET", `/admin/tenant-users?tenantId=${tenantId}`);
  const email = `tenant-user-e2e-${Date.now()}@example.test`;
  const createdResponse = await request<User>("POST", "/admin/tenant-users", {
    email,
    name: "Tenant User E2E",
    password: "TenantUser#2026",
    status: "active",
    tenantId: String(tenantId)
  });
  created = createdResponse.data;
  assert.equal(created.email, email);
  assert.equal(created.status, "active");

  const updated = await request<User>("PUT", `/admin/tenant-users/${created.id}`, {
    email,
    name: "Tenant User E2E Updated",
    status: "active",
    tenantId: String(tenantId)
  });
  assert.equal(updated.data.name, "Tenant User E2E Updated");

  const suspended = await request<User>("POST", `/admin/tenant-users/${created.id}/deactivate`, {
    tenantId: String(tenantId)
  });
  assert.equal(suspended.data.status, "inactive");

  const restored = await request<User>("POST", `/admin/tenant-users/${created.id}/activate`, {
    tenantId: String(tenantId)
  });
  assert.equal(restored.data.status, "active");

  const after = await request<User[]>("GET", `/admin/tenant-users?tenantId=${tenantId}`);
  assert.equal(after.data.length, before.data.length + 1);
  assert.ok(after.data.some((user) => user.id === created?.id));

  await request<User>("DELETE", `/admin/tenant-users/${created.id}/force?tenantId=${tenantId}`);
  created = null;

  console.info("Super Admin tenant-user E2E passed", {
    actions: ["list", "create", "update", "suspend", "restore", "force-delete"],
    tenant: tenant.tenantCode
  });
} finally {
  if (created && tenantId) {
    await app.inject({
      headers,
      method: "DELETE",
      url: `/admin/tenant-users/${created.id}/force?tenantId=${tenantId}`
    });
  }
  await app.close();
}

async function request<T>(
  method: "DELETE" | "GET" | "POST" | "PUT",
  url: string,
  payload?: Record<string, unknown>
) {
  const response = await app.inject(
    payload === undefined ? { headers, method, url } : { headers, method, payload, url }
  );
  const body = response.json() as Envelope<T>;
  assert.ok(
    response.statusCode >= 200 && response.statusCode < 300,
    body.error?.message ?? `Request failed with ${response.statusCode}.`
  );
  assert.equal(body.success, true);
  return body;
}
