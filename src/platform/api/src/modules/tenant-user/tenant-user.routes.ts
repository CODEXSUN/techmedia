import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { tenantAccessContext } from "../../auth/tenant-access-context.js";
import { signAuthToken, verifyAuthToken } from "../../auth/jwt.js";
import { requireSuperAdmin, superAdminActorEmail } from "../../auth/super-admin.guard.js";
import { tenantSupportContract } from "../tenant/index.js";
import { createTenantUserAdminService, TenantUserService } from "./tenant-user.service.js";

const path = "/tenant/access/users";
const status = z.enum(["active", "inactive", "suspended"]);
const record = z.object({
  email: z.string(),
  frappeApiKeyConfigured: z.boolean(),
  frappeApiSecretConfigured: z.boolean(),
  frappeAuthenticatedUser: z.string().nullable(),
  frappeEmployeeCode: z.string().nullable(),
  frappeLastCheckedAt: z.iso.datetime().nullable(),
  frappeLastVerifiedAt: z.iso.datetime().nullable(),
  frappeVerificationStatus: z.enum(["live", "offline", "unverified"]),
  id: z.number().int().positive(),
  isProtected: z.boolean(),
  name: z.string(),
  status,
  uuid: z.string().length(8)
});
const payload = z.object({
  email: z.string().email(),
  frappeApiKey: z.string().trim().max(2_000).optional(),
  frappeApiSecret: z.string().trim().max(2_000).optional(),
  frappeEmployeeCode: z.string().trim().max(180).optional(),
  name: z.string().trim().min(2).max(180),
  password: z.string().min(8).max(128).optional(),
  status
});
const profilePayload = z
  .object({
    email: z.string().trim().email(),
    name: z.string().trim().min(2).max(180),
    password: z.string().min(8).max(128).optional()
  })
  .strict();
const profileRecord = record
  .pick({ email: true, id: true, name: true, uuid: true })
  .extend({ avatarPath: z.string() });
const profileResponse = z.object({ accessToken: z.string(), profile: profileRecord });
const params = z.object({ id: z.string().regex(/^\d+$/) });
const query = z.object({ search: z.string().trim().optional() });
const adminQuery = query.extend({ tenantId: z.string().trim().min(1) }).strict();
const adminPayload = payload.extend({ tenantId: z.string().trim().min(1) }).strict();
const adminTarget = z.object({ tenantId: z.string().trim().min(1) }).strict();
export async function registerTenantUserRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/tenant/profile",
    schemas: { response: profileRecord },
    handler: ({ request }) => new TenantUserService(tenantAccessContext(request)).getProfile()
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/tenant/profile",
    schemas: { body: profilePayload, response: profileResponse },
    handler: async ({ body, request }) => {
      const profile = await new TenantUserService(tenantAccessContext(request)).updateProfile(body);
      const claims = tenantClaims(request.headers.authorization);
      return {
        profile,
        accessToken: signAuthToken({
          email: profile.email,
          name: profile.name,
          userId: profile.uuid,
          userType: "tenant",
          ...(claims.tenantCode ? { tenantCode: claims.tenantCode } : {}),
          ...(claims.tenantDbName ? { tenantDbName: claims.tenantDbName } : {}),
          ...(claims.tenantId ? { tenantId: claims.tenantId } : {}),
          ...(claims.tenantUuid ? { tenantUuid: claims.tenantUuid } : {}),
          ...(claims.tenantRole ? { tenantRole: claims.tenantRole } : {}),
          ...(claims.permissions ? { permissions: claims.permissions } : {}),
          ...(claims.frappeEmployeeCode ? { frappeEmployeeCode: claims.frappeEmployeeCode } : {}),
          ...(claims.frappeUser ? { frappeUser: claims.frappeUser } : {})
        })
      };
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { querystring: query, response: z.array(record) },
    handler: ({ query, request }) =>
      new TenantUserService(tenantAccessContext(request)).list(
        query.search ? { search: query.search } : {}
      )
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/:id`,
    schemas: { params, response: record },
    handler: async ({ params, request }) => {
      const value = await new TenantUserService(tenantAccessContext(request)).get(params.id);
      if (!value) throw AppError.notFound("User was not found.");
      return value;
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: path,
    schemas: { body: payload, response: record },
    handler: ({ body, request }) => new TenantUserService(tenantAccessContext(request)).create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:id`,
    schemas: { body: payload, params, response: record },
    handler: ({ body, params, request }) =>
      new TenantUserService(tenantAccessContext(request)).update(params.id, body)
  });
  action(app, "activate", "active");
  action(app, "deactivate", "inactive");
  action(app, "suspend", "suspended");
  registerContractRoute(app, {
    method: "DELETE",
    url: `${path}/:id/force`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new TenantUserService(tenantAccessContext(request)).forceDelete(params.id)
  });
  registerContractRoute(app, {
    method: "GET",
    preHandler: requireSuperAdmin,
    url: "/admin/tenant-users",
    schemas: { querystring: adminQuery, response: z.array(record) },
    handler: async ({ query, request }) =>
      (await adminService(request, query.tenantId)).list(
        query.search ? { search: query.search } : {}
      )
  });
  registerContractRoute(app, {
    method: "POST",
    preHandler: requireSuperAdmin,
    url: "/admin/tenant-users",
    schemas: { body: adminPayload, response: record },
    handler: async ({ body, request }) => {
      const { tenantId, ...value } = body;
      return (await adminService(request, tenantId)).create(value);
    }
  });
  registerContractRoute(app, {
    method: "PUT",
    preHandler: requireSuperAdmin,
    url: "/admin/tenant-users/:id",
    schemas: { body: adminPayload, params, response: record },
    handler: async ({ body, params, request }) => {
      const { tenantId, ...value } = body;
      return (await adminService(request, tenantId)).update(params.id, value);
    }
  });
  adminAction(app, "activate", "active");
  adminAction(app, "deactivate", "inactive");
  adminAction(app, "suspend", "suspended");
  registerContractRoute(app, {
    method: "DELETE",
    preHandler: requireSuperAdmin,
    url: "/admin/tenant-users/:id/force",
    schemas: { params, querystring: adminTarget, response: record },
    handler: async ({ params, query, request }) =>
      (await adminService(request, query.tenantId)).forceDelete(params.id)
  });
}
function tenantClaims(authorization: string | undefined) {
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const claims = token ? verifyAuthToken(token) : null;
  if (!claims || claims.userType !== "tenant") throw AppError.unauthorized("Session expired.");
  return claims;
}
function action(app: FastifyInstance, name: string, value: z.infer<typeof status>) {
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/${name}`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new TenantUserService(tenantAccessContext(request)).setStatus(params.id, value)
  });
}

function adminAction(app: FastifyInstance, name: string, value: z.infer<typeof status>) {
  registerContractRoute(app, {
    method: "POST",
    preHandler: requireSuperAdmin,
    url: `/admin/tenant-users/:id/${name}`,
    schemas: { body: adminTarget, params, response: record },
    handler: async ({ body, params, request }) =>
      (await adminService(request, body.tenantId)).setStatus(params.id, value)
  });
}

async function adminService(request: Parameters<typeof superAdminActorEmail>[0], tenantId: string) {
  const target = await tenantSupportContract.resolve(tenantId);
  if (!target) throw AppError.notFound("Tenant was not found.");
  return createTenantUserAdminService(target, superAdminActorEmail(request));
}
