# Changelog

## Version State

Current version: 1.0.6

Release tag: v-1.0.6

Changelog label: v 1.0.6

This changelog starts with TechMedia as an independent application composed from
`framework + ui + core + platform`. Source-project release history is not TechMedia release history.

New entries must keep database-facing work and application code work separate.

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
