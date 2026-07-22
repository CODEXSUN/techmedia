import {
  coreTenantMigrations,
  migrateCoreTenantDatabase,
  seedCoreTenantDatabase
} from "@codexsun/core-api";
import type { Kysely } from "kysely";
import type { TenantDatabase } from "./schema.js";
import type { Tenant } from "../modules/tenant/tenant.types.js";
import { tenantRuntimeMigrations } from "../modules/tenant/tenant.migration.js";

export function tenantDatabaseMigrationsFor(_tenant: Tenant) {
  return [
    ...tenantRuntimeMigrations.map(({ description, name, statements }) => ({
      description,
      name,
      statements
    })),
    ...coreTenantMigrations.map((migration) => ({
      ...migration,
      statements: [`RUN ${migration.name}`]
    }))
  ];
}

export async function migrateSelectedTenantApps(_database: Kysely<TenantDatabase>, tenant: Tenant) {
  const provisionedApps = ["application"];

  await migrateCoreTenantDatabase(tenant.dbName);
  provisionedApps.push("core");

  return {
    migrationOrder: tenantDatabaseMigrationsFor(tenant).map((migration) => migration.name),
    provisionedApps
  };
}

export async function seedSelectedTenantApps(_database: Kysely<TenantDatabase>, tenant: Tenant) {
  const seededApps = ["application"];

  await seedCoreTenantDatabase(tenant.dbName);
  seededApps.push("core");

  return { seededApps };
}

export async function provisionSelectedTenantApps(
  database: Kysely<TenantDatabase>,
  tenant: Tenant
) {
  const migrated = await migrateSelectedTenantApps(database, tenant);
  const seeded = await seedSelectedTenantApps(database, tenant);
  return { ...migrated, ...seeded };
}
