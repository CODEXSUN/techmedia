# Project Inventory

## Applications

- `src/platform/api`: Fastify API and composition root.
- `src/platform/web`: React application with one login and one desk.
- `src/mobile`: Ionic React and Capacitor mobile-first client. It owns mobile UI composition and
  uses shared TechMedia authentication and API contracts through native runtime adapters.
- `KMP-Mobile`: preserved Kotlin Multiplatform TechMe client for future native-only shared logic.

## API Modules

- `user`
- `role`
- `permission`
- `user-role`
- `role-permission`
- `frappe`
- `notification`
- `crm`
- `hr`
- `estimate`
- `quotation`
- `ishop`
- `honey`
- `messaging`

Honey includes the system-administrator global availability control for TEMA chat and mascot
surfaces, plus separate web and mobile pet visibility controls. The shared responsive side menu
contains the current device's personal pet toggle.

## Shared Dependencies

- `packages/framework`: repository-owned backend infrastructure and public module contracts.
- `packages/ui`: repository-owned React components, layouts, and workspace primitives.

No parent-folder or sibling product repository is part of the TechMedia install, build, or runtime.

## Generated Layout

- `node_modules`: the only dependency installation directory.
- `dist/packages/framework`: compiled Framework runtime.
- `dist/platform/api`: compiled API runtime.
- `dist/platform/web`: production web bundle.
- `dist/mobile/web`: Capacitor web bundle copied into the native Android and iOS projects.

Workspace-local `node_modules`, `dist`, and `dist-types` directories are prohibited.
