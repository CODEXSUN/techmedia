# Project Inventory

## Applications

- `src/platform/api`: Fastify API and composition root.
- `src/platform/web`: React application with one login and one desk.

## API Modules

- `user`
- `role`
- `permission`
- `user-role`
- `role-permission`
- `frappe`
- `notification`
- `crm`
- `estimate`
- `quotation`
- `ishop`
- `honey`

## Shared Dependencies

- `packages/framework`: repository-owned backend infrastructure and public module contracts.
- `packages/ui`: repository-owned React components, layouts, and workspace primitives.

No parent-folder or sibling product repository is part of the TechMedia install, build, or runtime.

## Generated Layout

- `node_modules`: the only dependency installation directory.
- `dist/packages/framework`: compiled Framework runtime.
- `dist/platform/api`: compiled API runtime.
- `dist/platform/web`: production web bundle.

Workspace-local `node_modules`, `dist`, and `dist-types` directories are prohibited.
