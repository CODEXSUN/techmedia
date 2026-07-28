# Data Strategy

## Database

TechMedia uses one MariaDB database selected only by `DB_NAME`.

Local tables are limited to:

- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `schema_migrations`

Per-user Frappe credentials and verification metadata are columns on `users`. Application-level
Frappe connection values come only from `.env`; Settings owns no tables.

## CRM

Frappe is the source of truth for CRM enquiries and related records. TechMedia must not create,
seed, mirror, synchronize, or cache CRM business tables locally. API requests resolve the signed-in
user and call the live gateway with that user's verified Frappe identity.

## Estimate

Frappe is the source of truth for Estimate records and the linked Enquiry and Supplier options.
TechMedia must not create, seed, mirror, synchronize, or cache Estimate business tables locally.
List, reference, create, read, and update requests use the signed-in user's verified Frappe identity.

## Safety

- Database names and endpoints come from `.env`.
- Encrypted integration credentials require `TECHMEDIA_INTEGRATION_ENCRYPTION_KEY`.
- Destructive reset requires `TECHMEDIA_DB_RESET_CONFIRM=DROP_DATABASE`.
- Production reset additionally requires `TECHMEDIA_ALLOW_PRODUCTION_DB_RESET=1`.
- Forward migrations must tolerate compatible legacy identity data without recreating removed
  platform tables.
