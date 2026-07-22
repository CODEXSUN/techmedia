# TechMedia Deployment Model

## Deployment Goal

TechMedia runs as a modular monolith with one Platform API, one Platform Web application, optional
background workers, tenant databases, file storage, and shared package boundaries.

## Current Composition

```text
framework + ui + core + platform
```

Billing, Mail, Ecommerce, and Sites are not installed in the current TechMedia runtime.

Platform supplies identity, tenant, permission, activation, audit, queue, storage, and operational
services. Core supplies tenant common, organisation, and master modules.

## Runtime Boundary

The TechMedia development command owns:

- Platform API: `7050`
- Platform Web: `7060`

Shared repositories are packages composed into those two processes. They must not introduce
standalone listeners. Browser traffic uses the stable same-origin paths `/api/platform` and
`/api/core`. No Billing or Mail proxy exists.

## Releases

The TechMedia lockfile records the verified sibling-package baseline. Product changes preserve
module and database ownership while deployment replaces the composed Platform API and Platform Web
services declared by `tools/product-stack-contract.mjs`.

Production rollout uses readiness and health gates with an inactive/blue-green slot or rolling
replacement. Traffic moves only after both services are healthy. Database changes use
expand-contract migration discipline with an explicit rollback window.

## Generated Output

Each Git repository owns only its root `dist/`. TechMedia build output belongs under:

```text
techmedia/dist/
```

Build and deployment workflows must not create workspace-local `dist`, `dist-types`, or
`node_modules` directories.

## Hosted Runtime

The hosted baseline serves `dist/apps/platform/web` as static files and runs the compiled Platform
API behind a reverse proxy. Production must not depend on Vite or `npm run dev`.

Platform Web embeds `/api/platform` as its browser API base. `PLATFORM_WEB_ORIGIN` defines the
canonical CORS origin for direct API clients. Wildcard credentialed CORS is prohibited.

## Container Rules

- Containers are replaceable and reproducible.
- Runtime configuration comes from environment variables or secure configuration.
- Secrets are never stored in images.
- Logs are structured and health checks are available.
- Workers and API share the same public domain contracts.
- Local and cloud environments use matching service responsibilities.

## Repository-owned container stack

Techmedia owns `.container/` and `install.sh`. Its independent stack publishes API host port
`18050` and Web host port `18060`. MariaDB, Redis, and media are provided once by CODEXSUN on
`codexsun-network`. The Web
router owns `app.techmedia.in`. The default tenant seeder provisions the matching tenant and
database; Billing, Mail, CMS, and Sites do not participate in this lifecycle.

## Tenant Deployment Options

- Shared application containers with dedicated tenant databases.
- Dedicated application and database containers for selected tenants.
- Hybrid local desktop plus cloud synchronization.
- On-premise private deployment when required.

Scale module and database design first, then workers and read-heavy workloads. Split services only
after module boundaries and operational pressure are proven.
