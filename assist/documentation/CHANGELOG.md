# Changelog

## Version State

Current version: 1.0.22

Release tag: v-1.0.22

Changelog label: v 1.0.22

This changelog starts with TechMedia as an independent application composed from
`framework + ui + core + platform`. Source-project release history is not TechMedia release history.

New entries must keep database-facing work and application code work separate.

## Unreleased

### Database Changes

- Database update: No.

### App Codebase Changes

- Removed Back and Next controls from My Job enquiry detail, and changed WhatsApp to open its web
  conversation in a separate browser tab.
- Reconciled the root workspace install and lockfile so the declared Inter font package resolves
  for the Vite development server and production web build.
- Made every My Job and My Calls enquiry row open its detail page, while keeping the row action
  menu independent for supported actions.
- Refined enquiry comments with compact aligned rows, larger readable content, a single author and
  timestamp line, and an editor footer containing only the Comment action.
- Replaced comment edit/delete with non-destructive suspension: the latest message remains in live
  Frappe history and is rendered fully struck through after suspension.
- Removed Back and Next navigation from both My Job and My Calls enquiry details; these controls
  remain available only in Open Enquiry.
- Restricted the immutable system-user guard to user ID 1, allowing administrators to edit and
  reassign the role of every other administrator through the Users workspace.

## v-1.0.22

### [v 1.0.22] 2026-08-05 9:15 am - CRM comment quality and navigation

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.22.

## v-1.0.21

### [v 1.0.21] 2026-08-01 1:37 pm - CRM workspace navigation and guarded live updates

#### Database Changes

- Database update: Yes.
- Added the repeatable `crm.job.manage` permission for Manager and granted the protected
  `crm.enquiry.create` permission to Manager, Staff, and User so every standard role can create an
  enquiry from My Calls; no schema or business tables were added.

#### App Codebase Changes

- Bumped repository version to 1.0.21.
- Added supervisor-managed Job Execution creation and editing through live Frappe, retained
  Estimate editing, replaced free-text customers with a validated live-Customer lookup, and made
  assigned role labels searchable in the Users list.
- Added WhatsApp actions to My Job and My Calls enquiry details using the `wa.me` message format,
  with Windows app launch first and a timed WhatsApp Web fallback.
- Restricted Open Enquiry navigation and API permission exposure to Administrator, while making
  New enquiry available to every standard role in My Calls.
- Reworked the application shell with the Shadcn stone/Inter default theme, a fixed global header,
  global CRM search, compact sidebar/workspace spacing, bright app and user menus, an Account app,
  Administrator-only Add user, and a dismissible welcome notification with a pulsing unread dot.
- Removed the CRM overview hero; made statistic cards hoverable and link to their filtered lists;
  added live muted count badges to My Job and My Calls; reset open detail/upsert state on every
  sidebar selection; and added theme-aware enquiry row hover highlighting.
- Hardened Docker updates with committed-source enforcement and an explicit dirty override,
  source/image/migration-compatible version locking, an exclusive host lock, backup and Docker
  disk-space preflight, SHA-256 backup verification and retention, and per-attempt deployment JSON.
- Preserved existing credentials, topology, MariaDB data, and Frappe mappings during updates;
  replacement failures restore prior API/Web images without claiming to reverse applied database
  migrations or repeatable seeds.

## v-1.0.20

### [v 1.0.20] 2026-07-31 10:30 am - Enquiry detail visibility controls

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.20.
- Made CRM Overview the landing page after sign-in for every role, while retaining the
  Administrator-only Application workspace in the workspace switcher.
- Simplified enquiry detail for operational roles by removing Reply and creation metadata, hiding
  Quotation, Tasks, and Attachments tabs, limiting Activity to Administrator, and hiding Properties
  for User and Manager.

## v-1.0.19

### [v 1.0.19] 2026-07-31 9:53 am - CRM action controls and role permissions

#### Database Changes

- Database update: Yes.
- Updated repeatable role-permission seeds so Auditor receives the live CRM list/create access,
  while Manager, Staff, and User no longer receive the seeded `crm.enquiry.create` permission.

#### App Codebase Changes

- Bumped repository version to 1.0.19.
- Expanded all CRM enquiry-list searches to match enquiry ID, enquiry details, phone number, and
  customer name, including multi-word filters within the signed-in user's permitted live list.
- Renamed the assigned and created CRM views to My Job and My Calls, and limited New enquiry to
  the My Calls view.
- Restricted the CRM Refresh and New enquiry controls to Administrator and Auditor in the desk UI.

## v-1.0.18

### [v 1.0.18] 2026-07-31 9:27 am - Version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.18.
- Made the application Frappe connection persist safely to the configured root `.env`, creating it
  from `.env.example` when a first-time installation has not created it yet, and refreshing the
  running API configuration after a successful save.
- Improved the Frappe settings error when the mounted runtime `.env` is not writable by the API
  process.
- Allowed the protected administrator to save and verify its own Frappe credentials without
  changing its protected role assignment.

## v-1.0.17

### [v 1.0.17] 2026-07-31 5:44 am - Version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.17.

## v-1.0.16

### [v 1.0.16] 2026-07-30 6:54 pm - Personal CRM overview and status filters

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.16.
- Reworked the CRM overview around the signed-in user's enquiries: My enquiries, Created by me,
  In progress, and Closed by me. Removed the cross-user enquiry leaderboard and its API payload.
- Added a live API-backed CRM status filter. Enquiry lists now show active Open, Follow, and
  Escalation records by default, while Won and Lost records are available only when selected from
  the existing Filters menu.

## v-1.0.15

### [v 1.0.15] 2026-07-30 11:00 am - Complete enquiry commercial workflow and interactive deployment

#### Database Changes

- Database update: Yes.
- Added repeatable Quotation permission seeds and default role-permission assignments for auditor,
  manager, staff, and user roles.
- Kept the MariaDB schema limited to Identity and migration-history tables; this release adds no
  business tables or destructive migration.

#### App Codebase Changes

- Bumped repository version to 1.0.15.
- Converted TechMedia into a self-contained npm monorepo with repository-owned Framework and UI
  workspaces, one root `node_modules`, and one root `dist`.
- Removed parent-folder package installation, build, TypeScript, Vite, and container-context
  dependencies, including the obsolete Core image dependency.
- Added repository-boundary, artifact-layout, module-boundary, database-lifecycle, Framework
  package, and built-runtime smoke verification.
- Enabled the application desk and navigation for the initial administrator, corrected lazy module
  loading, and enforced login redirection when a local JWT expires or an authenticated request is
  rejected.
- Added enquiry-owned Estimate and Quotation tabs with live-Frappe list and upsert workflows,
  automatic enquiry and signed-in-user context, and responsive single-row Estimate inputs.
- Removed the Emails, Calls, and Notes tabs from the enquiry show page while retaining Comments,
  Jobs, Estimate, Quotation, Tasks, Attachments, and Activity.
- Refined the CRM overview presentation and removed the Frappe connection header card.
- Expanded the standalone `setup.sh` into a fully interactive Docker installer covering resource
  names, ports, database identity, administrator credentials, public URLs, Frappe configuration,
  secret retention, shared or dedicated MariaDB, and safe database reuse or recreation.
- Added an explicit path to reuse a named running MariaDB container and existing Docker network;
  reused networks are external to Compose and existing infrastructure is never disconnected,
  stopped, removed, or recreated by setup.
- Simplified setup to create the root `.env` from `.env.example` when absent, read application URLs,
  encryption, and Frappe connection values from that file without prompts, and always enable the
  live Frappe integration.
- Kept internal Framework and UI workspace dependency versions aligned during repository version
  bumps so container `npm ci` resolves local workspaces instead of requesting unpublished packages.
- Added occupied-port detection before image builds and documented the Git Bash invocation required
  on Windows systems where `bash.exe` resolves to an unconfigured WSL installation.
- Verified a live local Docker deployment with healthy MariaDB, API, and web containers, eight
  applied migrations, administrator login and session recovery, web-to-API proxying, clean
  container logs, and persisted authentication after an API restart.

## v-1.0.14

### [v 1.0.14] 2026-07-29 5:23 pm - Harden standalone shared-infrastructure deployment

#### Database Changes

- Database update: No.
- Kept the Identity schema and migration history unchanged while allowing setup to reconcile the
  dedicated `techmedia` account and `techmedia_db` on either shared or dedicated MariaDB.

#### App Codebase Changes

- Bumped repository version to 1.0.14.
- Added an explicit deployment choice between existing shared infrastructure and a dedicated
  TechMedia MariaDB; shared Redis and Media are detected and left untouched because TechMedia does
  not consume them.
- Removed the redundant TechMedia MariaDB container when shared reuse is selected while preserving
  its named volume for recovery, and added clean network switching for future dedicated installs.
- Removed the Compose-level `DB_HOST=mariadb` override so the protected runtime environment remains
  authoritative when connecting to `cxapp-mariadb`.
- Added separate production `.container/.env.example` and `deploy.env.example` contracts with the
  live non-secret administrator, database, Frappe endpoint, and shared-container defaults while
  keeping passwords, JWT values, root credentials, and API secrets generated or prompted.
- Verified the shared deployment live with healthy API/Web containers, administrator login,
  Identity-only tables, eight migrations, and successful login after an API restart.

## v-1.0.13

### [v 1.0.13] 2026-07-29 11:47 am - Complete standalone deployment and public login

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.13.
- Added the standalone TechMedia container deployment, interactive setup flow, environment
  contract, and shared-service integration used by the CXApp TechMedia stack.
- Reworked the public login into a responsive TechMedia landing experience while preserving
  authenticated return paths and application routing.
- Corrected browser API URL normalization and authentication gating for loopback development and
  container deployment.
- Updated Recharts to the supported 3.x line, reviewed install scripts, and produced clean audit
  and production build results.

## v-1.0.12

### [v 1.0.12] 2026-07-29 12:15 am - Complete standalone TechMedia CRM and Estimate

#### Database Changes

- Database update: Yes.
- Replaced tenant database routing with one `DB_NAME`-selected TechMedia database and limited the
  local schema to users, roles, permissions, user-role assignments, role-permission assignments,
  and schema migration history.
- Removed tenant, application registry, entitlement, subscription, storage, queue, and locally
  persisted CRM database ownership from the TechMedia runtime.
- Kept Settings, CRM, and Estimate free of local business tables: the application connection is
  stored in `.env`, per-user Frappe credentials remain on Identity users, and business records are
  read and written directly through live Frappe contracts.

#### App Codebase Changes

- Converted TechMedia into a standalone single-client application with one login, one desk, one
  database lifecycle, and no tenant-aware or TMApp runtime composition.
- Retained only Identity administration, Frappe Settings, CRM enquiries, and Estimate workflows,
  with CRM visible to every authenticated user and Identity/Settings gated to the Administrator
  role in both the frontend routes and API authorization boundary.
- Added the live-Frappe Estimate module with list, search, filters, configurable columns,
  pagination, bounded reference lookups, and dedicated create/update pages.
- Refined CRM enquiry navigation and lists with consistent workspace widths, initial-load spinners,
  completed empty states, removal of the separate Enquiry ID selector, and cleaned Frappe labels.
- Added Frappe connection save and verification state, user import before credential verification,
  administrator-only theme selection, simplified breadcrumbs, and consistent CRM/Settings desks.
- Standardized Estimate and enquiry layouts with shared list gutters, centered responsive forms,
  compact controls, and matching live-loading feedback.
- Bumped the repository, Platform API, Platform Web, and lockfile versions to 1.0.12.

## v-1.0.11

### [v 1.0.11] 2026-07-27 10:10 am - Refine live CRM enquiry workspace

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Added inline show-page editing for List in, Priority, Assigned to, and Status, with updates saved
  directly to Frappe and refreshed job data returned with the enquiry response.
- Reworked the comments presentation around message-first rows, compact right-aligned timestamps and
  author identity, and clearer threaded replies.
- Refined every enquiry list with Mobile hidden by default, behaviour-specific status icons and
  colours, a compact colour-only Priority indicator with accessible hover tooltips, and matching
  bright priority swatches in the upsert and show-page selectors.
- Bumped the repository, Platform API, Platform Web, and lockfile versions to 1.0.11.

## v-1.0.10

### [v 1.0.10] 2026-07-26 3:08 pm - Complete TechMedia CRM and TMApp deployment

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Expanded CRM enquiries with priority, rich threaded messages, employee assignment, and live
  Frappe job-execution time and cost tracking.
- Aligned the CRM API, Frappe gateway, frontend contracts, forms, lists, show views, and workspace
  behavior around the same persisted enquiry model.
- Replaced the previous container layout with the TMApp deployment, safe setup/update scripts,
  shared CXApp networks, and Cloudflare routing.
- Split large TechMedia Web production bundles by dependency owner.
- Deduplicated TanStack Query across the composed TechMedia and Core frontend bundle so hooks and
  the application provider share one Query Client context.
- Bumped repository version to 1.0.10.

## v-1.0.9

### [v 1.0.9] 2026-07-25 9:17 am - Standardize repository LF line endings

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Standardized detected repository text files on LF through a repository-owned `.gitattributes`
  policy, preventing Windows Git from repeatedly warning about LF-to-CRLF conversion.
- Bumped repository version to 1.0.9.

## v-1.0.8

### [v 1.0.8] 2026-07-24 5:47 pm - Prevent repository text encoding corruption

#### Database Changes

- Database update: Yes.
- Preserved exactly one internal Super Admin user-role assignment and seeded its tenant permission
  links so permission-aware sibling packages can authorize the protected account without exposing it
  through tenant access APIs.

#### App Codebase Changes

- Replaced the former tenant administrator role with one hidden, non-assignable Super Admin and a
  visible Administrator role for normal administration.
- Kept the protected Super Admin identity and role behavior out of user, role, assignment, and
  permission management responses while retaining its internal authorization path.
- Added focused tenant-role E2E coverage proving the Super Admin can load Core application records
  and that protected role assignments remain absent from public tenant access responses.
- Added a repository-local text encoding gate that scans source, configuration, documentation, and
  environment files for invalid UTF-8 and common mojibake sequences.
- Required environment comments to remain ASCII and environment files to remain BOM-free so
  decorative separators cannot be silently corrupted by Windows encoding conversions.
- Repaired legacy mojibake in the module-boundary, design-system, and governance documentation.
- Wired the encoding gate into the normal TechMedia repository check while retaining a focused
  environment check alias for maintenance workflows.
- Bumped the repository, Platform API, Platform Web, and lockfile versions to 1.0.8.

## v-1.0.7

### [v 1.0.7] 2026-07-24 5:28 pm - Run CRM directly on live Frappe

#### Database Changes

- Database update: Yes.
- Extended tenant-user persistence with encrypted per-user Frappe credentials, authenticated-user
  identity, resolved Employee code, verification state, and verification timestamps.
- Extended Frappe connection persistence with separate encrypted application credentials and a
  compatible migration of the earlier administrator connection credentials.
- Retained former CRM and Frappe-link tables as untouched transition archives; the live CRM runtime
  no longer reads from or writes to them.

#### App Codebase Changes

- Cut CRM over to a live server-side Frappe gateway for enquiry list, get, create, update, delete,
  assignment, schedules, and Enquiry Message child-row operations without pull/push synchronization.
- Reused verified encrypted per-user API tokens and signed-session Employee mappings without
  repeating connection verification on every CRM transaction.
- Normalized Frappe rich-text headings and child messages to readable plain text at the integration
  boundary while preserving existing child-row identities during updates.
- Loaded enquiry activity directly from Frappe versions, view logs, and edit logs, including
  Messages child-row additions, removals, and field changes without local activity persistence.
- Refined CRM list, upsert, show, comments/replies, filters, columns, responsive layout, navigation,
  permissions, protected-system-user editing, and Employee-code capture.
- Added focused Frappe live-gateway and tenant-user administration E2E coverage and updated the
  tenant-isolation and repository-inventory documentation.
- Bumped repository version to 1.0.7.

## v-1.0.6

### [v 1.0.6] 2026-07-24 10:34 am - Expand CRM workspace and harden Frappe synchronization

#### Database Changes

- Database update: Yes.
- Added forward CRM migrations for enquiry subjects, creator-aware comments and replies, and
  cascade-owned email, call, task, note, attachment, and activity child tables.
- Added tenant-user migrations for encrypted per-user Frappe API credentials, authenticated-user
  identity, verification state, and verification timestamps.
- Extended Frappe connection persistence with separate encrypted application credentials and a
  compatible migration of the earlier administrator connection credentials.

#### App Codebase Changes

- Expanded the CRM desk with assigned, created, and unassigned enquiry scopes; filters, configurable
  columns, compact responsive tables, full enquiry upserts, and the full-width enquiry show
  workspace with comments, replies, communication tabs, properties, schedules, and next-record
  navigation.
- Added persisted CRM conversation and activity operations with creator-aware edit/delete rules,
  reply grouping, rich-text composition, due-date presentation, subject fallback, and per-enquiry
  resynchronization controls.
- Hardened Frappe integration with encrypted per-user authentication, one-time verification state,
  application-key settings, Frappe user preview/import, directional enquiry sync, live lifecycle
  create/update/delete, required Employee mapping, and clearer upstream validation errors.
- Synchronized CRM as the tenant default landing app across Platform, Core Default Company, and
  tenant app connections, while keeping the Application desk restricted to tenant administrators.
- Refined the TechMedia public site, navigation, branding, authentication defaults, and application
  menus for the computer hardware, wholesale, retail, and LogicX product direction.
- Added focused CRM, Frappe, tenant-access, and landing-state E2E coverage plus updated architecture,
  tenant isolation, migration, and project inventory documentation.
- Bumped repository version to 1.0.6.

## v-1.0.5

### [v 1.0.5] 2026-07-23 11:11 am - Add CRM and Frappe tenant workflows

#### Database Changes

- Database update: Yes.
- Added module-owned tenant migrations and seeds for CRM enquiries/schedules and encrypted Frappe
  connection settings, plus the forward Queue Manager backend and delivery metadata update.
- Updated tenant access and role seed contracts in their owners; existing tenant databases require
  the ordered forward migrations and repeatable seeds before enabling the new apps.

#### App Codebase Changes

- Added the independently owned CRM API/Web workflow with tenant-aware enquiry lifecycle,
  scheduling, permissions, and navigation.
- Added the Frappe connection API/Web module with encrypted credentials, fixed contracts, protected
  permissions, and reusable server-side connection access without returning secrets to browsers.
- Integrated durable database and BullMQ/Redis Queue V2 backends, tenant administration updates,
  application registration, refreshed public tenant pages, and updated operational documentation.
- Bumped repository version to 1.0.5.

## v-1.0.4

### [v 1.0.4] 2026-07-22 11:19 pm - Align shared bottom-right notifications

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Aligned the TechMedia release with the shared UI-owned Sonner notification boundary.
- Verified that TechMedia modules publish to the common bottom-right toaster without owning a
  competing Sonner runtime.
- Bumped repository version to 1.0.4.

## v-1.0.3

### [v 1.0.3] 2026-07-22 11:03 pm - Move Platform runtime under src

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Moved the Platform API and Web workspaces from `apps/platform` to `src/platform` and removed the
  obsolete `apps` source boundary.
- Rewired npm workspaces, database commands, development preflight, storage paths, boundary and
  lifecycle checks, E2E imports, product-stack impact detection, and container entrypoints for the
  new source layout.
- Changed generated runtime output from `dist/apps/platform` to `dist/platform` and updated the
  production API and Web container paths.
- Updated the active architecture, deployment, API, migration, and repository inventory guidance
  to make `src/platform` the authoritative TechMedia composition root.
- Bumped repository version to 1.0.3.

## v-1.0.2

### [v 1.0.2] 2026-07-22 9:46 pm - Enforce application-only container deployment boundaries

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Added mandatory Tech Media container-agent rules with VPS prerequisites, application-only
  ownership, forbidden destructive operations, and required smoke verification.
- Changed Tech Media setup to require the existing external CODEXSUN network and healthy shared
  MariaDB/Redis/Media containers instead of creating shared infrastructure.
- Added deployment guards that keep database fresh/reset and live-restore controls disabled during
  normal rollout.
- Aligned package, workspace, container build, image, and deployment defaults to version 1.0.2.

## v-1.0.1

### [v 1.0.1] 2026-07-22 9:18 pm - Finalize standalone TechMedia application and deployment

#### Database Changes

- Database update: Yes.
- Added module-owned Platform master and tenant-runtime migrations with explicit composition order
  for the independently deployed TechMedia application.
- Added repeatable Platform, tenant, permission, application-access, and default
  `app.techmedia.in` tenant seeds with isolated tenant database provisioning.

#### App Codebase Changes

- Added the TechMedia Platform API and Web composition using only Framework, UI, Core, and
  TechMedia-owned Platform modules.
- Added standalone source builds, Compose installation, Traefik routing, shared MariaDB/Redis/media
  integration, persistent storage, health checks, and production smoke verification.
- Added repository Assist guidance, environment contracts, module/database boundary gates,
  release tooling, and standalone VPS installation documentation.
- Aligned package, workspace, container image, and deployment defaults to version 1.0.1.

## v-1.0.0

### [v 1.0.0] 2026-07-22 - Initialize TechMedia release tooling

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Initialized the TechMedia repository at version 1.0.0.
- Added repository-owned version display, validation, patch bump, changelog, commit, and push tooling.
- Added `version:bump`, `version-bump`, and `github:now` root commands.
