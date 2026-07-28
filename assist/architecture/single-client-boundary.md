# Single-Client Boundary

TechMedia has one application identity, one authenticated user population, and one database.
Requests derive authorization only from the signed token and persisted role assignments. There is
no customer selection header, domain resolver, database registry, database-per-customer routing,
or parallel administrator surface.

Any future request to introduce those concerns requires a separate architecture decision and must
not be implemented as an incremental shortcut inside the current modules.
