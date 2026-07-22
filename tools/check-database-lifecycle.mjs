#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const workspace = resolve(root, "..");

assertOrdered("../core/api/src/modules/common/location/location.migration.ts", [
  "{ ...countryMigration",
  "{ ...stateMigration",
  "{ ...districtMigration",
  "{ ...cityMigration",
  "{ ...pincodeMigration"
]);
assertOrdered("../core/api/src/modules/common/location/location.seed.ts", [
  "seedCountryModule();",
  "seedStateModule();",
  "seedDistrictModule();",
  "seedCityModule();",
  "seedPincodeModule();"
]);
assertOrdered("../core/api/src/modules/organisation/organisation.migration.ts", [
  "{ ...companyMigration",
  "{ ...financialYearMigration",
  "{ ...defaultCompanyMigration"
]);
assertOrdered("../core/api/src/modules/organisation/organisation.seed.ts", [
  "seedCompanyModule();",
  "seedFinancialYearModule();",
  "seedDefaultCompanyModule();"
]);
assertOrdered("../core/api/src/modules/master/master.migration.ts", [
  "{ ...contactMigration",
  "{ ...productMigration",
  "{ ...workOrderMigration"
]);
assertOrdered("../core/api/src/modules/master/master.seed.ts", [
  "seedContactModule();",
  "seedProductModule();",
  "seedWorkOrderModule();"
]);
assertOrdered("../core/api/src/database/core-database.ts", [
  "seedCommonModule();",
  "seedOrganisationModule();",
  "seedMasterModule();",
  "seedCoreTenantPermissions("
]);
assertOrdered("apps/platform/api/src/modules/tenant/tenant.seed.ts", [
  "seedTenantRoleModule(",
  "seedTenantPermissionModule(",
  "seedTenantUserModule(",
  "seedTenantUserRoleModule(",
  "seedTenantRolePermissionModule("
]);
assertOrdered("apps/platform/api/src/database/tenant-app-database.ts", [
  "migrateCoreTenantDatabase("
]);
assertOrdered("apps/platform/api/src/database/tenant-app-database.ts", ["seedCoreTenantDatabase("]);

const privateLifecycleImports = [];
for (const repository of ["core", "framework", "ui"]) {
  for (const file of sourceFiles(join(workspace, repository))) {
    const content = readFileSync(file, "utf8");
    if (
      /(?:from|import\()\s*["'][^"']*@codexsun\/core[^"']*(?:migration|seed|repository|service)[^"']*["']/u.test(
        content
      ) ||
      /(?:from|import\()\s*["']\.\.[^"']*core[^"']*(?:migration|seed|repository|service)[^"']*["']/u.test(
        content
      )
    ) {
      privateLifecycleImports.push(relative(workspace, file));
    }
  }
}

if (privateLifecycleImports.length) {
  throw new Error(
    `Private cross-repository lifecycle imports found:\n${privateLifecycleImports.map((file) => `- ${file}`).join("\n")}`
  );
}

console.log(
  "Database lifecycle verified: module-owned migrations/seeds, dependency order, and repository boundaries."
);

function assertOrdered(file, tokens) {
  const absolute = resolve(root, file);
  const content = readFileSync(absolute, "utf8");
  let previous = -1;
  for (const token of tokens) {
    const index = content.indexOf(token, previous + 1);
    if (index < 0) throw new Error(`${file}: missing lifecycle token ${token}`);
    if (index <= previous) throw new Error(`${file}: lifecycle token out of order: ${token}`);
    previous = index;
  }
}

function sourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".idea", "assist", "dist", "node_modules"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if ([".js", ".mjs", ".ts", ".tsx"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}
