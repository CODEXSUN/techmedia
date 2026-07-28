# Module Boundaries

## Composition Root

`src/platform/api/src/app.ts` may register only:

- `identity.user`
- `identity.role`
- `identity.permission`
- `identity.user-role`
- `identity.role-permission`
- `settings.frappe`
- `crm.enquiry`

The composition root orders modules and injects the public live-Frappe enquiry gateway. It must not
contain entity SQL or business workflows.

## Backend Leaves

Identity leaves own their routes, services, repositories, migrations, seeds, and types.
Relationships use persisted IDs and database foreign keys. Settings has routes and services but no
repository, migration, seed, or table because its application connection comes from `.env`.

CRM owns routes, validation, UI contracts, and enquiry workflow behavior. All CRM records are read
or written through the Frappe gateway; adding a CRM repository, migration, seed, cache table, or
local source of truth is prohibited.

## Frontend Leaves

Estimate owns its routes, validation, UI contracts, and Frappe document mapping. It must remain a
live-Frappe leaf with no repository, migration, seed, cache table, or local business persistence.

Frontend modules own their workspaces, forms, lists, services, hooks, schemas, and types. The app
desk composes only Identity, Settings, CRM, and Estimate navigation.

Framework supplies infrastructure contracts. UI supplies presentation primitives. TechMedia does
not import sibling private source or compose product packages.
