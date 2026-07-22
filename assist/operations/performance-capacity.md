# Performance And Capacity

## Purpose

TECHMEDIA must stay fast and predictable as tenants grow.

Performance is a product feature for billing, POS, inventory, accounting, reports, and sync.

## Performance Targets

Initial targets should be defined per workflow:

- Login.
- Dashboard load.
- Table list load.
- Search.
- Invoice save.
- POS bill save.
- Voucher posting.
- Report generation.
- Offline sync batch.
- Integration submission.

Targets can become stricter for enterprise tenants.

## Capacity Planning

Plan for growth in:

- Tenants.
- Users.
- Branches.
- Items.
- Invoices.
- Vouchers.
- Stock movements.
- Files.
- Queue jobs.
- Sync records.
- Integration calls.
- AI conversations.

## Performance Rules

- Use pagination for large lists.
- Add indexes for common filters.
- Avoid loading heavy reports during normal page load.
- Use background jobs for exports.
- Cache dashboard summaries where useful.
- Keep API payloads focused.
- Avoid N+1 data access patterns.
- Measure before large optimization work.
- Import TECHMEDIA UI through its public component, layout, and workspace subpaths in normal
  application routes. Reserve the root `@codexsun/ui` barrel for intentionally comprehensive
  surfaces such as the design-system catalog.
- Keep stable third-party packages in the owning web app's Vite dependency-optimization list and
  keep linked TECHMEDIA workspace packages outside that list so their source remains live for HMR.
- Warm the web entry, router, application shell, and primary login route during development.
- Keep automatic route-level code splitting unless a measured production trace proves a manual
  chunk boundary is better.

## Enterprise Load Testing

Load tests should cover:

- High-volume invoice creation.
- POS billing bursts.
- Stock movement volume.
- Voucher posting.
- Queue processing.
- Large report generation.
- Offline sync after long disconnection.
