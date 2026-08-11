# TechMedia Assist

TechMedia is a standalone, single-client application. Its runtime contains:

- Identity: users, roles, permissions, user-role assignments, and role-permission assignments.
- Notifications: recipient inbox and durable outbox delivery events for internal workspace alerts.
- Settings: the `.env` Frappe connection and per-user Frappe credentials stored on users.
- CRM: live enquiry workflows backed by Frappe. CRM owns no local business tables.
- Estimate: live Estimate workflows backed by Frappe. Estimate owns no local business tables.
- Quotation: live Quotation workflows linked to enquiries and backed by Frappe. Quotation owns no
  local business tables.

There is one MariaDB database selected by `DB_NAME`, containing Identity and notification-delivery records. Do not add customer registries, database
routers, domain selectors, subscription layers, application activation, or alternate admin desks.

Read `AGENT-GUIDE.md`, then the relevant architecture and governance rules before changing code.
