# TechMedia

TechMedia is a standalone, single-client CRM application connected to live Frappe. It is a
self-contained npm monorepo: the application, Framework runtime, and UI design system all live in
this repository.

The runtime contains:

- Identity: users, roles, permissions, user roles, and role permissions.
- Settings: one `.env` Frappe connection plus per-user Frappe credentials on user records.
- CRM: live Frappe enquiry workflows with no local CRM business database.
- Estimate: live Frappe Estimate list, create, and update workflows with no local business database.

TechMedia uses one MariaDB database configured by `DB_NAME`; only Identity is persisted locally.
Settings, CRM, and Estimate own no tables. The app has one `/login` route and one `/app` desk.
Application code consumes only the public exports of the internal `packages/framework` and
`packages/ui` workspaces; no parent-folder package is required for install, development, build, or
deployment.

The workspace uses only the repository-root `node_modules` and `dist` directories. Framework
runtime output is written to `dist/packages/framework`; API and web output is written to
`dist/platform/api` and `dist/platform/web`.

## Development

Copy `.env.example` to `.env`, fill the database, JWT, encryption, administrator, and Frappe
settings, then run:

```sh
npm install
npm run dev
```

Default endpoints:

- API: `http://127.0.0.1:7050`
- Web: `http://127.0.0.1:7060`

Database commands:

```sh
npm run db:migrate
npm run db:seed
npm run db:migrations:list
```

`db:drop` and `dbmigrate:fresh` require the explicit reset guard documented in `.env.example`.

## Local Docker deployment

Run the interactive installer from the repository root:

```sh
./setup.sh
```

On Windows, use Git Bash explicitly when `bash` resolves to WSL but no Linux distribution is
installed:

```powershell
& "C:\Program Files\Git\bin\bash.exe" setup.sh
```

The installer reviews the Docker resource names, bind address, host ports, MariaDB database and
user, protected administrator, public application URLs, and Frappe connection. Existing secrets
can be kept without displaying them. Before building, setup detects unavailable API or web host
ports and asks for replacements. It can either create a dedicated TechMedia network and MariaDB
volume or reuse an explicitly named running MariaDB container on an existing Docker network.
Reused networks are marked external, and setup never disconnects, stops, removes, or recreates
those existing infrastructure resources.

After deployment:

- Web: the configured `TECHMEDIA_BIND_ADDRESS` and `TECHMEDIA_WEB_HOST_PORT`
- API health: `/health` on the configured API host endpoint
- Runtime configuration: `.container/.env`
- Docker/deployment configuration: `.container/deploy.env`

## Verification

```sh
npm run check
npm run build
npm run dependencies:check
npm run test:e2e:runtime
```

The runtime smoke test uses the configured MariaDB and administrator credentials, starts the built
API twice, and verifies health, anonymous-session rejection, login, authenticated session recovery,
logout, and restart persistence.

Read `assist/AGENT-GUIDE.md` before changing architecture or module ownership.
