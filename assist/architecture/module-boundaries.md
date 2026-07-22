# Module And Repository Boundaries

## Repository Boundary

TECHMEDIA uses nine sibling Git repositories. The current physical map is maintained in
`assist/documentation/project-inventory.md`.

- `techmedia`: executable Platform and composition root.
- `framework`: backend infrastructure and public contracts.
- `ui`: presentation primitives.
- `core`: common, organisation, and master business modules.
- `billing`: billing and financial-document modules.
- `mail`: mail delivery and synchronization.
- `ecommerce` and `sites`: installable boundaries awaiting real modules.
- `devkit`: standalone developer application; outside Platform composition.

A repository imports siblings only through declared package exports, fixed HTTP contracts, or
approved events. Private sibling source imports and cross-repository table writes are prohibited.

## Composition Root

`techmedia/apps/platform` may:

- Register public app modules.
- Inject tenant/session/permission/queue dependencies.
- Compose public navigation and routes.
- Order exported migrations and seeds.
- Run stack builds, database lifecycle, and E2E verification.

It must not own another repository's entity SQL, repository methods, services, schemas, forms,
lists, workspaces, seed records, or lifecycle policy.

## Backend Leaf Contract

A synchronous CRUD leaf under `<repository>/api/src/modules/<module>/` owns:

```text
<module>.migration.ts
<module>.module.ts
<module>.repository.ts
<module>.routes.ts
<module>.seed.ts
<module>.service.ts
<module>.types.ts
index.ts
```

A full asynchronous leaf adds `events`, `worker`, and `sync` only when real executable
capabilities exist. Empty, reserved, metadata-only, wrapper, alias, or borrowed role files are
boundary failures.

Role responsibilities:

| Role       | Ownership                                                                             |
| ---------- | ------------------------------------------------------------------------------------- |
| Migration  | Concrete owned tables, columns, keys, indexes, and foreign keys                       |
| Repository | Concrete reads/writes for owned tables and owned relation responses                   |
| Service    | Validation, normalization, parent checks, duplicates, protection, lifecycle, blockers |
| Routes     | Fixed URLs and Zod contracts through `registerContractRoute()`                        |
| Seed       | Repeatable owned records; persisted parent resolution                                 |
| Types      | Exact owned records, payloads, filters, status, and public responses                  |
| Module     | Stable key and registration of only its routes/capabilities                           |
| Index      | Intentional public surface                                                            |

## Frontend Leaf Contract

A CRUD frontend leaf under `<repository>/web/src/modules/<module>/` owns:

```text
<module>.workspace.tsx
<module>.list.tsx
<module>.form.tsx
<module>.services.ts
<module>.hooks.ts
<module>.schema.ts
<module>.types.ts
index.ts
```

Forms, lists, and workspaces have distinct implementations. Settings, print, show, report, and test
roles exist only when the module owns that behavior.

## Relationship Contract

- Children use fixed public lookup contracts and own minimal parent option types.
- Children never import parent repositories, services, hooks, forms, seed arrays, or private types.
- Forms submit real persisted parent IDs and backend services validate them.
- Foreign keys, migration order, seed order, relation responses, and delete blockers describe the
  same hierarchy.
- The primary-record owner owns reverse relation responses.

Reference location order:

```text
Country â†’ State â†’ District â†’ City â†’ Pincode
```

## Database Ownership

- Platform master and tenant-runtime tables: `techmedia/apps/platform/api/src/modules/`.
- Core tenant tables: `core/api/src/modules/`.
- Billing tenant tables: `billing/api/src/modules/`.
- Mail tenant tables: `mail/api/src/modules/mail/`.
- Framework, UI, Ecommerce, and Sites currently own no business tables.
- Devkit is outside the Platform database lifecycle.

A database composition file may order and record public migration/seed functions. It may not hold
another leaf's SQL or seed records.

## Shared-Code Boundary

Allowed shared infrastructure:

- Transport and session context.
- Environment loading.
- Observability.
- Framework contracts.
- Reusable UI primitives without business fields or workflows.

Forbidden shared behavior:

- Generic entity kinds or metadata registries.
- Arbitrary table/path/module arguments.
- Centralized CRUD, Common Master, or Location engines.
- Shared business repositories, services, schemas, forms, lists, or workspaces.
- Private cross-module or cross-repository imports.
- Frontend-only protected-record enforcement.
- Raw foreign-key errors used as delete policy.

## Completion Audit

1. Inventory backend and frontend leaf files.
2. Verify imports, exports, routes, tables, parents, children, migrations, and seeds.
3. Compare persistence columns, backend payloads, route schemas, frontend types/schemas, and forms.
4. Verify parent checks, protected records, delete blockers, lifecycle routes, and UI action behavior.
5. Scan wrappers, aliases, dynamic paths, generic definitions, passthrough schemas, and duplicate role hashes.
6. Run formatting, lint, TypeScript, builds, module-boundary checks, dependency checks, and version checks.
7. Run configured database/E2E checks or report why they were unavailable.
8. Report existing-database upgrade requirements; `CREATE TABLE IF NOT EXISTS` does not upgrade old tables.
