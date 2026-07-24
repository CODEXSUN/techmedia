import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Selectable } from "kysely";
import { createApp } from "../../app.js";
import type { FrappeConnectionSettingsTable, TenantUsersTable } from "../../database/schema.js";
import { getTenantDatabaseByName } from "../../database/tenant-database.js";
import { env } from "../../env.js";
import { frappeConnectionContract } from "./frappe.service.js";

const apiKey = `frappe-key-${Date.now()}`;
const apiSecret = `frappe-secret-${Date.now()}`;
let receivedAuthorization = "";
let receivedBody = "";
let receivedMethod = "";
let receivedPath = "";
let handshakeCount = 0;
let frappeCredentialsAccepted = true;
const frappeEnquiryName = `ENQ-E2E-${Date.now()}`;
const lifecycleFrappeEnquiryName = `ENQ-LIVE-${Date.now()}`;
const frappeUserEmail = `frappe-user-${Date.now()}@example.test`;
const frappeServer = createServer(async (request, response) => {
  receivedAuthorization = request.headers.authorization ?? "";
  receivedBody = "";
  receivedMethod = request.method ?? "";
  receivedPath = request.url ?? "";
  for await (const chunk of request) receivedBody += chunk.toString();
  response.setHeader("Content-Type", "application/json");
  if (!frappeCredentialsAccepted || receivedAuthorization !== `token ${apiKey}:${apiSecret}`) {
    response.statusCode = 401;
    response.end(JSON.stringify({ exc_type: "AuthenticationError" }));
    return;
  }
  if (receivedPath === "/api/method/frappe.auth.get_logged_user") {
    handshakeCount += 1;
    response.end(JSON.stringify({ message: "integration@frappe.test" }));
    return;
  }
  if (receivedPath.startsWith("/api/resource/Employee?")) {
    response.end(JSON.stringify({ data: [{ name: "EMP-CREATOR" }] }));
    return;
  }
  if (receivedPath === "/api/resource/Enquiry" && receivedMethod === "POST") {
    if (!JSON.parse(receivedBody).user_employee) {
      response.statusCode = 417;
      response.end(JSON.stringify({ message: "Value missing for Enquiry: User" }));
      return;
    }
    response.end(
      JSON.stringify({
        data: {
          modified: "2026-07-24 05:00:00",
          name: lifecycleFrappeEnquiryName
        }
      })
    );
    return;
  }
  if (
    receivedPath === `/api/resource/Enquiry/${lifecycleFrappeEnquiryName}` &&
    receivedMethod === "PUT"
  ) {
    response.end(
      JSON.stringify({
        data: {
          modified: "2026-07-24 05:05:00",
          name: lifecycleFrappeEnquiryName
        }
      })
    );
    return;
  }
  if (
    receivedPath === `/api/resource/Enquiry/${lifecycleFrappeEnquiryName}` &&
    receivedMethod === "DELETE"
  ) {
    response.end(JSON.stringify({ message: "ok" }));
    return;
  }
  if (receivedPath.startsWith("/api/resource/Enquiry?")) {
    response.end(JSON.stringify({ data: [{ name: frappeEnquiryName }] }));
    return;
  }
  if (receivedPath === `/api/resource/Enquiry/${frappeEnquiryName}`) {
    response.end(
      JSON.stringify({
        data: {
          assigned_to_employee: "EMP-E2E",
          customer: "",
          date: "2026-07-23",
          enquiry_details: "Frappe pull E2E enquiry",
          enquiry_messages: [{ comment: "Pulled from the mock Frappe server." }],
          group: "Stores",
          mobile: "9999999999",
          modified: "2026-07-23 10:00:00",
          name: frappeEnquiryName,
          status: "Follow",
          status_details: "Mapped status details."
        }
      })
    );
    return;
  }
  if (receivedPath === "/api/resource/Employee/EMP-E2E") {
    response.end(JSON.stringify({ data: { user_id: env.DEFAULT_TENANT_ADMIN_EMAIL } }));
    return;
  }
  if (receivedPath.startsWith("/api/resource/User?")) {
    response.end(
      JSON.stringify({
        data: [
          {
            email: frappeUserEmail,
            enabled: 1,
            full_name: "Frappe Imported User",
            last_active: "2026-07-23 11:30:00",
            name: frappeUserEmail,
            user_type: "System User",
            username: "frappe-imported"
          }
        ]
      })
    );
    return;
  }
  if (receivedPath === `/api/resource/User/${encodeURIComponent(frappeUserEmail)}`) {
    response.end(
      JSON.stringify({
        data: {
          email: frappeUserEmail,
          enabled: 1,
          full_name: "Frappe Imported User",
          last_active: "2026-07-23 11:30:00",
          name: frappeUserEmail,
          user_type: "System User",
          username: "frappe-imported"
        }
      })
    );
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ exc_type: "DoesNotExistError" }));
});
await new Promise<void>((resolve) => frappeServer.listen(0, "127.0.0.1", resolve));
const address = frappeServer.address() as AddressInfo;
const frappeBaseUrl = `http://127.0.0.1:${address.port}`;
const app = await createApp();
let tenantDatabase = "";
let original: Selectable<FrappeConnectionSettingsTable> | undefined;
let originalUserCredentials:
  | Pick<
      Selectable<TenantUsersTable>,
      | "frappe_api_key_ciphertext"
      | "frappe_api_secret_ciphertext"
      | "frappe_authenticated_user"
      | "frappe_last_checked_at"
      | "frappe_last_verified_at"
      | "frappe_verification_status"
    >
  | undefined;
let adminUserId = 0;
let pulledCrmEnquiryId = 0;
let lifecycleCrmEnquiryId = 0;
let importedUserId = 0;

try {
  const login = await request<{
    accessToken: string;
    permissions: string[];
    tenantDbName: string;
    tenantId: string;
  }>("POST", "/auth/login", {
    corporateId: env.DEFAULT_TENANT_CORPORATE_ID,
    desk: "tenant",
    email: env.DEFAULT_TENANT_ADMIN_EMAIL,
    password: env.DEFAULT_TENANT_ADMIN_PASSWORD
  });
  tenantDatabase = login.data.tenantDbName;
  const headers = tenantHeaders(login.data);
  assert.ok(login.data.permissions.includes("frappe.connection.view"));
  assert.ok(login.data.permissions.includes("frappe.connection.update"));

  const database = getTenantDatabaseByName(tenantDatabase);
  original = (await database
    .selectFrom("frappe_connection_settings")
    .selectAll()
    .where("connection_key", "=", "default")
    .executeTakeFirst()) as typeof original;
  const adminUser = await database
    .selectFrom("users")
    .selectAll()
    .where("email", "=", env.DEFAULT_TENANT_ADMIN_EMAIL)
    .executeTakeFirstOrThrow();
  adminUserId = Number(adminUser.id);
  originalUserCredentials = {
    frappe_api_key_ciphertext: adminUser.frappe_api_key_ciphertext,
    frappe_api_secret_ciphertext: adminUser.frappe_api_secret_ciphertext,
    frappe_authenticated_user: adminUser.frappe_authenticated_user,
    frappe_last_checked_at: adminUser.frappe_last_checked_at,
    frappe_last_verified_at: adminUser.frappe_last_verified_at,
    frappe_verification_status: adminUser.frappe_verification_status
  };

  const saved = await request<{
    appKeyConfigured: boolean;
    appSecretConfigured: boolean;
    baseUrl: string;
    connectionName: string;
    enabled: boolean;
    lastCheckedAt: string | null;
    lastVerifiedAt: string | null;
    verificationStatus: "live" | "offline" | "unverified";
  }>(
    "PUT",
    "/tenant/frappe/settings",
    {
      appKey: apiKey,
      appSecret: apiSecret,
      baseUrl: `${frappeBaseUrl}/`,
      connectionName: "Frappe E2E",
      enabled: true
    },
    headers
  );
  assert.equal(saved.data.baseUrl, frappeBaseUrl);
  assert.equal(saved.data.appKeyConfigured, true);
  assert.equal(saved.data.appSecretConfigured, true);
  assert.equal(saved.data.enabled, true);
  assert.equal(saved.data.verificationStatus, "unverified");
  assert.equal(saved.data.lastCheckedAt, null);
  assert.equal(saved.data.lastVerifiedAt, null);
  const storedAppCredentials = await database
    .selectFrom("frappe_connection_settings")
    .select(["app_key_ciphertext", "app_secret_ciphertext"])
    .where("connection_key", "=", "default")
    .executeTakeFirstOrThrow();
  assert.doesNotMatch(storedAppCredentials.app_key_ciphertext ?? "", new RegExp(apiKey, "u"));
  assert.doesNotMatch(storedAppCredentials.app_secret_ciphertext ?? "", new RegExp(apiSecret, "u"));
  const verifiedAppConnection = await request<{
    authenticatedUser: string;
    baseUrl: string;
    checkedAt: string;
    connected: true;
    latencyMs: number;
  }>("POST", "/tenant/frappe/settings/verify", { baseUrl: frappeBaseUrl }, headers);
  assert.equal(verifiedAppConnection.data.authenticatedUser, "integration@frappe.test");
  assert.equal(receivedAuthorization, `token ${apiKey}:${apiSecret}`);
  const userWithCredentials = await request<{
    frappeApiKeyConfigured: boolean;
    frappeApiSecretConfigured: boolean;
    frappeVerificationStatus: string;
    id: number;
  }>(
    "PUT",
    `/tenant/access/users/${adminUserId}`,
    {
      email: adminUser.email,
      frappeApiKey: apiKey,
      frappeApiSecret: apiSecret,
      name: adminUser.name,
      status: adminUser.status
    },
    headers
  );
  assert.equal(userWithCredentials.data.frappeApiKeyConfigured, true);
  assert.equal(userWithCredentials.data.frappeApiSecretConfigured, true);
  assert.equal(userWithCredentials.data.frappeVerificationStatus, "unverified");

  const verified = await request<{
    authenticatedUser: string;
    baseUrl: string;
    checkedAt: string;
    connected: true;
    latencyMs: number;
  }>("POST", `/tenant/frappe/settings/users/${adminUserId}/verify`, undefined, headers);
  assert.equal(verified.data.connected, true);
  assert.equal(verified.data.authenticatedUser, "integration@frappe.test");
  assert.equal(verified.data.baseUrl, frappeBaseUrl);
  assert.ok(verified.data.latencyMs >= 0);
  assert.equal(receivedAuthorization, `token ${apiKey}:${apiSecret}`);
  assert.equal(receivedPath, "/api/method/frappe.auth.get_logged_user");
  const handshakeCountAfterUserVerification = handshakeCount;
  const loginUsingSavedVerification = await request<{
    frappeAuthenticated: boolean;
    frappeAuthenticatedUser: string | null;
    frappeConnectionStatus: string;
  }>("POST", "/auth/login", {
    corporateId: env.DEFAULT_TENANT_CORPORATE_ID,
    desk: "tenant",
    email: env.DEFAULT_TENANT_ADMIN_EMAIL,
    password: env.DEFAULT_TENANT_ADMIN_PASSWORD
  });
  assert.equal(loginUsingSavedVerification.data.frappeAuthenticated, true);
  assert.equal(loginUsingSavedVerification.data.frappeAuthenticatedUser, "integration@frappe.test");
  assert.equal(loginUsingSavedVerification.data.frappeConnectionStatus, "live");
  assert.equal(handshakeCount, handshakeCountAfterUserVerification);

  const persisted = await database
    .selectFrom("users")
    .select(["frappe_api_key_ciphertext", "frappe_api_secret_ciphertext"])
    .where("id", "=", adminUserId)
    .executeTakeFirstOrThrow();
  assert.doesNotMatch(persisted.frappe_api_key_ciphertext ?? "", new RegExp(apiKey, "u"));
  assert.doesNotMatch(persisted.frappe_api_secret_ciphertext ?? "", new RegExp(apiSecret, "u"));

  const reusable = await frappeConnectionContract({ database, userId: adminUserId }).get();
  assert.equal(reusable?.apiKey, apiKey);
  assert.equal(reusable?.apiSecret, apiSecret);
  assert.equal(reusable?.baseUrl, frappeBaseUrl);

  const userPreview = await request<
    Array<{
      email: string;
      enabled: boolean;
      frappeUserId: string;
      lastActiveAt: string | null;
      localStatus: "active" | "inactive" | "suspended" | null;
      localUserId: number | null;
      name: string;
      userType: string;
    }>
  >("GET", "/tenant/frappe/user-sync/preview", undefined, headers);
  assert.deepEqual(userPreview.data, [
    {
      email: frappeUserEmail,
      enabled: true,
      frappeUserId: frappeUserEmail,
      lastActiveAt: "2026-07-23 11:30:00",
      localStatus: null,
      localUserId: null,
      name: "Frappe Imported User",
      userType: "System User"
    }
  ]);
  const importedUser = await request<{
    created: boolean;
    temporaryPassword: string | null;
    user: { email: string; id: number; name: string; status: string };
  }>("POST", "/tenant/frappe/user-sync/import", { frappeUserId: frappeUserEmail }, headers);
  assert.equal(importedUser.data.created, true);
  assert.ok((importedUser.data.temporaryPassword?.length ?? 0) >= 8);
  assert.equal(importedUser.data.user.email, frappeUserEmail);
  assert.equal(importedUser.data.user.status, "active");
  importedUserId = importedUser.data.user.id;
  const savedImportedUser = await database
    .selectFrom("users")
    .select(["email", "name", "password_hash", "status"])
    .where("id", "=", importedUserId)
    .executeTakeFirstOrThrow();
  assert.equal(savedImportedUser.email, frappeUserEmail);
  assert.equal(savedImportedUser.name, "Frappe Imported User");
  assert.equal(savedImportedUser.status, "active");
  assert.notEqual(savedImportedUser.password_hash, importedUser.data.temporaryPassword);
  const importedUserRole = await database
    .selectFrom("user_roles as userRole")
    .innerJoin("roles as role", "role.id", "userRole.role_id")
    .select(["role.key as roleKey", "userRole.status"])
    .where("userRole.user_id", "=", importedUserId)
    .where("role.key", "=", "user")
    .executeTakeFirstOrThrow();
  assert.equal(importedUserRole.roleKey, "user");
  assert.equal(importedUserRole.status, "active");
  const importedUserLogin = await request<{
    permissions: string[];
  }>("POST", "/auth/login", {
    corporateId: env.DEFAULT_TENANT_CORPORATE_ID,
    desk: "tenant",
    email: frappeUserEmail,
    password: importedUser.data.temporaryPassword
  });
  assert.ok(importedUserLogin.data.permissions.includes("crm.enquiry.assigned.view"));
  assert.ok(importedUserLogin.data.permissions.includes("crm.enquiry.created.view"));
  assert.ok(!importedUserLogin.data.permissions.includes("core.application.records.view"));
  const previewAfterImport = await request<typeof userPreview.data>(
    "GET",
    "/tenant/frappe/user-sync/preview",
    undefined,
    headers
  );
  assert.equal(previewAfterImport.data[0]?.localUserId, importedUserId);
  assert.equal(previewAfterImport.data[0]?.localStatus, "active");
  const duplicateImport = await request<typeof importedUser.data>(
    "POST",
    "/tenant/frappe/user-sync/import",
    { frappeUserId: frappeUserEmail },
    headers
  );
  assert.equal(duplicateImport.data.created, false);
  assert.equal(duplicateImport.data.temporaryPassword, null);
  assert.equal(duplicateImport.data.user.id, importedUserId);

  const syncSettings = await request<{
    enquiryDoctype: "Enquiry";
    pullEnquiriesEnabled: boolean;
    pushEnquiriesEnabled: boolean;
  }>(
    "PUT",
    "/tenant/frappe/enquiry-sync",
    { pullEnquiriesEnabled: true, pushEnquiriesEnabled: false },
    headers
  );
  assert.equal(syncSettings.data.enquiryDoctype, "Enquiry");
  assert.equal(syncSettings.data.pullEnquiriesEnabled, true);
  assert.equal(syncSettings.data.pushEnquiriesEnabled, false);
  const pulled = await request<{
    created: number;
    direction: "pull";
    failed: number;
    processed: number;
    updated: number;
  }>("POST", "/tenant/frappe/enquiry-sync/pull", undefined, headers);
  assert.equal(pulled.data.direction, "pull");
  assert.equal(pulled.data.created, 1);
  assert.equal(pulled.data.failed, 0);
  const pulledLink = await database
    .selectFrom("frappe_enquiry_links")
    .select("crm_enquiry_id")
    .where("frappe_name", "=", frappeEnquiryName)
    .executeTakeFirstOrThrow();
  pulledCrmEnquiryId = pulledLink.crm_enquiry_id;
  const pulledEnquiry = await database
    .selectFrom("crm_enquiries")
    .select(["mobile", "enquiry_group", "status", "title"])
    .where("id", "=", pulledCrmEnquiryId)
    .executeTakeFirstOrThrow();
  assert.deepEqual(pulledEnquiry, {
    enquiry_group: "Stores",
    mobile: "9999999999",
    status: "follow",
    title: "Frappe pull E2E enquiry"
  });

  await request(
    "PUT",
    "/tenant/frappe/enquiry-sync",
    { pullEnquiriesEnabled: true, pushEnquiriesEnabled: true },
    headers
  );
  const lifecycleCreated = await request<{ id: number; subject: string }>(
    "POST",
    "/tenant/crm/enquiries",
    {
      assignedToUserId: null,
      customer: "Live Frappe customer",
      enquiryDate: null,
      enquiryGroup: "Stores",
      messages: [{ comment: "Created through the TechMedia CRM lifecycle." }],
      mobile: "9888888888",
      priority: "normal",
      schedules: [],
      status: "open",
      subject: "Live Frappe lifecycle enquiry",
      title: "Live Frappe lifecycle enquiry",
      workspace: "Created from TechMedia"
    },
    headers
  );
  lifecycleCrmEnquiryId = lifecycleCreated.data.id;
  assert.equal(receivedMethod, "POST");
  assert.equal(receivedPath, "/api/resource/Enquiry");
  assert.match(JSON.parse(receivedBody).date, /^\d{4}-\d{2}-\d{2}$/u);
  assert.equal(JSON.parse(receivedBody).user_employee, "EMP-CREATOR");
  const lifecycleLink = await database
    .selectFrom("frappe_enquiry_links")
    .select(["frappe_name", "sync_status"])
    .where("crm_enquiry_id", "=", lifecycleCrmEnquiryId)
    .executeTakeFirstOrThrow();
  assert.equal(lifecycleLink.frappe_name, lifecycleFrappeEnquiryName);
  assert.equal(lifecycleLink.sync_status, "synced");

  const lifecycleUpdated = await request<{ subject: string }>(
    "PUT",
    `/tenant/crm/enquiries/${lifecycleCrmEnquiryId}`,
    {
      assignedToUserId: null,
      customer: "Live Frappe customer",
      enquiryDate: "2026-07-25",
      enquiryGroup: "Stores",
      messages: [{ comment: "Created through the TechMedia CRM lifecycle." }],
      mobile: "9888888888",
      priority: "high",
      schedules: [],
      status: "follow",
      subject: "Updated live Frappe lifecycle enquiry",
      title: "Live Frappe lifecycle enquiry",
      workspace: "Updated from TechMedia"
    },
    headers
  );
  assert.equal(lifecycleUpdated.data.subject, "Updated live Frappe lifecycle enquiry");
  assert.equal(receivedMethod, "PUT");
  assert.equal(receivedPath, `/api/resource/Enquiry/${lifecycleFrappeEnquiryName}`);

  const lifecycleResynced = await request<{
    action: "updated";
    frappeName: string;
  }>("POST", `/tenant/crm/enquiries/${lifecycleCrmEnquiryId}/resync`, undefined, headers);
  assert.equal(lifecycleResynced.data.action, "updated");
  assert.equal(lifecycleResynced.data.frappeName, lifecycleFrappeEnquiryName);
  assert.equal(receivedMethod, "PUT");
  assert.equal(receivedPath, `/api/resource/Enquiry/${lifecycleFrappeEnquiryName}`);

  frappeCredentialsAccepted = false;
  const rejectedLifecycleRequest = await app.inject({
    headers,
    method: "POST",
    url: `/tenant/crm/enquiries/${lifecycleCrmEnquiryId}/resync`
  });
  assert.equal(rejectedLifecycleRequest.statusCode, 422);
  assert.match(rejectedLifecycleRequest.body, /saved API key or secret/u);
  const rejectedUserCredentials = await database
    .selectFrom("users")
    .select("frappe_verification_status")
    .where("id", "=", adminUserId)
    .executeTakeFirstOrThrow();
  assert.equal(rejectedUserCredentials.frappe_verification_status, "offline");
  frappeCredentialsAccepted = true;
  await request<typeof verified.data>(
    "POST",
    `/tenant/frappe/settings/users/${adminUserId}/verify`,
    undefined,
    headers
  );

  await request(
    "DELETE",
    `/tenant/crm/enquiries/${lifecycleCrmEnquiryId}/force`,
    undefined,
    headers
  );
  assert.equal(receivedMethod, "DELETE");
  assert.equal(receivedPath, `/api/resource/Enquiry/${lifecycleFrappeEnquiryName}`);
  assert.equal(
    await database
      .selectFrom("crm_enquiries")
      .select("id")
      .where("id", "=", lifecycleCrmEnquiryId)
      .executeTakeFirst(),
    undefined
  );
  lifecycleCrmEnquiryId = 0;

  const verifiedWithSavedCredentials = await request<typeof verified.data>(
    "POST",
    "/tenant/frappe/settings/verify",
    { baseUrl: frappeBaseUrl },
    headers
  );
  assert.equal(verifiedWithSavedCredentials.data.authenticatedUser, "integration@frappe.test");
  assert.equal(receivedAuthorization, `token ${apiKey}:${apiSecret}`);

  const liveSettings = await request<typeof saved.data>(
    "GET",
    "/tenant/frappe/settings",
    undefined,
    headers
  );
  assert.equal(liveSettings.data.verificationStatus, "live");
  assert.ok(liveSettings.data.lastCheckedAt);
  assert.ok(liveSettings.data.lastVerifiedAt);

  const failedVerification = await app.inject({
    headers,
    method: "POST",
    payload: { baseUrl: frappeBaseUrl },
    url: "/tenant/frappe/settings/verify"
  });
  assert.equal(failedVerification.statusCode, 200);

  await request(
    "PUT",
    `/tenant/access/users/${adminUserId}`,
    {
      email: adminUser.email,
      frappeApiKey: "wrong-key",
      frappeApiSecret: "wrong-secret",
      name: adminUser.name,
      status: adminUser.status
    },
    headers
  );
  const rejectedCredentials = await app.inject({
    headers,
    method: "POST",
    payload: { appKey: "wrong-key", appSecret: "wrong-secret", baseUrl: frappeBaseUrl },
    url: "/tenant/frappe/settings/verify"
  });
  assert.equal(rejectedCredentials.statusCode, 400);
  assert.doesNotMatch(rejectedCredentials.body, /wrong-key|wrong-secret/u);
  const offlineSettings = await request<typeof saved.data>(
    "GET",
    "/tenant/frappe/settings",
    undefined,
    headers
  );
  assert.equal(offlineSettings.data.verificationStatus, "offline");
  assert.ok(offlineSettings.data.lastCheckedAt);
  assert.ok(offlineSettings.data.lastVerifiedAt);

  await request(
    "PUT",
    `/tenant/access/users/${adminUserId}`,
    {
      email: adminUser.email,
      frappeApiKey: apiKey,
      frappeApiSecret: apiSecret,
      name: adminUser.name,
      status: adminUser.status
    },
    headers
  );
  await request<typeof verified.data>(
    "POST",
    "/tenant/frappe/settings/verify",
    { baseUrl: frappeBaseUrl },
    headers
  );
  await request<typeof verified.data>(
    "POST",
    `/tenant/frappe/settings/users/${adminUserId}/verify`,
    undefined,
    headers
  );
  const loaded = await request<typeof saved.data>(
    "GET",
    "/tenant/frappe/settings",
    undefined,
    headers
  );
  assert.equal(loaded.data.verificationStatus, "live");
  const handshakeCountBeforeRelogin = handshakeCount;
  const authenticatedAgain = await request<{
    frappeAuthenticated: boolean;
    frappeAuthenticatedUser: string | null;
    frappeConnectionStatus: string;
  }>("POST", "/auth/login", {
    corporateId: env.DEFAULT_TENANT_CORPORATE_ID,
    desk: "tenant",
    email: env.DEFAULT_TENANT_ADMIN_EMAIL,
    password: env.DEFAULT_TENANT_ADMIN_PASSWORD
  });
  assert.equal(authenticatedAgain.data.frappeAuthenticated, true);
  assert.equal(authenticatedAgain.data.frappeAuthenticatedUser, "integration@frappe.test");
  assert.equal(authenticatedAgain.data.frappeConnectionStatus, "live");
  assert.equal(handshakeCount, handshakeCountBeforeRelogin);
  console.info("Frappe connection E2E passed", {
    connectionName: loaded.data.connectionName,
    encrypted: true,
    reusable: true,
    verificationStatus: loaded.data.verificationStatus
  });
} finally {
  if (tenantDatabase) {
    const database = getTenantDatabaseByName(tenantDatabase);
    if (importedUserId) {
      await database.deleteFrom("user_roles").where("user_id", "=", importedUserId).execute();
      await database.deleteFrom("users").where("id", "=", importedUserId).execute();
    }
    if (pulledCrmEnquiryId) {
      await database
        .deleteFrom("frappe_enquiry_links")
        .where("crm_enquiry_id", "=", pulledCrmEnquiryId)
        .execute();
      await database.deleteFrom("crm_enquiries").where("id", "=", pulledCrmEnquiryId).execute();
    }
    if (lifecycleCrmEnquiryId) {
      await database
        .deleteFrom("frappe_enquiry_links")
        .where("crm_enquiry_id", "=", lifecycleCrmEnquiryId)
        .execute();
      await database.deleteFrom("crm_enquiries").where("id", "=", lifecycleCrmEnquiryId).execute();
    }
    await database
      .updateTable("frappe_sync_settings")
      .set({ pull_enquiries_enabled: false, push_enquiries_enabled: false })
      .where("setting_key", "=", "enquiry")
      .execute();
    await database
      .deleteFrom("frappe_connection_settings")
      .where("connection_key", "=", "default")
      .execute();
    if (original) {
      await database
        .insertInto("frappe_connection_settings")
        .values({
          api_key_ciphertext: original.api_key_ciphertext,
          api_secret_ciphertext: original.api_secret_ciphertext,
          app_key_ciphertext: original.app_key_ciphertext,
          app_secret_ciphertext: original.app_secret_ciphertext,
          base_url: original.base_url,
          connection_key: original.connection_key,
          connection_name: original.connection_name,
          created_at: original.created_at,
          enabled: original.enabled,
          id: original.id,
          last_checked_at: original.last_checked_at,
          last_verified_at: original.last_verified_at,
          updated_at: original.updated_at,
          uuid: original.uuid,
          verification_status: original.verification_status
        })
        .execute();
    }
    if (adminUserId && originalUserCredentials) {
      await database
        .updateTable("users")
        .set(originalUserCredentials)
        .where("id", "=", adminUserId)
        .execute();
    }
  }
  await app.close();
  await new Promise<void>((resolve, reject) =>
    frappeServer.close((error) => (error ? reject(error) : resolve()))
  );
}

async function request<T>(
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
