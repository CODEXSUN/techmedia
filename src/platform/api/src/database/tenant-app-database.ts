import {
  coreTenantMigrations,
  migrateCoreTenantDatabase,
  seedCoreTenantDatabase
} from "@codexsun/core-api";
import type { Kysely } from "kysely";
import type { TenantDatabase } from "./schema.js";
import type { Tenant } from "../modules/tenant/tenant.types.js";
import { tenantRuntimeMigrations } from "../modules/tenant/tenant.migration.js";
import { crmMigrations, migrateCrmModule, seedCrmModule } from "../modules/crm/index.js";
import {
  frappeMigrations,
  migrateFrappeModule,
  seedFrappeModule
} from "../modules/frappe/index.js";

export function tenantDatabaseMigrationsFor(tenant: Tenant) {
  return [
    ...tenantRuntimeMigrations.map(({ description, name, statements }) => ({
      description,
      name,
      statements
    })),
    ...coreTenantMigrations.map((migration) => ({
      ...migration,
      statements: [`RUN ${migration.name}`]
    })),
    ...(tenant.enabledModuleKeys.includes("crm")
      ? crmMigrations.map((migration) => ({
            description: "CRM enquiry aggregate.",
            name: migration.key,
            statements: ["RUN crm.enquiry migration"]
          }))
      : []),
    ...(tenant.enabledModuleKeys.includes("frappe")
      ? frappeMigrations.map((migration) => ({
          description: "Frappe connection settings.",
          name: migration.key,
          statements: ["RUN frappe.connection migration"]
        }))
      : [])
  ];
}

export async function migrateSelectedTenantApps(_database: Kysely<TenantDatabase>, tenant: Tenant) {
  const provisionedApps = ["application"];

  await migrateCoreTenantDatabase(tenant.dbName);
  provisionedApps.push("core");
  if (tenant.enabledModuleKeys.includes("crm")) {
    await migrateCrmModule(_database);
    provisionedApps.push("crm");
  }
  if (tenant.enabledModuleKeys.includes("frappe")) {
    await migrateFrappeModule(_database);
    provisionedApps.push("frappe");
  }

  return {
    migrationOrder: tenantDatabaseMigrationsFor(tenant).map((migration) => migration.name),
    provisionedApps
  };
}

export async function seedSelectedTenantApps(_database: Kysely<TenantDatabase>, tenant: Tenant) {
  const seededApps = ["application"];

  await seedCoreTenantDatabase(tenant.dbName);
  seededApps.push("core");
  if (tenant.enabledModuleKeys.includes("crm")) {
    await seedCrmModule(_database);
    seededApps.push("crm");
  }
  if (tenant.enabledModuleKeys.includes("frappe")) {
    await seedFrappeModule(_database);
    seededApps.push("frappe");
  }

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
