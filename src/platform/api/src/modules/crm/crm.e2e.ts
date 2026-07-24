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
    subject: string;
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
      subject: "New workstation enquiry",
      title: "CRM permission E2E enquiry",
      workspace: "<p>Created by the focused CRM API test.</p>"
    },
    managerHeaders
  );
  assert.equal(created.data.assignedToUserId, fixtureUserId);
  assert.equal(created.data.subject, "New workstation enquiry");
  assert.deepEqual(
    created.data.schedules.map((schedule) => schedule.scheduledOn),
    ["2026-08-15"]
  );

  const withReply = await request<{
    activities: Array<{ action: string }>;
    messages: Array<{
      canDelete: boolean;
      canEdit: boolean;
      comment: string;
      id: number;
      messageType: string;
    }>;
  }>(
    "POST",
    `/tenant/crm/enquiries/${created.data.id}/messages`,
    { comment: "Reply from the CRM workspace.", messageType: "reply" },
    managerHeaders
  );
  assert.ok(
    withReply.data.messages.some(
      (message) =>
        message.messageType === "reply" && message.comment === "Reply from the CRM workspace."
    )
  );
  const reply = withReply.data.messages.at(-1);
  assert.ok(reply);
  assert.equal(reply.messageType, "reply");
  assert.equal(reply.canEdit, true);
  assert.equal(reply.canDelete, true);

  const editedReply = await request<{
    messages: Array<{ comment: string; id: number }>;
  }>(
    "PUT",
    `/tenant/crm/enquiries/${created.data.id}/messages/${reply.id}`,
    { comment: "Edited reply from the CRM workspace." },
    managerHeaders
  );
  assert.equal(
    editedReply.data.messages.find((message) => message.id === reply.id)?.comment,
    "Edited reply from the CRM workspace."
  );

  const withLaterComment = await request<{
    messages: Array<{ canDelete: boolean; canEdit: boolean; comment: string; id: number }>;
  }>(
    "POST",
    `/tenant/crm/enquiries/${created.data.id}/messages`,
    { comment: "A later conversation entry.", messageType: "comment" },
    managerHeaders
  );
  const laterComment = withLaterComment.data.messages.at(-1);
  assert.ok(laterComment);
  assert.equal(laterComment.canEdit, true);
  assert.equal(laterComment.canDelete, true);
  assert.equal(
    withLaterComment.data.messages.find((message) => message.id === reply.id)?.canDelete,
    false
  );

  const lockedDelete = await app.inject({
    headers: managerHeaders,
    method: "DELETE",
    url: `/tenant/crm/enquiries/${created.data.id}/messages/${reply.id}`
  });
  assert.equal(
    lockedDelete.statusCode,
    409,
    "A conversation entry must be locked after a newer comment or reply exists."
  );

  const afterLatestDelete = await request<{
    activities: Array<{ action: string }>;
    messages: Array<{ id: number }>;
  }>(
    "DELETE",
    `/tenant/crm/enquiries/${created.data.id}/messages/${laterComment.id}`,
    undefined,
    managerHeaders
  );
  assert.ok(!afterLatestDelete.data.messages.some((message) => message.id === laterComment.id));
  assert.ok(
    afterLatestDelete.data.activities.some((activity) => activity.action === "comment-deleted")
  );

  const withEmail = await request<{ emails: Array<{ subject: string }> }>(
    "POST",
    `/tenant/crm/enquiries/${created.data.id}/emails`,
    {
      body: "Email body from the CRM E2E test.",
      recipient: "customer@example.test",
      subject: "CRM E2E email"
    },
    managerHeaders
  );
  assert.ok(withEmail.data.emails.some((email) => email.subject === "CRM E2E email"));

  const withCall = await request<{ calls: Array<{ phone: string }> }>(
    "POST",
    `/tenant/crm/enquiries/${created.data.id}/calls`,
    {
      calledAt: "2026-08-14T10:30:00.000Z",
      phone: "9999999999",
      summary: "Customer requested a follow-up."
    },
    managerHeaders
  );
  assert.ok(withCall.data.calls.some((call) => call.phone === "9999999999"));

  const withTask = await request<{ tasks: Array<{ title: string }> }>(
    "POST",
    `/tenant/crm/enquiries/${created.data.id}/tasks`,
    { dueOn: "2026-08-18", status: "pending", title: "Complete CRM E2E follow-up" },
    managerHeaders
  );
  assert.ok(withTask.data.tasks.some((task) => task.title === "Complete CRM E2E follow-up"));

  const withNote = await request<{ notes: Array<{ note: string }> }>(
    "POST",
    `/tenant/crm/enquiries/${created.data.id}/notes`,
    { note: "Private CRM E2E note." },
    managerHeaders
  );
  assert.ok(withNote.data.notes.some((note) => note.note === "Private CRM E2E note."));

  const withAttachment = await request<{
    activities: Array<{ action: string }>;
    attachments: Array<{ fileName: string }>;
  }>(
    "POST",
    `/tenant/crm/enquiries/${created.data.id}/attachments`,
    { fileName: "crm-e2e.txt", fileUrl: "https://example.test/crm-e2e.txt" },
    managerHeaders
  );
  assert.ok(
    withAttachment.data.attachments.some((attachment) => attachment.fileName === "crm-e2e.txt")
  );
  assert.ok(withAttachment.data.activities.length >= 6);

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

  const updated = await request<{
    id: number;
    messages: Array<{ comment: string; messageType: string }>;
    status: string;
    subject: string;
    title: string;
  }>(
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
      subject: "Updated workstation enquiry",
      title: "CRM permission E2E enquiry updated",
      workspace: "<p>Updated by the focused CRM API test.</p>"
    },
    managerHeaders
  );
  assert.equal(updated.data.status, "follow");
  assert.equal(updated.data.subject, "Updated workstation enquiry");
  assert.match(updated.data.title, /updated$/u);
  assert.ok(
    updated.data.messages.some(
      (message) =>
        message.messageType === "reply" &&
        message.comment === "Edited reply from the CRM workspace."
    ),
    "Normal enquiry edits must preserve conversation message types."
  );

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
  const database = getTenantDatabaseByName(tenantDatabase);
  for (const table of [
    "crm_enquiry_activities",
    "crm_enquiry_attachments",
    "crm_enquiry_calls",
    "crm_enquiry_emails",
    "crm_enquiry_messages",
    "crm_enquiry_notes",
    "crm_enquiry_schedules",
    "crm_enquiry_tasks"
  ] as const) {
    const remaining = await database
      .selectFrom(table)
      .select((expression) => expression.fn.countAll<number>().as("count"))
      .where("enquiry_id", "=", created.data.id)
      .executeTakeFirstOrThrow();
    assert.equal(Number(remaining.count), 0, `${table} must cascade when an enquiry is deleted.`);
  }

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
