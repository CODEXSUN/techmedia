import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Selectable } from "kysely";
import { createApp } from "../../app.js";
import type { FrappeConnectionSettingsTable } from "../../database/schema.js";
import { getTenantDatabaseByName } from "../../database/tenant-database.js";
import { env } from "../../env.js";
import { frappeConnectionContract } from "./frappe.service.js";

const apiKey = `frappe-key-${Date.now()}`;
const apiSecret = `frappe-secret-${Date.now()}`;
let receivedAuthorization = "";
let receivedPath = "";
const frappeEnquiryName = `ENQ-E2E-${Date.now()}`;
const frappeServer = createServer((request, response) => {
  receivedAuthorization = request.headers.authorization ?? "";
  receivedPath = request.url ?? "";
  response.setHeader("Content-Type", "application/json");
  if (receivedAuthorization !== `token ${apiKey}:${apiSecret}`) {
    response.statusCode = 401;
    response.end(JSON.stringify({ exc_type: "AuthenticationError" }));
    return;
  }
  if (receivedPath === "/api/method/frappe.auth.get_logged_user") {
    response.end(JSON.stringify({ message: "integration@frappe.test" }));
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
  response.statusCode = 404;
  response.end(JSON.stringify({ exc_type: "DoesNotExistError" }));
});
await new Promise<void>((resolve) => frappeServer.listen(0, "127.0.0.1", resolve));
const address = frappeServer.address() as AddressInfo;
const frappeBaseUrl = `http://127.0.0.1:${address.port}`;
const app = await createApp();
let tenantDatabase = "";
  let original: Selectable<FrappeConnectionSettingsTable> | undefined;
let pulledCrmEnquiryId = 0;

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

  const verified = await request<{
    authenticatedUser: string;
    baseUrl: string;
    checkedAt: string;
    connected: true;
    latencyMs: number;
  }>(
    "POST",
    "/tenant/frappe/settings/verify",
    { apiKey, apiSecret, baseUrl: frappeBaseUrl },
    headers
  );
  assert.equal(verified.data.connected, true);
  assert.equal(verified.data.authenticatedUser, "integration@frappe.test");
  assert.equal(verified.data.baseUrl, frappeBaseUrl);
  assert.ok(verified.data.latencyMs >= 0);
  assert.equal(receivedAuthorization, `token ${apiKey}:${apiSecret}`);
  assert.equal(receivedPath, "/api/method/frappe.auth.get_logged_user");

  const saved = await request<{
    apiKeyConfigured: boolean;
    apiSecretConfigured: boolean;
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
      apiKey,
      apiSecret,
      baseUrl: `${frappeBaseUrl}/`,
      connectionName: "Frappe E2E",
      enabled: true
    },
    headers
  );
  assert.equal(saved.data.baseUrl, frappeBaseUrl);
  assert.equal(saved.data.apiKeyConfigured, true);
  assert.equal(saved.data.apiSecretConfigured, true);
  assert.equal(saved.data.enabled, true);
  assert.equal(saved.data.verificationStatus, "unverified");
  assert.equal(saved.data.lastCheckedAt, null);
  assert.equal(saved.data.lastVerifiedAt, null);
  assert.equal("apiKey" in saved.data, false);
  assert.equal("apiSecret" in saved.data, false);

  const persisted = await database
    .selectFrom("frappe_connection_settings")
    .select(["api_key_ciphertext", "api_secret_ciphertext"])
    .where("connection_key", "=", "default")
    .executeTakeFirstOrThrow();
  assert.doesNotMatch(persisted.api_key_ciphertext, new RegExp(apiKey, "u"));
  assert.doesNotMatch(persisted.api_secret_ciphertext, new RegExp(apiSecret, "u"));

  const reusable = await frappeConnectionContract({ database }).get();
  assert.equal(reusable?.apiKey, apiKey);
  assert.equal(reusable?.apiSecret, apiSecret);
  assert.equal(reusable?.baseUrl, frappeBaseUrl);

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
    payload: { apiKey: "wrong-key", apiSecret: "wrong-secret", baseUrl: frappeBaseUrl },
    url: "/tenant/frappe/settings/verify"
  });
  assert.equal(failedVerification.statusCode, 400);
  assert.doesNotMatch(failedVerification.body, /wrong-key|wrong-secret/u);
  const offlineSettings = await request<typeof saved.data>(
    "GET",
    "/tenant/frappe/settings",
    undefined,
    headers
  );
  assert.equal(offlineSettings.data.verificationStatus, "offline");
  assert.ok(offlineSettings.data.lastCheckedAt);
  assert.equal(offlineSettings.data.lastVerifiedAt, liveSettings.data.lastVerifiedAt);

  await request<typeof verified.data>(
    "POST",
    "/tenant/frappe/settings/verify",
    { baseUrl: frappeBaseUrl },
    headers
  );
  const loaded = await request<typeof saved.data>(
    "GET",
    "/tenant/frappe/settings",
    undefined,
    headers
  );
  assert.equal(loaded.data.verificationStatus, "live");
  console.info("Frappe connection E2E passed", {
    connectionName: loaded.data.connectionName,
    encrypted: true,
    reusable: true,
    verificationStatus: loaded.data.verificationStatus
  });
} finally {
  if (tenantDatabase) {
    const database = getTenantDatabaseByName(tenantDatabase);
    if (pulledCrmEnquiryId) {
      await database
        .deleteFrom("frappe_enquiry_links")
        .where("crm_enquiry_id", "=", pulledCrmEnquiryId)
        .execute();
      await database.deleteFrom("crm_enquiries").where("id", "=", pulledCrmEnquiryId).execute();
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
  }
  await app.close();
  await new Promise<void>((resolve, reject) =>
    frappeServer.close((error) => (error ? reject(error) : resolve()))
  );
}

async function request<T>(
  method: "GET" | "POST" | "PUT",
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
