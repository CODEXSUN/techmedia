# TechMedia Database Migration Runbook

## Before Creating A Migration

- Confirm the owning app and leaf module.
- Write tracked migrations rather than manual production edits.
- Prefer expand/migrate/contract for risky changes.
- Record affected tables, expected runtime, risk, and validation SQL.

## Local Restored-Dump Test

1. Restore a recent safe dump into local platform and tenant databases.
2. Point the local `.env` database names to those restored databases.
3. Run `npm run db:migrations:preflight`.
4. Set `TECHMEDIA_RESTORED_DUMP_TEST=1` and run
   `npm run db:migrations:test-local`.
5. Run affected API/application tests and compare important schema and row-count results.

## Production Preflight

```text
TECHMEDIA_VERIFIED_BACKUP_ID=<backup-run-id>
npm run db:migrations:preflight
```

Do not continue if backup freshness, restore status, tenant targets, or rollback notes are missing.

## Consolidated Lifecycle Order

1. Platform master module migrations.
2. Platform master module seeds.
3. Tenant runtime migrations.
4. Core migrations: Common lookups, Organisation, then Master.
5. Tenant runtime seeds.
6. Core seeds in the same dependency order.

Billing, Mail, Ecommerce, and Sites do not participate in TechMedia database lifecycle.

Ownership:

- Platform master and tenant runtime: `apps/platform/api/src/modules/`
- Core tenant business data: `../core/api/src/modules/`

Composition roots only order public module-owned lifecycle functions. They must not copy SQL, seed
arrays, repositories, or private services across repository boundaries.

Run `npm run check:database-lifecycle` after changing migration or seed composition.
`npm run db:migrate` runs migrations without application seeds; `npm run db:seed` ensures
migrations and then runs repeatable seeds.

## Failure Handling

- Stop the rollout and preserve logs.
- Do not edit an already-applied migration.
- Add a corrective forward migration unless the approved rollback plan says otherwise.
- Re-run preflight before retrying.
