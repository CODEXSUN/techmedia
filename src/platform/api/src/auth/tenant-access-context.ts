import type { FastifyRequest } from "fastify";
import { requireTenantAccess } from "@codexsun/framework/api";
import { AppError } from "@codexsun/framework/errors";
import { getTenantDatabaseByName } from "../database/tenant-database.js";
import { env } from "../env.js";
import { verifyAuthToken } from "./jwt.js";
import { TENANT_SUPER_ADMIN_ROLE_KEY } from "../modules/tenant-role/index.js";

export function tenantAccessContext(request: FastifyRequest) {
  const header = request.headers["x-tenant-db"];
  const tenantDatabase = (Array.isArray(header) ? header[0] : header)?.trim();
  if (!tenantDatabase) throw AppError.validation("x-tenant-db is required.");
  const claims = requireTenantAccess({
    authorization: request.headers.authorization,
    secret: env.JWT_SECRET,
    tenantDatabase,
    tenantId: request.headers["x-tenant-id"]
  });
  const database = getTenantDatabaseByName(tenantDatabase);
  const token = request.headers.authorization?.startsWith("Bearer ")
    ? request.headers.authorization.slice("Bearer ".length).trim()
    : "";
  const localClaims = token ? verifyAuthToken(token) : null;
  const actorUser = () =>
    database
      .selectFrom("users")
      .select(["id", "uuid", "email", "name", "role", "status"])
      .where("email", "=", claims.email ?? "")
      .where("status", "=", "active")
      .executeTakeFirst();
  const can = async (permission: string) => {
    const user = await actorUser();
    if (!user) return false;
    if (user.role === TENANT_SUPER_ADMIN_ROLE_KEY) return true;
    const allowed = await database
      .selectFrom("user_roles as userRole")
      .innerJoin("roles as role", "role.id", "userRole.role_id")
      .innerJoin("role_permissions as rolePermission", "rolePermission.role_id", "role.id")
      .innerJoin("permissions as permission", "permission.id", "rolePermission.permission_id")
      .select("permission.id")
      .where("userRole.user_id", "=", user.id)
      .where("userRole.status", "=", "active")
      .where("role.status", "=", "active")
      .where("rolePermission.status", "=", "active")
      .where("permission.status", "=", "active")
      .where("permission.key", "=", permission)
      .executeTakeFirst();
    return Boolean(allowed);
  };
  return {
    actorEmail: claims.email ?? "tenant@techmedia.app",
    frappeEmployeeCode: localClaims?.frappeEmployeeCode ?? null,
    frappeUser: localClaims?.frappeUser ?? null,
    actorUser,
    can,
    authorize: async (permission: string) => {
      if (!(await can(permission)))
        throw AppError.forbidden(`Permission ${permission} is required.`);
    },
    database,
    tenantDatabase,
    tenantId: claims.tenantId ?? ""
  };
}
