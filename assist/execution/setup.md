# TechMedia TMApp Deployment Setup

Last reviewed: 2026-07-25.

TMApp is the TechMedia application-only deployment boundary:

- `@codexsun/framework`
- `@codexsun/ui`
- Core API/Web
- TechMedia Platform API/Web, including CRM and Frappe modules

Shared MariaDB, Redis, Media, `cxapp-cloudflared`, their volumes, backend
network, and edge network are owned by the CODEXSUN repository. TMApp discovers
them through the protected CXApp environment and never changes their lifecycle.

## Install

```bash
bash setup.sh
```

The installer first asks whether Git repositories may be checked and updated.
Answer no to use the current checkout. When approved, it synchronizes
`techmedia`, `framework`, `ui`, and `core`; it then validates
shared prerequisites and the backup/empty-database marker, builds TMApp API/Web,
applies forward owner-ordered migrations, starts only TMApp, and smoke-tests.

For an intentional local worktree test:

```bash
bash setup.sh --local-source --yes
```

## Update

```bash
bash update.sh
```

The updater builds replacements before stopping the application, runs the
one-shot migration service from the same immutable API image, replaces only
`tmapp-api` and `tmapp-web`, and verifies that shared containers, mounts,
network, and TMApp storage identities did not change.

The commands never run database drop/fresh, `down -v`, Docker prune, or shared
infrastructure Compose operations.

Exact commands, ports, compatibility behavior, and troubleshooting live in
`.container/README.md`. Every real deployment is recorded newest-first in
`.container/deploy-log.md`.
