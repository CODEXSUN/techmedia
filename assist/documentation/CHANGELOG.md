# Changelog

## Version State

Current version: 1.0.1

Release tag: v-1.0.1

Changelog label: v 1.0.1

This changelog starts with TechMedia as an independent application composed from
`framework + ui + core + platform`. Source-project release history is not TechMedia release history.

New entries must keep database-facing work and application code work separate.

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
