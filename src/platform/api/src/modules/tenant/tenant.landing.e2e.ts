import assert from "node:assert/strict";
import type { DefaultCompanyRecord } from "@codexsun/core-api";
import { createApp } from "../../app.js";
import { env } from "../../env.js";
import { TenantRepository } from "./tenant.repository.js";
import type { Tenant, TenantSavePayload } from "./tenant.types.js";

const app = await createApp();
let headers: Record<string, string> | null = null;
let originalDefaultCompany: DefaultCompanyRecord | null = null;

try {
  const login = await request<{
    accessToken: string;
    tenantDbName: string;
    tenantId: string;
  }>("POST", "/auth/login", {
    corporateId: env.DEFAULT_TENANT_CORPORATE_ID,
    desk: "tenant",
    email: env.DEFAULT_TENANT_ADMIN_EMAIL,
    password: env.DEFAULT_TENANT_ADMIN_PASSWORD
  });
  headers = tenantHeaders(login.data);

  const runtime = await request<{ defaultLandingApp: string; tenant: Tenant | null }>(
    "GET",
    "/tenant/runtime",
    undefined,
    headers
  );
  assert.equal(runtime.data.defaultLandingApp, "crm");
  assert.ok(runtime.data.tenant);

  const defaultCompany = await request<DefaultCompanyRecord | null>(
    "GET",
    "/core/organisation/default-company",
    undefined,
    headers
  );
  assert.ok(defaultCompany.data, "Default Company must be seeded.");
  originalDefaultCompany = defaultCompany.data;
  assert.equal(defaultCompany.data.landingApp, "crm");

  const applicationLanding = await request<{ defaultLandingApp: string }>(
    "PUT",
    "/tenant/runtime/landing-app",
    { landingApp: "application" },
    headers
  );
  assert.equal(applicationLanding.data.defaultLandingApp, "application");

  const mirroredApplication = await request<DefaultCompanyRecord>(
    "GET",
    "/core/organisation/default-company",
    undefined,
    headers
  );
  assert.equal(mirroredApplication.data.landingApp, "application");
  const applicationTenant = await new TenantRepository().findByIdOrCode(login.data.tenantId);
  assert.equal(applicationTenant?.defaultLandingApp, "application");
  assert.equal(
    (applicationTenant?.payloadSettings.landing as { app?: string } | undefined)?.app,
    "application"
  );

  const crmDefaultCompany = await request<DefaultCompanyRecord>(
    "PUT",
    "/tenant/runtime/default-company",
    {
      companyId: originalDefaultCompany.companyId,
      financialYearId: originalDefaultCompany.financialYearId,
      landingApp: "crm",
      status: originalDefaultCompany.status
    },
    headers
  );
  assert.equal(crmDefaultCompany.data.landingApp, "crm");

  const mirroredRuntime = await request<{ defaultLandingApp: string }>(
    "GET",
    "/tenant/runtime",
    undefined,
    headers
  );
  assert.equal(mirroredRuntime.data.defaultLandingApp, "crm");
  const crmTenant = await new TenantRepository().findByIdOrCode(login.data.tenantId);
  assert.equal(crmTenant?.defaultLandingApp, "crm");

  const applicationAdminTenant = await request<Tenant>(
    "PUT",
    `/admin/tenants/${runtime.data.tenant.id}`,
    tenantPayload(runtime.data.tenant, "application")
  );
  assert.equal(applicationAdminTenant.data.defaultLandingApp, "application");

  const adminMirroredDefaultCompany = await request<DefaultCompanyRecord>(
    "GET",
    "/core/organisation/default-company",
    undefined,
    headers
  );
  assert.equal(adminMirroredDefaultCompany.data.landingApp, "application");
  const adminMirroredRuntime = await request<{ defaultLandingApp: string }>(
    "GET",
    "/tenant/runtime",
    undefined,
    headers
  );
  assert.equal(adminMirroredRuntime.data.defaultLandingApp, "application");

  await request(
    "PUT",
    "/tenant/runtime/default-company",
    {
      companyId: originalDefaultCompany.companyId,
      financialYearId: originalDefaultCompany.financialYearId,
      landingApp: "crm",
      status: originalDefaultCompany.status
    },
    headers
  );

  console.info("Tenant landing synchronization E2E passed", {
    defaultLandingApp: "crm",
    synchronizedAreas: [
      "landing-desk",
      "default-company",
      "super-admin-app-connections",
      "tenant-runtime"
    ]
  });
} finally {
  if (headers && originalDefaultCompany) {
    await request(
      "PUT",
      "/tenant/runtime/default-company",
      {
        companyId: originalDefaultCompany.companyId,
        financialYearId: originalDefaultCompany.financialYearId,
        landingApp: originalDefaultCompany.landingApp,
        status: originalDefaultCompany.status
      },
      headers
    );
  }
  await app.close();
}

async function request<T = unknown>(
  method: "GET" | "POST" | "PUT",
  url: string,
  payload?: unknown,
  requestHeaders: Record<string, string> = {}
) {
  const response = await app.inject({
    headers: requestHeaders,
    method,
    ...(payload ? { payload } : {}),
    url
  });
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

function tenantPayload(
  tenant: Tenant,
  defaultLandingApp: Tenant["defaultLandingApp"]
): TenantSavePayload {
  const landing = isRecord(tenant.payloadSettings.landing) ? tenant.payloadSettings.landing : {};
  return {
    corporateId: tenant.corporateId,
    dbHost: tenant.dbHost,
    dbName: tenant.dbName,
    dbPort: tenant.dbPort,
    dbSecretRef: tenant.dbSecretRef,
    dbType: tenant.dbType,
    dbUser: tenant.dbUser,
    defaultLandingApp,
    enabledModuleKeys: tenant.enabledModuleKeys,
    mobile: tenant.mobile,
    payloadSettings: {
      ...tenant.payloadSettings,
      landing: { ...landing, app: defaultLandingApp, mode: "tenant" }
    },
    primaryDomain: tenant.primaryDomain,
    slug: tenant.slug,
    status: tenant.status,
    tenantCode: tenant.tenantCode,
    tenantName: tenant.tenantName
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
