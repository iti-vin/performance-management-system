# Workspace Blueprint

How the repository is split, who owns each part, how it builds, and how it is released.
Written against the `monorepo-architecture` skill. A change to any rule here needs a
review from the owner team.

## Boundaries

Owner of every path: **PMS HR Software Team** (Hersvin Fred Labastida, Miguel Enrique
Dasalla). `.github/CODEOWNERS` routes reviews to the owners listed there.

| Workspace               | Package name        | Public surface                        | May import          | Must not import                 |
| ----------------------- | ------------------- | ------------------------------------- | ------------------- | ------------------------------- |
| `web/`                  | `@pms/web`          | None. It is an app.                   | `@pms/shared-types` | `@pms/backend`, `@pms/database` |
| `backend/`              | `@pms/backend`      | HTTP API under `/auth`, and so forth. | `@pms/shared-types` | `@pms/web`                      |
| `packages/shared-types` | `@pms/shared-types` | The root export in `src/index.ts`.    | `zod` only          | Any other `@pms/*` package      |
| `packages/database`     | `@pms/database`     | `schema.sql`, `seed.sql`, `db:init`.  | `pg` only           | Any other `@pms/*` package      |

Rules that hold for every workspace:

- Import a workspace package by its name and from its root: `@pms/shared-types`, never
  `@pms/shared-types/dist/...` and never a relative path into another workspace.
- `shared-types` reads from `dist/`. After you change `packages/shared-types/src`, run
  `pnpm build:packages`.

Enforced by lint, so a violation fails CI:

| Rule                                       | Where it runs                       |
| ------------------------------------------ | ----------------------------------- |
| `web` imports `@pms/shared-types` only     | `web/eslint.config.mjs`             |
| `backend` does not import `@pms/web`       | `backend/oxlint.json` (`pnpm lint`) |
| `shared-types` imports no `@pms/*` package | root `eslint.config.mjs`            |

### Schema ownership

**Decision (assumed, confirm with the backend developer):** The SQL modules listed in
`packages/database/schema.sql` are the source of truth for tables and columns.
`@pms/shared-types` generates row schemas from those modules
(`pnpm --filter @pms/shared-types generate`), and CI fails when the
generated files are out of date. The backend entities (TypeORM) follow the schema. They do
not define it.

Open item: the backend defines the same tables a second time. Its main PostgreSQL connection sets `synchronize: true` with TypeORM entities for `employees`, `users`, the KPI goal templates, and the behavioral assessment templates, so the app creates tables from the entities. `schema.sql` is a separate definition of those tables. The backend also reads the HRDotNet SQL Server database (`mssql`, read only). Until the entities follow `schema.sql`, or the decision here changes, the two can drift.

## Builds

- **Affected only.** CI runs each check with `pnpm --filter "...[<base>]"`: the packages that
  changed and the packages that depend on them. It checks every package when the base is
  unknown or a root file changed (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  `tsconfig.base.json`, `eslint.config.mjs`, `.github/`).
- **Order.** `shared-types` builds first. `pnpm -r` runs the scripts in dependency order.
  `pnpm install` also builds `packages/*` (root `postinstall`).
- **Measured cold build times:** `shared-types` 1 s, `backend` 5 s, `web` 9 s. A full check
  is cheap today.
- **Test gate.** CI runs the `shared-types` and `web` tests. The `backend` tests and the
  `database` test fail today and are left out, with the reason in `ci.yml`. Add them when
  they pass.

## Releases

- **Apps are not versioned.** `web` and `backend` are private and deploy from a commit or a
  tag on `main`. Their `version` field carries no meaning.
- **Packages are internal.** `shared-types` and `database` are used through
  `workspace:*` and are never published to npm, so they need no independent version and no
  changelog tool.
- **Changelog.** Pull request titles and tags on `main`.

Revisit when something is published to npm. Then use independent versions with changesets
for the published package only.

## Shared tool versions

`pnpm-workspace.yaml` holds a `catalog:` for tools that more than one package uses:
`eslint`, `prettier`, `typescript`, `zod`. A package writes `"catalog:"` instead of a range.

`backend` keeps its own `typescript` (6.x), `vitest` (4.x), `@types/node` (24) and `axios`
until the backend team moves them. `web` uses `vitest` 5.x and `@types/node` 20.

## Deferred, with the trigger

| Item                                 | Trigger                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| Remote build cache (Turborepo or Nx) | The full CI run takes more than about 5 minutes.          |
| One TypeScript and Vitest major      | The backend team is ready to align with the web versions. |
| Backend and database tests in CI     | Both pass.                                                |
| Pull request template                | The team wants a review checklist.                        |
