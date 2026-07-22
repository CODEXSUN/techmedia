# TechMedia Multi-Repository Inventory

## Purpose

This is the authoritative current workspace map for the TechMedia application. Historical
Copied source-project notes do not override this inventory.

Last reviewed: 2026-07-22.

## Executable Application

| Repository  | Package     | Runtime role                                           |
| ----------- | ----------- | ------------------------------------------------------ |
| `techmedia` | `techmedia` | Runs the Platform API on 7050 and Platform Web on 7060 |

TechMedia is the only executable composition root for this application.

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
3. No other sibling application participates in TechMedia database lifecycle.

Tenant lifecycle order:

1. Platform master migrations and seeds.
2. Tenant runtime migrations.
3. Core migrations.
4. Tenant runtime seeds.
5. Core seeds.

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
