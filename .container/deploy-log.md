# TMApp Deployment Log

## Version state

Current documented release: 1.0.9

This is the append-only operational history for TechMedia TMApp deployments.
It contains no secrets. New entries are inserted above older entries.

## Strict logging policy

Every install, update, migration-only run, failed attempt, rollback, or blocker
must record:

- UTC timestamp, environment, action, and final result;
- repository revisions and source policy;
- commands with secret values omitted;
- backup, migration, image, container, route, and smoke-test evidence;
- proof that shared infrastructure and persistent volume identities remained
  unchanged;
- warnings, bugs, workarounds, blockers, and next improvements.

Historical entries are immutable. Never record passwords, tokens, private
keys, cookies, or full environment files.

## [1.0.9] 2026-07-26 09:16 UTC - TMApp Cloudflare origin contract updated

- Public host is `logicx.tmnext.in`; only `tmapp-web` joins `cxapp-edge`.
- Repository checks and Compose validation passed. No container replacement or
  database migration ran in this pass.
- Source revision was `086a6c6`; dirty local work was preserved.
- Fresh setup can recreate only the configured TMApp master and tenant
  databases after exact confirmation. `cxsun_master_db` and `codexsun_db` are
  hard blocked.
- CXApp MariaDB, Redis, Media, networks, and volumes were not recreated.

## [1.0.9] 2026-07-26 08:35 UTC - Cloudflare edge composition prepared

### Deployment

- Environment: local Windows Docker Desktop workspace.
- Action: remove active Traefik labels, attach only `tmapp-web` to the external
  `cxapp-edge` network, and retain `cxapp-network` for Web-to-API traffic.
- Final result: composition and shell validation passed. No TMApp container was
  running locally, so no application image build, migration, replacement, or
  smoke test was attempted.
- Source policy: current dirty work was preserved; no Git synchronization,
  restore, commit, or push ran.
- Shared infrastructure: MariaDB, Redis, Media, CXApp containers, volumes, and
  the existing backend network were not changed by this repository.

### Evidence

```text
docker compose --env-file .container/deploy.env.example \
  -f .container/tmapp/docker-compose.yml config --format json
bash -n setup.sh update.sh .container/deploy.sh .container/scripts/*.sh
git diff --check -- <Cloudflare edge files>
```

- Effective topology: `tmapp-web` joins `cxapp-edge` and `cxapp-network`;
  `tmapp-api` and storage-init join only `cxapp-network`.
- Public Cloudflare route to configure: `app.techmedia.in` to
  `http://tmapp-web:80`.
- `update.sh` now proves both shared backend and edge network identities remain
  unchanged across a TMApp-only update.
- Blocker: Cloudflare activation requires the CXApp-owned remotely managed
  tunnel and protected token. TechMedia does not own or start that connector.

## [1.0.9] 2026-07-25 16:43 UTC - TMApp standalone install and update verification

### Deployment

- Environment: local Windows Docker Desktop workspace.
- Action: refactor the TechMedia deployment identity to TMApp, install the
  application from this repository, apply forward migrations, then exercise
  the standalone update workflow.
- Final result: passed. `tmapp-api` and `tmapp-web` are healthy on
  `127.0.0.1:18050` and `127.0.0.1:18060`.
- Source policy: `--local-source`; existing dirty application work was
  preserved and no checkout was restored, reset, committed, or pushed.
- Prerequisites: shared MariaDB, Redis, Media, and `cxapp-network` were
  provisioned separately through their CXApp owner for this clean local test.
  No CXApp API or Web application container was installed.

### Repository revisions

| Repository | Revision  | Branch |
| ---------- | --------- | ------ |
| techmedia  | `086a6c6` | main   |
| framework  | `20d1a8b` | main   |
| ui         | `bd89361` | main   |
| core       | `411ff43` | main   |

### Commands executed

```text
bash tm-setup.sh --local-source --yes
bash tm-update.sh --local-source --yes
npm run check
npm run test:product-stacks
npm run dependencies:check
docker compose --env-file .container/deploy.env -f .container/tmapp/docker-compose.yml config --quiet
docker compose --env-file .container/deploy.env.example -f .container/tmapp/docker-compose.yml config --quiet
bash -n <TMApp setup, update, deployment, smoke, source, and entrypoint scripts>
git diff --check
```

### Migration and runtime evidence

- The first install created `techmedia_master` and the default
  `techmedia_tenant_default` database, applied Platform, Core, CRM, and Frappe
  owner migrations in dependency order, and seeded the default `TECHMEDIA`
  tenant.
- The update reran only forward/idempotent migrations before replacing the
  application containers. Both master and tenant migration inventories passed.
- API image:
  `sha256:dd7f2ca6a108c923f3de34fb2cba7e0ff052cbc9bf0d76effa9e9ae81f2a2494`.
- Web image:
  `sha256:ddafb37b25c5d9f87226311a56a9944518a6e8228853c35c19be91c5cf1084d4`.
- Final application containers: `tmapp-api` `c664ed0672ff` and `tmapp-web`
  `df31b21a5271`, both healthy.
- Smoke checks passed for API, Web, authenticated Redis, authenticated
  TechMedia Platform runtime, application registry, master database, and
  tenant database.
- Repository checks passed: text encoding, module boundaries, database
  lifecycle/order, Framework/UI/Core/TechMedia typechecks and lint,
  dependency layout, and all three product-stack contract tests.

### Preservation evidence

- Shared containers retained their exact identities throughout every TMApp
  update: MariaDB `68f8d3196463`, Redis `04c40688153e`, and Media
  `c710ea4f45cf`.
- Shared network identity remained
  `d54f30c927372c634781bf3fed334b1a9f8023d5337abe2a09494673936e31d4`.
- TMApp retained the existing named volume `techmedia-platform-data`; no
  shared or application volume was deleted or recreated during update.
- The TMApp scripts did not build, stop, replace, or remove any CXApp
  application or shared-infrastructure container.

### Bugs, blockers, and next improvements

- Fixed during verification: the migration container printed a false missing
  `.env` advisory even though Compose supplied the complete external
  environment. `CODEXSUN_ALLOW_MISSING_ENV=1` is now set only inside the
  container environment.
- Fixed during verification: the first shared-preservation comparison was
  order-sensitive to Docker mount inspection output. The guard now compares
  sorted container, named-volume, and network identity records and prints a
  diagnostic diff on a real mismatch.
- Non-blocking dependency notices remain: Recharts 2.15.4 is deprecated,
  `msgpackr-extract` has an unapproved optional install script, npm reports
  five high-severity audit findings, and the current npm configuration warns
  that `global-ignore-file` will be unsupported in a future major version.
- No deployment blocker remains.
