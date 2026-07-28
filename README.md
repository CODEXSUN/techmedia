# TechMedia

TechMedia is a standalone, single-client CRM application connected to live Frappe.

The runtime contains:

- Identity: users, roles, permissions, user roles, and role permissions.
- Settings: one `.env` Frappe connection plus per-user Frappe credentials on user records.
- CRM: live Frappe enquiry workflows with no local CRM business database.
- Estimate: live Frappe Estimate list, create, and update workflows with no local business database.

TechMedia uses one MariaDB database configured by `DB_NAME`; only Identity is persisted locally.
Settings, CRM, and Estimate own no tables. The app has one `/login` route and one `/app` desk, and depends only
on the public Framework and UI sibling packages.

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

## Verification

```sh
npm run check
npm run build
npm run dependencies:check
```

Read `assist/AGENT-GUIDE.md` before changing architecture or module ownership.
