# Multi-Repository Application Structure

## Rule

TECHMEDIA is developed as sibling repositories and composed as one Platform runtime. Repository
boundaries are ownership boundaries, not folders that may be crossed for convenience.

## Executable Composition

```text
techmedia/
  apps/platform/api/     # executable API, auth, tenant context, Platform modules, DB composition
  apps/platform/web/     # executable React shell, desks, routing, navigation composition
  tools/                 # stack, database, boundary, version, and release tooling
```

Platform imports only published package surfaces from sibling repositories. It may register routes,
compose menus, and order public migrations/seeds. It must not duplicate sibling business logic.

## Business Repository Structure

A full business repository uses:

```text
<app>/
  api/
    src/
      index.ts
      app.ts
      database/          # connection and lifecycle ordering only
      modules/
        <module>/
  web/
    src/
      index.ts
      modules/
        <module>/
      shared/            # cross-module code within this app only
```

Current full business repositories installed in TechMedia are `core` and `mail`.

### Backend leaf

A synchronous CRUD leaf owns:

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

Add event, worker, or sync roles only when executable behavior exists.

### Frontend leaf

A CRUD frontend leaf owns:

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

Settings, print, show, or test files are added only for real owned behavior.

## Infrastructure Repositories

- `framework/src`: stable backend contracts and runtime primitives; no business tables or seeds.
- `ui/src`: reusable presentation primitives; no business fields, routes, schemas, or workflows.

## Boundary-Only Repositories

- `ecommerce/src`
- `sites/src`

They remain intentionally small until real modules exist. Do not add placeholder role files.
When implemented, they must adopt the business repository structure and register through public
package contracts.

## Standalone Devkit

`devkit` is a separate executable developer application. It is not a Platform package, migration
participant, or seed participant. Platform release commands must not mutate Devkit.

## Cross-Repository Rules

- Imports use declared package exports.
- No `../<sibling>/src/...` imports.
- No sibling repository/service/migration/seed/form/hook private imports.
- Cross-repository writes require an approved application service or event.
- A child owns its minimal lookup type and calls a fixed public lookup contract.
- The record owner owns reverse relation responses and delete blockers.
- Platform is the only composition root for the customer runtime.

## Database And Environment Rules

The repository that owns a table owns its migration and seed. Composition order must mirror foreign
key and lookup dependencies. Libraries do not own Platform `.env` files; the executable runtime
owns and validates configuration.

## Build And Release

Each repository installs, checks, builds, versions, commits, and pushes independently. The
`techmedia` lockfile records the exact local composition baseline. A composed release must verify
the versions currently resolved by that lockfile.
