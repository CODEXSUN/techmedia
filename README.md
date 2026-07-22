# TechMedia

The TechMedia application and orchestration repository.

Standalone container install: `bash install.sh`. See `.container/README.md` for owned ports,
volumes, default tenant data, and production routing.

This project plays the same role as a Laravel application: it installs the framework and selected application packages, provides deployment configuration, builds the composed stack, and starts the runtime. Business implementation stays in its owning package.

## Repository guidance

Read `assist/AGENT-GUIDE.md` before changing this repository. The current TechMedia repository
workspace map, ownership boundaries, migration/seed order, environment contract, versioning,
and release workflow are documented under `assist/`.

`devkit` is a standalone developer application and is not part of the Platform runtime stack.

## Installed stack

- `@codexsun/framework`
- `@codexsun/ui`
- `@codexsun/core`
  TechMedia composes only `framework + ui + core + platform`. Billing, Mail, Ecommerce, and Sites
  are intentionally not installed in this sibling application.

## Development

```sh
npm install
npm run setup
npm run dev
```

The repositories must be sibling folders under the same parent directory. `npm run setup` installs each local package serially, and the lockfiles preserve the resolved development graph. No package is fetched from a registry during local composition.

The default development runtime is:

- API: `http://127.0.0.1:7050`
- Web: `http://127.0.0.1:7060`

Platform is the only runtime application. Framework, UI, and Core are linked sibling packages
compiled before Platform.

Use `npm run dev:api` or `npm run dev:web` to start one side only. Ports are deployment configuration and can be changed through environment variables without changing application packages.

## Verification

```sh
npm run build
npm run check
npm run test:product-stacks
npm run test:e2e:composed-runtime
```

Repository release helpers are `npm run version:show`, `npm run check:versions`,
`npm run version:bump -- --dry-run`, the equivalent `npm run version-bump -- --dry-run`, and
`npm run github:now -- --dry-run`.
