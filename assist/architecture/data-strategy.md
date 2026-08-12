# Data Strategy

## Database

TechMedia uses one MariaDB database selected only by `DB_NAME`.

Local tables are limited to:

- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `notifications`
- `notification_outbox`
- `ai_honey_threads`
- `ai_honey_messages`
- `ai_honey_skills`
- `schema_migrations`

Per-user Frappe credentials and verification metadata are columns on `users`. Application-level
Frappe connection values come only from `.env`; Settings owns no tables.

Honey persists actor-owned conversation history and worker audit metadata. Provider keys and model
connection settings remain environment-only and are never stored in conversation records.

Notifications persist internal recipient inbox and outbox events only. They retain the Frappe
enquiry identifier, title, and message, but never duplicate enquiry data or become a CRM source
of truth.

## CRM

Frappe is the source of truth for CRM enquiries and related records. TechMedia must not create,
seed, mirror, synchronize, or cache CRM business tables locally. API requests resolve the signed-in
user and call the live gateway with that user's verified Frappe identity.

## Estimate

Frappe is the source of truth for Estimate records and the linked Enquiry and Supplier options.
TechMedia must not create, seed, mirror, synchronize, or cache Estimate business tables locally.
List, reference, create, read, and update requests use the signed-in user's verified Frappe identity.

## Quotation

Frappe is the source of truth for Quotation records. Each TechMedia quotation is linked to its
source Enquiry by the Frappe `Quotation.custom_enquiry` Link field. Enquiry and authenticated user
identity are derived server-side; list, reference, create, read, and update requests use the
signed-in user's verified Frappe identity.

## iShop

Frappe is the source of truth for LogicX iShop Catalog and iShop Item records, plus ERPNext Item,
Item Group, Brand, variant, and image references. TechMedia does not mirror or cache iShop data.

## Safety

- Database names and endpoints come from `.env`.
- Encrypted integration credentials require `TECHMEDIA_INTEGRATION_ENCRYPTION_KEY`.
- Destructive reset requires `TECHMEDIA_DB_RESET_CONFIRM=DROP_DATABASE`.
- Production reset additionally requires `TECHMEDIA_ALLOW_PRODUCTION_DB_RESET=1`.
- Forward migrations must tolerate compatible legacy identity data without recreating removed
  platform tables.
