# TechMedia TMApp deployment

TMApp is the application-only Docker deployment for TechMedia:

```text
framework + ui + core + TechMedia Platform = TMApp
```

It builds two images, `tmapp-api` and `tmapp-web`. The isolated one-shot
migration service reuses the exact API image, avoiding a duplicate migration
image. BuildKit npm caches make unchanged repeat builds fast without bypassing
source or dependency changes.

## Public commands

```bash
bash setup.sh
bash update.sh
```

`setup.sh`:

1. asks whether Git repositories should be checked and updated;
2. when approved, clones/synchronizes `framework`, `ui`, and `core` beside
   TechMedia; when declined, uses the current checkouts;
3. refuses dirty repositories unless explicitly reviewed for discard;
4. imports shared connection identities and credentials from the protected
   CXApp environment;
5. verifies healthy shared MariaDB, Redis, Media, and network;
6. creates only the TechMedia master database when absent;
7. builds API/Web, applies forward TechMedia migrations, starts TMApp, and
   smoke-tests it.

`update.sh` offers the same optional Git check, builds before stopping the current
application, replaces only TMApp, and proves shared infrastructure identities
and the TMApp volume were preserved.

Neither command installs or changes shared infrastructure.

## Installation

Place the repositories as siblings:

```text
workspace/
  codexsun/
  framework/
  ui/
  core/
  techmedia/
```

The CODEXSUN repository must already have installed healthy shared
infrastructure. Then:

```bash
cd /opt/codexsun/techmedia
bash setup.sh
```

Local development test:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' setup.sh --local-source --yes
& 'C:\Program Files\Git\bin\bash.exe' update.sh --local-source --yes
```

Use `--local-source` only for a deliberate local worktree test. Production must
use synchronized clean sources.

`--skip-git` is an explicit alias for `--local-source`. Git is required only
when the operator approves the Git check/update.

## Command ownership

There are only two public commands: root `setup.sh` and root `update.sh`.
`.container/deploy.sh` is the one internal lifecycle command used for focused
build, migration, status, logs, and application replacement. Other files under
`.container/` are Docker, environment, policy, or service configuration—not
alternative installers.

## Runtime identities

| Owner        | Resources                                                                   |
| ------------ | --------------------------------------------------------------------------- |
| TMApp        | `tmapp-api`, `tmapp-web`, migration job, `tmapp-data`                       |
| Shared CXApp | MariaDB, Redis, Media, Cloudflare Tunnel, backend/edge networks and volumes |

Defaults:

- API host port: `18050`
- Web host port: `18060`
- Public host: `logicx.tmnext.in`
- Master database: `techmedia_master`
- Default tenant database: `techmedia_tenant_default`

Existing installations may retain `techmedia-platform-data` through their
protected environment. It is reused in place and never silently copied or
renamed.

## Internal commands

```bash
bash .container/deploy.sh build
bash .container/deploy.sh migrate
bash .container/deploy.sh up
bash .container/deploy.sh --reinstall
bash .container/deploy.sh ps
bash .container/deploy.sh logs
bash .container/scripts/smoke-test.sh
```

`down` removes only TMApp containers and never includes `-v`.

## Names that intentionally remain TechMedia

The product brand, Git repository, `@techmedia/*` packages,
`logicx.tmnext.in`, tenant seed, database names, and application environment
keys consumed by released source code remain TechMedia contracts. TMApp names
only the deployable Docker application.

Cloudflare routing is owned by CXApp infrastructure. The remotely managed
Tunnel maps `logicx.tmnext.in` to `http://tmapp-web:80` on `cxapp-edge`.
TMApp API remains backend-only on `cxapp-network`.
