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

The tenant-user and Frappe owners include the forward
`platform.tenant-user.frappe-credentials-v2` and
`frappe.connection.per-user-credentials-v4` migrations. They add encrypted per-user Frappe
credentials and verification metadata, then move an existing tenant-level credential pair to the
protected administrator when that user does not already have credentials. Run the normal tenant
migration lifecycle before deploying per-user authentication. The earlier
`frappe.connection.verification-status-v2` migration remains in the ordered history.

The forward `frappe.connection.app-credentials-v5` migration adds dedicated encrypted tenant app
key and app secret columns to Frappe settings. These credentials are used only by the settings-page
connection test; user login and CRM operations continue to use each user's encrypted credentials.

The CRM owner includes the forward `crm.enquiry.unassigned-v4` migration. It makes
`crm_enquiries.assigned_to_user_id` nullable so unassigned active enquiries can be owned by the
Open Enquiry queue. Run the normal tenant migration lifecycle before deploying the strict assigned,
created, and unassigned list rules.

The forward `crm.enquiry.workspace-children-v5` migration adds concrete enquiry-owned Email, Call,
Task, Note, Attachment, and Activity tables, plus Reply/Comment metadata on enquiry messages. Every
child table references `crm_enquiries.id` with `ON DELETE CASCADE`. Run the normal tenant migration
lifecycle before deploying the working enquiry workspace tabs.

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
