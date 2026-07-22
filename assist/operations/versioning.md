# Repository Versioning And Git Workflow

## Independent Repository Policy

Each TECHMEDIA Git repository owns its package/workspace version, lockfile, changelog, commit, tag,
and push operation. Repositories may share the same baseline version, but a version bump in one
repository must not silently mutate a sibling repository.

The `codexsun` lockfile records the composed compatibility baseline. A Platform release verifies
the exact sibling versions resolved by that composition.

## Version Format

Packages use `1.0.<reference>`. Repository tags use `v-1.0.<reference>`. The patch component is
the default change reference.

Every repository keeps one active release history at
`assist/documentation/CHANGELOG.md` with this Version State:

```text
Current version: 1.0.42
Release tag: v-1.0.42
Changelog label: v 1.0.42
```

Historical entries are immutable.

## Standalone Commands

Every non-Devkit repository exposes:

- `npm run version:show`
- `npm run check:versions`
- `npm run version:bump -- --dry-run --title "<title>" --no-database-update`
- `npm run version-bump -- --dry-run --title "<title>" --no-database-update` (alias)
- `npm run version:bump -- --title "<title>" --database-update`
- `npm run version:bump -- --title "<title>" --no-database-update`
- `npm run github:now -- --dry-run`
- `npm run github:now`

Version bumps occur only when explicitly requested. The command updates the repository root,
its npm workspaces, its lockfile, the changelog Version State, and a new version section.

## Changelog Entry Format

```text
## v-1.0.43

### [v 1.0.43] YYYY-MM-DD h:mm am - Title

#### Database Changes

- Database update: Yes or No.

#### App Codebase Changes

- Concrete change.
```

Do not create an Unreleased section. Record schema, migration, seed, tenant-provisioning, and data
compatibility changes under Database Changes. Record code, UI, tooling, documentation, tests,
workers, events, and deployment changes under App Codebase Changes.

## Commit Message

Commit subjects use:

```text
#<two-or-more digits> - <message>
```

Examples:

- `#00 - Initialize repository`
- `#42 - Correct migration ownership documentation`

`github:now` derives its default message from the current-version changelog entry and validates
this format. It shows repository, version, subject, and changed files before mutation.

After confirmation it runs the repository-local equivalent of:

```text
git pull --rebase --autostash
git add -A
git commit -m "<subject>"
git push
```

Use `--dry-run` first. `--yes` is allowed only after the caller has reviewed that dry run.

## Release Verification

Before a push or tag, run the repository's format, lint, typecheck, build, test, dependency, and
version checks. Changes to public contracts also require composed Platform boundary and product-stack
verification. Database changes require migration preflight and applicable restored-dump/E2E checks.
