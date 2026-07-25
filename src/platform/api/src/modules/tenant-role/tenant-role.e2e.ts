import assert from "node:assert/strict";
import { sql } from "kysely";
import { createApp } from "../../app.js";
import { getTenantDatabaseByName } from "../../database/tenant-database.js";
import { env } from "../../env.js";

type Login = {
  accessToken: string;
  permissions: string[];
  tenantDbName: string;
  tenantId: string;
  tenantRole: string;
};

const app = await createApp();
const fixtureEmail = `administrator-role-${Date.now()}@example.test`;
const fixturePassword = "TechMedia!234";
let superAdminHeaders: Record<string, string> | undefined;
let tenantDatabaseName = "";

try {
  const superAdmin = await login(env.DEFAULT_TENANT_ADMIN_EMAIL, env.DEFAULT_TENANT_ADMIN_PASSWORD);
  superAdminHeaders = tenantHeaders(superAdmin);
  tenantDatabaseName = superAdmin.tenantDbName;
  await cleanupFixtureUsers(tenantDatabaseName);
  const superAdminCount = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) count FROM users WHERE role='super-admin' AND is_protected=TRUE`.execute(
    getTenantDatabaseByName(tenantDatabaseName)
  );
  assert.equal(Number(superAdminCount.rows[0]?.count ?? 0), 1);

  assert.equal(superAdmin.tenantRole, "user", "The internal role must not leak through login.");
  assert.ok(superAdmin.permissions.includes("platform.application.user.view"));
  assert.ok(superAdmin.permissions.includes("core.application.records.view"));
  assert.ok(superAdmin.permissions.includes("crm.enquiry.force-delete"));
  const superAdminCoreResponse = await rawRequest(
    "GET",
    "/core/organisation/companies",
    undefined,
    superAdminHeaders
  );
  assert.equal(superAdminCoreResponse.statusCode, 200);

  const roles = await request<Array<{ id: number; key: string; label: string }>>(
    "GET",
    "/tenant/access/roles",
    undefined,
    superAdminHeaders
  );
  assert.equal(
    roles.some((role) => role.key === "super-admin"),
    false
  );
  const administratorRole = roles.find((role) => role.key === "admin");
  assert.ok(administratorRole, "Administrator role must be seeded.");
  assert.equal(administratorRole.label, "Administrator");

  const users = await request<Array<{ id: number; isProtected: boolean }>>(
    "GET",
    "/tenant/access/users",
    undefined,
    superAdminHeaders
  );
  const protectedUser = users.find((user) => user.isProtected);
  assert.ok(protectedUser, "The initial protected account must exist.");
  const visibleAssignments = await request<Array<{ roleKey: string; userId: number }>>(
    "GET",
    "/tenant/access/user-roles",
    undefined,
    superAdminHeaders
  );
  assert.equal(
    visibleAssignments.some(
      (assignment) => assignment.roleKey === "super-admin" || assignment.userId === protectedUser.id
    ),
    false
  );

  const protectedAssignment = await rawRequest(
    "POST",
    "/tenant/access/user-roles",
    { roleId: administratorRole.id, status: "active", userId: protectedUser.id },
    superAdminHeaders
  );
  assert.equal(protectedAssignment.statusCode, 400);

  const reservedRole = await rawRequest(
    "POST",
    "/tenant/access/roles",
    {
      description: "Must remain internal.",
      key: "super-admin",
      label: "Super Admin",
      status: "active"
    },
    superAdminHeaders
  );
  assert.equal(reservedRole.statusCode, 403);

  const fixtureUser = await request<{ id: number }>(
    "POST",
    "/tenant/access/users",
    {
      email: fixtureEmail,
      name: "Administrator Role E2E",
      password: fixturePassword,
      status: "active"
    },
    superAdminHeaders
  );
  await request(
    "POST",
    "/tenant/access/user-roles",
    { roleId: administratorRole.id, status: "active", userId: fixtureUser.id },
    superAdminHeaders
  );

  const administrator = await login(fixtureEmail, fixturePassword);
  assert.equal(administrator.tenantRole, "user");
  assert.ok(administrator.permissions.includes("platform.application.user.view"));
  assert.ok(administrator.permissions.includes("crm.enquiry.force-delete"));
  const administratorUsers = await rawRequest(
    "GET",
    "/tenant/access/users",
    undefined,
    tenantHeaders(administrator)
  );
  assert.equal(administratorUsers.statusCode, 200);

  console.info("Tenant role E2E passed", {
    administratorApplicationStatus: administratorUsers.statusCode,
    coreApplicationStatus: superAdminCoreResponse.statusCode,
    protectedAssignmentStatus: protectedAssignment.statusCode,
    reservedRoleStatus: reservedRole.statusCode,
    visibleRoles: roles.map((role) => role.key)
  });
} finally {
  if (tenantDatabaseName) await cleanupFixtureUsers(tenantDatabaseName);
  await app.close();
}

async function cleanupFixtureUsers(databaseName: string) {
  const database = getTenantDatabaseByName(databaseName);
  const pattern = "administrator-role-%@example.test";
  await sql`DELETE ur FROM user_roles ur INNER JOIN users u ON u.id=ur.user_id WHERE u.email LIKE ${pattern}`.execute(
    database
  );
  await sql`DELETE FROM users WHERE email LIKE ${pattern}`.execute(database);
}

async function login(email: string, password: string) {
  return request<Login>("POST", "/auth/login", {
    corporateId: env.DEFAULT_TENANT_CORPORATE_ID,
    desk: "tenant",
    email,
    password
  });
}

function tenantHeaders(loginRecord: Login) {
  return {
    authorization: `Bearer ${loginRecord.accessToken}`,
    "x-tenant-db": loginRecord.tenantDbName,
    "x-tenant-id": loginRecord.tenantId
  };
}

async function request<T>(
  method: "DELETE" | "GET" | "POST" | "PUT",
  url: string,
  payload?: unknown,
  headers?: Record<string, string>
) {
  const response = await rawRequest(method, url, payload, headers);
  const envelope = response.json() as { data?: T; error?: { message?: string } };
  assert.equal(response.statusCode, 200, envelope.error?.message ?? `${method} ${url} failed.`);
  assert.ok(envelope.data !== undefined, `${method} ${url} returned no data.`);
  return envelope.data;
}

async function rawRequest(
  method: "DELETE" | "GET" | "POST" | "PUT",
  url: string,
  payload?: unknown,
  headers?: Record<string, string>
) {
  if (payload === undefined) {
    return app.inject({ headers: headers ?? {}, method, url });
  }
  return app.inject({
    headers: headers ?? {},
    method,
    payload: payload as object | string,
    url
  });
}
