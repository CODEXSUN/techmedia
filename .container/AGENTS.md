# Tech Media Container Deployment Rules

Every human or automated agent must read this file and `.container/README.md` before running Tech
Media Docker, migration, install, update, or VPS commands.

## Ownership boundary

- Tech Media owns only `techmedia-api`, `techmedia-web`, its migration job, Tech Media images,
  `techmedia-platform-data`, and its owned master/tenant databases.
- `codexsun-mariadb`, `codexsun-redis`, `codexsun-media`, their volumes, Traefik, and
  `codexsun-network` are shared infrastructure owned by the CODEXSUN repository.
- Tech Media connects to the existing shared layer. It must never create, stop, rebuild, remove,
  or prune that layer.

## Prerequisites

Before deployment, verify Docker Engine and Compose v2, sibling `framework`, `ui`, and `core`
repositories, a protected CODEXSUN infrastructure environment file, the existing
`codexsun-network`, and healthy shared MariaDB/Redis/Media containers. On a VPS, also verify DNS for
`app.techmedia.in`, Traefik, TCP 80/443, and a current database backup or an explicitly recorded
empty-install marker.

Keep `TECHMEDIA_DB_FRESH_ON_START=0`, `TECHMEDIA_ALLOW_PRODUCTION_DB_RESET=0`, and live restore
disabled during normal deployment. If a shared prerequisite is absent or unhealthy, stop and fix
it from the CODEXSUN infrastructure owner.

## Approved workflow

The installer builds and replaces only the Tech Media application services, runs Tech Media-owned
forward migrations/seeds, connects them to the existing network, and runs the stack smoke test:

```bash
bash install.sh
```

## Prohibited operations

Never use `down -v`, broad `docker rm`, `docker volume rm`, `docker network rm`, `docker system
prune`, volume prune, database drop/fresh commands, live restore, or CODEXSUN infrastructure
Compose files during a Tech Media deployment. Never overwrite protected deployment environment
files with examples.

After rollout, run `.container/smoke-test.sh` and confirm the shared infrastructure container IDs
and volumes are unchanged.
