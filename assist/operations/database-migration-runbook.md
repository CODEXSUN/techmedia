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
5. CRM Enquiry migration when `crm` is enabled for the tenant.
6. Frappe connection migration when `frappe` is enabled for the tenant.
7. Tenant runtime seeds.
8. Core seeds in the same dependency order.
9. CRM Enquiry seed when `crm` is enabled for the tenant.
10. Frappe permission seed when `frappe` is enabled for the tenant.

Billing, Mail, Ecommerce, and Sites do not participate in TechMedia database lifecycle.

Ownership:

- Platform master and tenant runtime: `src/platform/api/src/modules/`
- Core tenant business data: `../core/api/src/modules/`
- CRM tenant business data: `src/platform/api/src/modules/crm/`
- Frappe tenant integration settings: `src/platform/api/src/modules/frappe/`

The Frappe owner includes the forward `frappe.connection.verification-status-v2` migration. It
adds verification status and last-check timestamps to existing tenant connection tables using
idempotent column additions; run the normal tenant migration lifecycle before deploying the badge
behavior.

The CRM owner includes the forward `crm.enquiry.unassigned-v4` migration. It makes
`crm_enquiries.assigned_to_user_id` nullable so unassigned active enquiries can be owned by the
Open Enquiry queue. Run the normal tenant migration lifecycle before deploying the strict assigned,
created, and unassigned list rules.

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
