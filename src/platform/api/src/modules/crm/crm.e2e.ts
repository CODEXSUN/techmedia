import assert from "node:assert/strict";
import { createApp } from "../../app.js";
import { getTenantDatabaseByName } from "../../database/tenant-database.js";
import { env } from "../../env.js";

const app = await createApp();
const fixtureEmail = `crm-manager-${Date.now()}@example.test`;
const fixturePassword = "TechMedia!234";
let tenantDatabase = "";
let fixtureUserId = 0;

try {
  const adminLogin = await request<{
    accessToken: string;
    tenantDbName: string;
    tenantId: string;
  }>("POST", "/auth/login", {
    corporateId: env.DEFAULT_TENANT_CORPORATE_ID,
    desk: "tenant",
    email: env.DEFAULT_TENANT_ADMIN_EMAIL,
    password: env.DEFAULT_TENANT_ADMIN_PASSWORD
  });
  tenantDatabase = adminLogin.data.tenantDbName;
  const adminHeaders = tenantHeaders(adminLogin.data);

  const user = await request<{ id: number }>(
    "POST",
    "/tenant/access/users",
    {
      email: fixtureEmail,
      name: "CRM E2E Manager",
      password: fixturePassword,
      status: "active"
    },
    adminHeaders
  );
  fixtureUserId = user.data.id;

  const roles = await request<Array<{ id: number; key: string }>>(
    "GET",
    "/tenant/access/roles",
    undefined,
    adminHeaders
  );
  const managerRole = roles.data.find((role) => role.key === "manager");
  assert.ok(managerRole, "Manager role must be seeded.");
  await request(
    "POST",
    "/tenant/access/user-roles",
    { roleId: managerRole.id, status: "active", userId: fixtureUserId },
    adminHeaders
  );

  const managerLogin = await request<{
    accessToken: string;
    permissions: string[];
    tenantDbName: string;
    tenantId: string;
    tenantRole: string;
  }>("POST", "/auth/login", {
    corporateId: env.DEFAULT_TENANT_CORPORATE_ID,
    desk: "tenant",
    email: fixtureEmail,
    password: fixturePassword
  });
  assert.equal(managerLogin.data.tenantRole, "user");
  assert.ok(managerLogin.data.permissions.includes("crm.enquiry.open.view"));
  assert.ok(managerLogin.data.permissions.includes("crm.enquiry.suspend"));
  const managerHeaders = tenantHeaders(managerLogin.data);

  const applicationResponse = await app.inject({
    headers: managerHeaders,
    method: "GET",
    url: "/tenant/access/users"
  });
  assert.equal(applicationResponse.statusCode, 403, "Manager must not access Application APIs.");

  const created = await request<{
    assignedToUserId: number;
    id: number;
    schedules: Array<{ scheduledOn: string }>;
    title: string;
  }>(
    "POST",
    "/tenant/crm/enquiries",
    {
      assignedToUserId: fixtureUserId,
      customer: "",
      enquiryDate: "2026-08-14",
      enquiryGroup: "Stores",
      messages: [{ comment: "Initial customer contact." }],
      mobile: "9999999999",
      priority: "high",
      schedules: [{ scheduledOn: "2026-08-15" }],
      status: "open",
      title: "CRM permission E2E enquiry",
      workspace: "<p>Created by the focused CRM API test.</p>"
    },
    managerHeaders
  );
  assert.equal(created.data.assignedToUserId, fixtureUserId);
  assert.deepEqual(
    created.data.schedules.map((schedule) => schedule.scheduledOn),
    ["2026-08-15"]
  );

  const unassigned = await request<{
    assignedTo: null;
    assignedToUserId: null;
    id: number;
  }>(
    "POST",
    "/tenant/crm/enquiries",
    {
      assignedToUserId: null,
      customer: "Walk-in customer",
      enquiryDate: "2026-08-14",
      enquiryGroup: "Stores",
      messages: [],
      mobile: "9888888888",
      priority: "normal",
      schedules: [],
      status: "open",
      title: "CRM unassigned E2E enquiry",
      workspace: "<p>Waiting for assignment.</p>"
    },
    managerHeaders
  );
  assert.equal(unassigned.data.assignedToUserId, null);
  assert.equal(unassigned.data.assignedTo, null);

  const assigned = await request<Array<{ id: number }>>(
    "GET",
    "/tenant/crm/enquiries?view=assigned",
    undefined,
    managerHeaders
  );
  const createdByMe = await request<Array<{ id: number }>>(
    "GET",
    "/tenant/crm/enquiries?view=created",
    undefined,
    managerHeaders
  );
  const open = await request<Array<{ id: number }>>(
    "GET",
    "/tenant/crm/enquiries?view=open",
    undefined,
    managerHeaders
  );
  assert.ok(assigned.data.some((record) => record.id === created.data.id));
  assert.ok(!assigned.data.some((record) => record.id === unassigned.data.id));
  assert.ok(createdByMe.data.some((record) => record.id === created.data.id));
  assert.ok(createdByMe.data.some((record) => record.id === unassigned.data.id));
  assert.ok(!open.data.some((record) => record.id === created.data.id));
  assert.ok(open.data.some((record) => record.id === unassigned.data.id));

  const overview = await request<{
    leaderboard: Array<{ total: number; user: { id: number } }>;
    stats: { open: number; total: number };
  }>("GET", "/tenant/crm/enquiries/overview", undefined, managerHeaders);
  assert.ok(overview.data.stats.total >= 2);
  assert.ok(overview.data.stats.open >= 1);
  assert.ok(
    overview.data.leaderboard.some((entry) => entry.user.id === fixtureUserId && entry.total >= 1)
  );

  const updated = await request<{ id: number; status: string; title: string }>(
    "PUT",
    `/tenant/crm/enquiries/${created.data.id}`,
    {
      assignedToUserId: fixtureUserId,
      customer: "",
      enquiryDate: "2026-08-14",
      enquiryGroup: "Service",
      messages: [{ comment: "Follow-up requested." }],
      mobile: "9999999999",
      priority: "urgent",
      schedules: [{ scheduledOn: "2026-08-16" }],
      status: "follow",
      title: "CRM permission E2E enquiry updated",
      workspace: "<p>Updated by the focused CRM API test.</p>"
    },
    managerHeaders
  );
  assert.equal(updated.data.status, "follow");
  assert.match(updated.data.title, /updated$/u);

  const suspended = await request<{ id: number; lifecycleStatus: string }>(
    "POST",
    `/tenant/crm/enquiries/${created.data.id}/suspend`,
    undefined,
    managerHeaders
  );
  assert.equal(suspended.data.lifecycleStatus, "suspended");

  const restored = await request<{ id: number; lifecycleStatus: string }>(
    "POST",
    `/tenant/crm/enquiries/${created.data.id}/restore`,
    undefined,
    managerHeaders
  );
  assert.equal(restored.data.lifecycleStatus, "active");

  const managerDelete = await app.inject({
    headers: managerHeaders,
    method: "DELETE",
    url: `/tenant/crm/enquiries/${created.data.id}/force`
  });
  assert.equal(managerDelete.statusCode, 403, "Manager must not force delete enquiries.");

  const deleted = await request<{ id: number }>(
    "DELETE",
    `/tenant/crm/enquiries/${created.data.id}/force`,
    undefined,
    adminHeaders
  );
  assert.equal(deleted.data.id, created.data.id);

  console.info("CRM Enquiry E2E passed", {
    applicationDeskStatus: applicationResponse.statusCode,
    enquiryId: created.data.id,
    managerForceDeleteStatus: managerDelete.statusCode,
    overviewTotal: overview.data.stats.total,
    views: ["assigned", "created", "open"]
  });
} finally {
  if (tenantDatabase && fixtureUserId) {
    const database = getTenantDatabaseByName(tenantDatabase);
    await database
      .deleteFrom("crm_enquiry_messages")
      .where(
        "enquiry_id",
        "in",
        database
          .selectFrom("crm_enquiries")
          .select("id")
          .where("created_by_user_id", "=", fixtureUserId)
      )
      .execute();
    await database
      .deleteFrom("crm_enquiry_schedules")
      .where(
        "enquiry_id",
        "in",
        database
          .selectFrom("crm_enquiries")
          .select("id")
          .where("created_by_user_id", "=", fixtureUserId)
      )
      .execute();
    await database
      .deleteFrom("crm_enquiries")
      .where("created_by_user_id", "=", fixtureUserId)
      .execute();
    await database.deleteFrom("user_roles").where("user_id", "=", fixtureUserId).execute();
    await database.deleteFrom("users").where("id", "=", fixtureUserId).execute();
  }
  await app.close();
}

async function request<T = unknown>(
  method: "DELETE" | "GET" | "POST" | "PUT",
  url: string,
  payload?: unknown,
  headers: Record<string, string> = {}
) {
  const response = await app.inject({ headers, method, ...(payload ? { payload } : {}), url });
  const body = response.json() as { data: T; error?: { message?: string }; success: boolean };
  assert.ok(
    response.statusCode >= 200 && response.statusCode < 300,
    body.error?.message ?? `Request failed with ${response.statusCode}.`
  );
  assert.equal(body.success, true);
  return body;
}

function tenantHeaders(input: { accessToken: string; tenantDbName: string; tenantId: string }) {
  return {
    authorization: `Bearer ${input.accessToken}`,
    "x-tenant-db": input.tenantDbName,
    "x-tenant-id": input.tenantId
  };
}
