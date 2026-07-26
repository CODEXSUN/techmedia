# TMApp Container Deployment Rules

Read this file, `.container/README.md`, and `.container/deploy-log.md` before any
TechMedia Docker, migration, setup, update, or VPS action.

## Strict ownership

- TMApp owns only `tmapp-api`, `tmapp-web`, its one-shot migration job, TMApp
  images, and `TMAPP_DATA_VOLUME`.
- The CODEXSUN repository owns shared `cxapp-mariadb`, `cxapp-redis`,
  `cxapp-media`, `cxapp-cloudflared`, their volumes, backend `cxapp-network`,
  and public `cxapp-edge`.
- TechMedia may create and migrate only its owned master and tenant databases
  inside shared MariaDB.
- A TMApp command must never create, stop, rebuild, rename, remove, or prune
  shared infrastructure.

Shared identities are read from the protected CXApp deployment environment.
Do not hardcode them in application logic. Legacy `codexsun-*` infrastructure
names may remain on an older host and are accepted only through that protected
environment, not as TMApp defaults.

## Approved commands

```bash
bash setup.sh
bash update.sh
```

For local development worktrees:

```bash
bash setup.sh --local-source --yes
bash update.sh --local-source --yes
```

The first question authorizes or skips Git checking. When approved, normal VPS
use synchronizes `techmedia`, `framework`, `ui`, and `core` from their public
`main` branches. When declined, current checkouts are used unchanged. Dirty
worktrees stop an approved Git update. `--yes` never discards changes;
`--discard-local-changes` requires deliberate operator use.

## Required gates

Before migrations:

1. Docker Engine and Compose v2 are available.
2. All four mapped repositories are present and, when Git checking was
   authorized, synchronized.
3. The protected CXApp infrastructure environment exists.
4. Shared network, MariaDB, Redis, and Media are healthy.
5. `TECHMEDIA_VERIFIED_BACKUP_ID` identifies a verified backup, or setup has
   recorded a new empty-database marker after proving the database is absent.
6. Fresh/reset/live-restore flags remain disabled.

After rollout:

1. Run `.container/scripts/smoke-test.sh`.
2. Prove shared container, mount, and network identities are unchanged.
3. Record commands, revisions, migrations, images, health results, warnings,
   bugs, and blockers in `.container/deploy-log.md`.

Never use `down -v`, broad container removal, volume/network/system prune,
database drop/fresh, or live restore from this repository.

## Naming boundary

TMApp is the Docker deployment identity. TechMedia remains the product,
repository/package identity, domain, default tenant, and owned database prefix.
Do not mechanically rename those product/data contracts.
