# TechMedia Environment Contract

## Ownership

The executable `techmedia` repository owns the Platform runtime `.env` and `.env.example`.
Framework owns only the environment loader. Core consumes the server-side database/session context
it needs.

Only Framework, UI, Core, and Platform participate in the TechMedia environment contract.

## Runtime Groups

- Runtime: `NODE_ENV`, Platform API/Web ports, URL, origin, and allowed origins.
- Database: driver, host, port, user, password, master name, and guarded lifecycle controls.
- Queue: backend, Redis URL, worker enablement/interval, and retention.
- Storage: root, public root, private root, backup, and restore controls.
- Tenant test seed: disabled by default and validated when enabled.
- Authentication: JWT secret, auth mode, and optional intentionally seeded users.
- Tooling: restored-dump, backup verification, dev port, and database client/admin controls.

TechMedia-owned operational keys use the `TECHMEDIA_` prefix. Billing, Mail, Ecommerce, and Sites
credentials are not part of the current application contract.

## Rules

- Never commit `.env` or real credentials.
- `.env.example` contains every supported operator-facing key with non-secret examples.
- Startup Zod schemas validate all runtime values consumed by the application.
- Frontend code never receives database, JWT, or administrative secrets.
- Production reset, restore, and migration operations require explicit confirmation variables.
- Lower-environment copies of production data must be masked.

## Resolution

`@codexsun/framework/env` loads the nearest executable npm-workspace root environment. Composed
Core code therefore uses TechMedia runtime configuration without duplicate environment files.

When adding or removing a variable, update the owning Zod schema, `techmedia/.env.example`, this
contract, and the closest operational runbook, then run TypeScript, build, and the affected runtime
or database check.
