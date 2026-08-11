# Module Boundaries

## Composition Root

`src/platform/api/src/app.ts` may register only:

- `identity.user`
- `identity.role`
- `identity.permission`
- `identity.user-role`
- `identity.role-permission`
- `settings.frappe`
- `notification.inbox`
- `crm.enquiry`
- `estimate`
- `quotation`

The composition root orders modules and injects the public live-Frappe enquiry gateway. It must not
contain entity SQL or business workflows.

## Backend Leaves

Identity leaves own their routes, services, repositories, migrations, seeds, and types.
Relationships use persisted IDs and database foreign keys. Settings has routes and services but no
repository, migration, seed, or table because its application connection comes from `.env`.

Notifications own recipient-scoped inbox and outbox records. They store delivery metadata and a
live Frappe enquiry identifier, never a local CRM record.

CRM owns routes, validation, UI contracts, and enquiry workflow behavior. All CRM records are read
or written through the Frappe gateway; adding a CRM repository, migration, seed, cache table, or
local source of truth is prohibited.

## Frontend Leaves

Estimate owns its routes, validation, UI contracts, and Frappe document mapping. It must remain a
live-Frappe leaf with no repository, migration, seed, cache table, or local business persistence.

Quotation owns its routes, validation, UI contracts, enquiry-linked Frappe document mapping, and
public enquiry-tab component. It must remain a live-Frappe leaf with no repository, migration,
seed, cache table, or local business persistence.

Frontend modules own their workspaces, forms, lists, services, hooks, schemas, and types. The app
desk composes Identity, Settings, CRM navigation, and the recipient notification inbox; CRM enquiry detail consumes the public
Estimate and Quotation tab components.

The internal Framework workspace supplies infrastructure contracts. The internal UI workspace
supplies presentation primitives. TechMedia does not import parent-repository source or compose
other product packages.
