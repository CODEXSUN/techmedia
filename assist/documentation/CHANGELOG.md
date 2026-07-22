# Changelog

## Version State

Current version: 1.0.3

Release tag: v-1.0.3

Changelog label: v 1.0.3

This changelog starts with TechMedia as an independent application composed from
`framework + ui + core + platform`. Source-project release history is not TechMedia release history.

New entries must keep database-facing work and application code work separate.

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
