# App Operations

App Operations is the Super Admin runtime-status and application-bundle surface for the composed
Platform application.

## Repository Apps

- Platform: API `7050`, web `7060`.
- Core: composed into the Platform API and Web workspaces as the only business foundation package.
- Billing, Mail, Ecommerce, and Sites: not installed or composed in TechMedia.

Core, Framework, and UI remain foundation packages rather than tenant-selectable applications. The current
App Operations registry therefore exposes only the Platform-owned Application entry.

## Controls

- Refresh probes Platform API and Platform Web and records response time.
- Bundle cards report public-package connection and readiness, not fictional standalone process health.
- Process lifecycle is owned by the root `npm run dev` command or the deployment supervisor.
- The Super Admin screen does not start, stop, restart, or update repository processes.
