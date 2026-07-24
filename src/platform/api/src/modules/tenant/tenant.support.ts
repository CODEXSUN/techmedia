import type { Kysely } from "kysely";
import { getTenantDatabase } from "../../database/tenant-database.js";
import type { TenantDatabase } from "../../database/schema.js";
import { TenantRepository } from "./tenant.repository.js";

export type TenantSupportTarget = {
  database: Kysely<TenantDatabase>;
  tenantId: string;
  tenantName: string;
};

export const tenantSupportContract = {
  async resolve(value: string): Promise<TenantSupportTarget | null> {
    const tenant = await new TenantRepository().findByIdOrCode(value);
    if (!tenant) return null;
    return {
      database: getTenantDatabase(tenant),
      tenantId: String(tenant.id),
      tenantName: tenant.tenantName
    };
  }
} as const;
