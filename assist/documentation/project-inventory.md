# TechMedia Multi-Repository Inventory

## Purpose

This is the authoritative current workspace map for the TechMedia application. Historical
Copied source-project notes do not override this inventory.

Last reviewed: 2026-07-23.

## Executable Application

| Repository  | Package     | Runtime role                                           |
| ----------- | ----------- | ------------------------------------------------------ |
| `techmedia` | `techmedia` | Runs the Platform API on 7050 and Platform Web on 7060 |

TechMedia is the only executable composition root for this application.

The tenant application surface contains three registered apps:

- `Application` is the administration desk and is visible only to the protected tenant admin
  identity. Tenant staff, manager, and normal-user identities cannot expose it through role
  permission assignment.
- `CRM` is the permission-aware business app. Its module-owned Enquiry aggregate lives under
  `src/platform/api/src/modules/crm/` and `src/platform/web/src/modules/crm/`.
- `Frappe` is the admin-only integration app. Its encrypted tenant connection settings live under
  `src/platform/api/src/modules/frappe/` and `src/platform/web/src/modules/frappe/`. The owner also
  provides the fixed `POST /tenant/frappe/settings/verify` handshake, which validates current or
  stored credentials against Frappe without persisting verification-only form values. Saved
  connections retain module-owned `unverified`, `live`, or `offline` verification state and
  last-check timestamps for the desk status badges.

The public web surface is a simple TechMedia company site owned by
`src/platform/web/src/public/tenant-site/`. Its product position is computer hardware wholesale
and retail, practical technology support, and LogicX business software. Multi-tenant, multi-store,
and franchise-style network capabilities are described only as staged product direction until
their module-owned implementations exist.

Container host ports are intentionally distinct from native development: API `18050`, Web
`18060`. It uses the single shared CODEXSUN MariaDB, Redis, and media containers on
`codexsun-network`. Production routing maps `app.techmedia.in` to the
Techmedia Web container.

## Installed Shared Repositories

| Repository                                                                                  | Package               | Ownership                                                |
| ------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------- |
| `framework`                                                                                 | `@codexsun/framework` | Backend infrastructure and stable contracts              |
| `ui`                                                                                        | `@codexsun/ui`        | Presentation primitives and workspace controls           |
| `core`                                                                                      | `@codexsun/core`      | Tenant common, organisation, and master business modules |
| Billing, Mail, Ecommerce, and Sites sibling repositories are intentionally not installed or |
| composed into TechMedia.                                                                    |

The original `codexsun` executable and standalone `devkit` application are sibling products;
they are not TechMedia runtime dependencies.

## Physical Structure

```text
<workspace>/
  techmedia/
    src/platform/api/
    src/platform/web/
    assist/
    tools/
  framework/
  ui/
  core/
```

Each directory is an independent Git repository with its own root `package.json`,
`package-lock.json`, `node_modules`, version, changelog, and release operation. Nested workspace
dependency trees and nested build output remain prohibited.

## Composition Direction

```text
framework -> core API -> TechMedia Platform API
ui --------> core web -> TechMedia Platform Web
```

TechMedia imports sibling repositories only through their declared package exports. Private
source imports and cross-repository table writes are prohibited.

## Database Ownership And Order

1. TechMedia Platform owns master and tenant-runtime tables under
   `src/platform/api/src/modules/`.
2. Core owns tenant common, organisation, and master tables under `core/api/src/modules/`.
3. TechMedia CRM owns tenant enquiry and enquiry-schedule tables under
   `src/platform/api/src/modules/crm/`.
4. TechMedia Frappe owns encrypted tenant connection settings under
   `src/platform/api/src/modules/frappe/`.
5. No sibling application participates in TechMedia database lifecycle.

Tenant lifecycle order:

1. Platform master migrations and seeds.
2. Tenant runtime migrations.
3. Core migrations.
4. CRM migration when the CRM app is enabled.
5. Frappe connection migration when the Frappe app is enabled.
6. Tenant runtime seeds.
7. Core seeds.
8. CRM seed when the CRM app is enabled.
9. Frappe permission seed when the Frappe app is enabled.

Composition roots order exported lifecycle functions only. SQL, seed records, relationship
resolution, protected records, and lifecycle policy remain in their owning leaves.

## Environment Ownership

Only TechMedia owns the Platform `.env` and `.env.example`. TechMedia-specific operational
variables use the `TECHMEDIA_` prefix. Shared packages receive their required context through
public composition contracts and do not own competing runtime environment files.

## Verification

TechMedia uses its root scripts for formatting, lint, TypeScript, module-boundary checks,
database-lifecycle checks, builds, product-stack tests, E2E tests, dependency-layout checks,
versions, and releases. No check may be reported as passed unless it ran successfully.
