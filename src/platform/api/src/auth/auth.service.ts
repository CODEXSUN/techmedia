import { env } from "../env.js";
import { TenantRepository } from "../modules/tenant/tenant.repository.js";
import type { Tenant } from "../modules/tenant/tenant.types.js";
import { signAuthToken, type AuthUserType } from "./jwt.js";
import { verifyPassword } from "./password-hash.js";

const tenantRepository = new TenantRepository();

export class AuthService {
  async login(input: LoginInput) {
    const desk = normalizeDesk(input.desk);
    const email = input.email?.trim().toLowerCase() ?? "";
    const password = input.password ?? "";
    if (!email || !password) return null;

    if (desk === "tenant") {
      return this.loginTenant({ ...input, email, password });
    }

    return this.loginPlatformUser({ desk, email, password });
  }

  private async loginTenant(input: Required<Pick<LoginInput, "email" | "password">> & LoginInput) {
    const domainTenant = await tenantRepository.findByDomain(input.domain ?? "");
    const corporateId = input.corporateId?.trim() ?? "";
    const tenant =
      domainTenant ?? (corporateId ? await tenantRepository.findByCorporateId(corporateId) : null);
    if (
      !tenant ||
      tenant.status !== "active" ||
      !corporateMatchesTenant(tenant, corporateId, Boolean(domainTenant))
    ) {
      return null;
    }

    const user = await tenantRepository.findTenantUserByEmail(tenant, input.email);
    if (!user || user.status !== "active" || !verifyPassword(input.password, user.password_hash)) {
      return null;
    }

    return {
      accessToken: signAuthToken({
        email: user.email,
        name: user.name,
        tenantCode: tenant.tenantCode,
        tenantDbName: tenant.dbName,
        tenantId: tenant.uuid,
        tenantUuid: tenant.uuid,
        userId: user.uuid,
        userType: "tenant"
      }),
      email: user.email,
      name: user.name,
      tenantCode: tenant.tenantCode,
      tenantDbName: tenant.dbName,
      tenantId: tenant.uuid,
      tenantUuid: tenant.uuid,
      userType: "tenant" as const
    };
  }

  private loginPlatformUser(input: {
    desk: "staff" | "super_admin";
    email: string;
    password: string;
  }) {
    const seed = input.desk === "super_admin" ? platformSeed("super_admin") : platformSeed("staff");
    if (!seed || input.email !== seed.email || input.password !== seed.password) {
      return null;
    }

    return {
      accessToken: signAuthToken({
        email: seed.email,
        userId: seed.email,
        userType: input.desk
      }),
      email: seed.email,
      userType: input.desk
    };
  }
}

type LoginInput = {
  corporateId?: string;
  desk?: unknown;
  domain?: string;
  email?: string;
  password?: string;
};

function normalizeDesk(value: unknown): AuthUserType {
  if (value === "sa" || value === "super_admin") return "super_admin";
  if (value === "admin" || value === "staff") return "staff";
  return "tenant";
}

function corporateMatchesTenant(tenant: Tenant, corporateId: string, resolvedByDomain: boolean) {
  if (!corporateId) return false;
  const normalized = corporateId.trim().toLowerCase();
  const candidates = [tenant.corporateId, tenant.tenantCode, tenant.slug]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return (
    candidates.includes(normalized) ||
    (resolvedByDomain && candidates.length > 0 && candidates.includes(normalized))
  );
}

function platformSeed(userType: "staff" | "super_admin") {
  if (userType === "super_admin") {
    const email = env.SUPER_ADMIN_EMAIL.trim().toLowerCase();
    const password = env.SUPER_ADMIN_PASSWORD.trim();
    return email && password ? { email, password } : null;
  }

  const email = env.SOFTWARE_ADMIN_EMAIL.trim().toLowerCase();
  const password = env.SOFTWARE_ADMIN_PASSWORD.trim();
  return email && password ? { email, password } : null;
}
