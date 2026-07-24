# Tenant Isolation

## Goal

Every tenant must behave like a separate customer environment even when multiple tenants share the same codebase, app servers, containers, or infrastructure.

For the current implementation status, blockers, required tests, and AI guardrails, also read:

```text
assist/architecture/tenant-readiness-track.md
```

## Isolation Levels

TECHMEDIA should support multiple isolation patterns:

- Dedicated database per tenant.
- Shared infrastructure with strict tenant routing.
- Dedicated containers for high-value or regulated tenants.
- Local offline store per tenant on desktop or mobile.

The default planning assumption is one database per tenant where business isolation, backup, restore, or customization requires it.

## Tenant Context

Tenant context should include:

- Tenant ID.
- Tenant slug or code.
- Tenant database connection target.
- Active subscription.
- Active industry pack.
- Active apps and features.
- Locale and compliance settings.
- User role and permission scope.

Current implementation note: tenant login resolves the tenant database for tenant user authentication, and Core business requests require a validated `x-tenant-db` context. Core rejects the Platform master database and routes repositories through the request-bound tenant database connection. Core Common master tables therefore do not duplicate tenant identity in `tenant_id` columns; the selected database is their isolation boundary.

Tenant database provisioning follows the tenant's selected application set. Platform identity/access migrations run
first, followed by Core's owned migrations and seeds. TechMedia's module-owned CRM Enquiry and encrypted Frappe
connection migrations and seeds run when their apps are enabled. Billing, Mail, Ecommerce, and Sites do not
participate in this application's lifecycle. Tenant
create/update and managed setup, reinstall, and migration actions use this same ordered composition contract.
Managed lifecycle actions invalidate only the target tenant's Core bootstrap state before running, so a database
recreated while the API process remains online receives the complete selected-app schema.

Tenant context must be available in:

- HTTP requests.
- WebSocket events.
- Queue jobs.
- Domain events.
- Scheduled tasks.
- Sync payloads.
- Audit logs.
- AI tool calls.
- Integration calls.

Tenant context may be resolved from custom domain, subdomain, path fallback, or explicit headers depending on client and app surface. Production tenant web should primarily use custom domain or subdomain. Path fallback is reserved for development, internal tools, and Super Admin support flows. Jobs and events must always carry tenant ID explicitly.

Application tenant resolution only needs domain-to-tenant mapping. SSL certificates, DNS, Cloudflare, Nginx, and reverse proxy concerns belong to infrastructure.

Production rule: after domain/subdomain resolution is implemented, the request host must bind the tenant first. Headers may carry the already-resolved tenant ID to APIs, but they must not be treated as an independent source of truth for tenant identity.

## Data Access Rules

- No tenant business data access without tenant context.
- No global query should accidentally read tenant data.
- Tenant user sessions must not be able to access another tenant by changing request headers.
- Shared tables that temporarily store tenant business data must include tenant ownership filters.
- Dedicated tenant database routing must fail closed when the tenant database mapping is missing, inactive, or not ready.
- Background jobs must restore tenant context before work starts.
- Integration callbacks must resolve tenant context safely.
- Reporting must respect tenant and permission boundaries.
- AI assistants must not access data outside the current tenant or approved support scope.

## Multi-Company Scope

One tenant may own many companies. Company, branch, warehouse, counter, device, accounting year, GST identity, document numbering, and default-company selection must remain inside the tenant boundary. Cross-company views are allowed only inside the same tenant and only through permission-aware workflows. Cross-tenant company access is never allowed.

## Customization Rules

Tenant customization should be stored as structured configuration:

- Enabled apps.
- Enabled features.
- UI preferences.
- Print templates.
- Numbering formats.
- Tax settings.
- Workflow settings.
- Custom fields.
- Integration credentials.

Customizations must be versioned when they affect data shape, billing logic, accounting, or compliance output.

The tenant Platform record is the authoritative landing-app setting. TechMedia defaults this value
to `crm`. Tenant startup reconciles Core's Default Company landing value through Core's public
Default Company application contract. Landing Desk, Default Company, and Super Admin tenant app
connections all update the same Platform value and the Core mirror; browser storage is not a
landing-app source of truth.

## Backup And Restore

Each tenant should have a planned backup and restore strategy:

- Full database backup.
- File storage backup.
- Configuration backup.
- Audit trail retention.
- Restore testing.
- Point-in-time recovery where possible.

## Security Notes

- Tenant database credentials should not be exposed to clients.
- API tokens must be tenant-scoped.
- External integration credentials must be encrypted.
- Frappe credentials belong to an individual tenant user, are encrypted at rest, and must never be
  returned by tenant-user or connection-setting APIs. The tenant Frappe endpoint remains shared,
  while each server-side Frappe request resolves the signed-in user's API key and secret.
- TechMedia login reads the saved per-user Frappe verification state and never performs a remote
  handshake. An administrator verifies a user's encrypted API key and secret once; that trusted
  state is reused until the user's credentials or the shared Frappe endpoint changes. Frappe
  availability must not bypass or replace TechMedia session authentication.
- Frappe transactions use the signed-in TechMedia user's saved Frappe API identity. A remote
  authentication rejection marks that identity offline and requires one explicit re-verification;
  transient network and business-validation failures do not discard a valid verification.
- Support access must be audited.
- Cross-tenant admin actions need elevated permission and logging.

Super Admin tenant-user management uses the guarded `/admin/tenants/options` lookup and requires an
explicit tenant selection. The server resolves that tenant's configured database; clients never
submit a tenant database name or connection credentials. User create, update, suspend, restore, and
force-delete operations reuse the `platform.tenant-user` owner and write the selected tenant ID and
Super Admin actor to Platform activity. The Super Admin upsert does not return, display, or overwrite
stored Frappe API secrets; integration credentials remain available only through the tenant-owned
verified connection flow.
