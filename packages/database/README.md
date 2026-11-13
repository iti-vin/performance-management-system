# PostgreSQL schema and seed

The module SQL follows the workflow model in [Database Design](../../docs/database-design.md) and [Database Schema](../../docs/database-schema.md). The [Workspace Blueprint](../../docs/workspace-blueprint.md) records the open ownership decision between these SQL files and the backend TypeORM entities.

## Layout

- `schema.sql` creates the PMS schema and lists the files in `schema/` in foreign-key dependency order. Edit the owning module file for table and constraint changes.
- `seed.sql` lists the matching development fixture files under `seeds/`. Fixtures use stable identifiers and omit login accounts.
- `init-db.mjs` creates the target database if needed and applies schema and seed. The shared row generator reads the same schema module list.
- `reference/identity.sql` is a reference draft for the public identity schema. The package initializer skips it.

## Workflow ownership

| PRD workflow                                  | SQL module                                                               | What it owns                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| KPI and behavioral templates (4–5)            | `kpi-goals.sql`, `behavioral-assessments.sql`                            | Template versions and the configuration that reviews freeze   |
| Review cycle (6)                              | `review-cycles.sql`                                                      | Schedule, component weights, participants, and stages         |
| KPI accomplishments (7)                       | `kpi-accomplishments.sql`                                                | One current actual per indicator and the correction history   |
| Evaluator work (8)                            | `evaluator-assignments.sql`                                              | Assignments, stage references, and response versions          |
| Results (9)                                   | `evaluation-results.sql`                                                 | Frozen evidence, scores, finalization, and release            |
| Directory and manager changes (10, 14)        | `identity-and-directory.sql`, `employees.sql`, `manager-assignments.sql` | Directory records and effective-dated reporting changes       |
| 202 Files and PIP (11–12)                     | `202-files.sql`, `pip.sql`                                               | Notices, receipts, plans, weekly work, and assessment history |
| Notifications, goals, and audit (2.7, 13, 15) | `notifications.sql`, `operational-goals.sql`, `audit.sql`                | Messages, milestones, progress history, and audit evidence    |

API requests follow the shared contracts. Services enforce role and company scope, stage readiness, schedule eligibility, and cross-record workflow rules. SQL enforces keys and row-level invariants. For example, result release needs a finalization timestamp and the cycle component weights must total 100 percent.

## Apply to an isolated development database

Set the PostgreSQL connection variables, including an explicit `POSTGRES_DB` for the development target. The initializer applies the development fixtures automatically.

```sh
pnpm --filter @pms/database db:init
```

To run the files with psql, connect to an existing development database and use these commands from the repository root.

```sh
psql -v ON_ERROR_STOP=1 -f packages/database/schema.sql
psql -v ON_ERROR_STOP=1 -f packages/database/seed.sql
```

Use `pnpm --filter @pms/database test` to verify the module layout and `pnpm --filter @pms/shared-types generate:check` to check generated row types.

## Existing databases and known differences

Each entry point runs in its own transaction. `CREATE TABLE IF NOT EXISTS` skips existing tables. Use explicit migrations to change existing columns, constraints, or indexes. Keep demo fixtures in an isolated database because their fixed IDs can overlap with existing rows.

The logical docs describe UUID directory keys. The current SQL uses bigint keys for companies, departments, positions, and the employee record, with a nullable unique employee GUID for workflow references. Confirm the intended mapping with the backend owner before migrating existing data.

The NestJS backend currently uses TypeORM synchronization on its main connection. Its user entity expects a bigint ID, employee and role IDs, and `password_hash`. The standalone `schema/users.sql` defines the legacy UUID-based shape with `password`. Use the standalone bootstrap for domain fixtures until the team reconciles the public identity schema and migration ownership. Audit history immutability and additional foreign-key indexes also need production verification.
