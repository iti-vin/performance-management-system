# Handoff: KPI company scope, and the SQL script of slice 5

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-company-scope-and-nul-all-routes.md`. Its open item about the KPI routes is closed here.

## State

| Item                                                     | State                                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| KPI goal template routes ignore the company (CWE-639)    | Fixed, tests only. For review by the owner of the module                               |
| Global NUL check in the live app                         | Seen: `/reviews?q=%00` answered with the unavailable notice before the web fix. A read |
| A stale link with a NUL character in `q` or `department` | The web drops the value: both query fields use `storableTextSchema`. Tests only        |
| SQL script of slice 5                                    | Written. The user runs it. Not run                                                     |
| Slice 5 API and screens                                  | Not started: they wait for the script                                                  |
| Phase 3 and later                                        | Not started                                                                            |

Verified on 2026-11-26 after the last change: `pnpm test` (shared-types 133, backend 581 in 28 files, web 800 in 66 files), `pnpm --filter @pms/database test` (19), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass.

## Red and green runs

| Part            | Command                                     | Red                  | Green                       |
| --------------- | ------------------------------------------- | -------------------- | --------------------------- |
| KPI scope       | `pnpm --filter @pms/backend test kpi-goals` | 7 failed, 88 passed  | 581 in the full backend run |
| Query texts     | `pnpm --filter @pms/shared-types test`      | 1 failed, 132 passed | 133                         |
| Slice 5 columns | `pnpm --filter @pms/database test`          | 1 failed, 18 passed  | 19                          |

After `generate`, two shared tests and the web typecheck failed because the cycle responses took the new columns. The responses now omit them, and the row test carries them.

## Live check

Administrator, local, reads only, after both scope fixes: the KPI list (9 rows) and one KPI details page, the behavioral list (3 rows) and one details page, and `/reviews?q=%00` (the normal list, 10 rows) all loaded.

## The script

`packages/database/migrations/2026-11-26-slice-5-cycle-and-accomplishment-fields.sql` adds `pms.cycles.description`, `pms.cycles.accomplishment_deadline`, and `pms.accomplishment_actuals.remarks`, all nullable. Its check query expects three rows with `YES`. The database of the other developer needs it too. The backend maps none of the columns yet, so it runs before or after the script.

## Changes for the owners

| File                                     | Change                                                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kpi-goals.service.ts`                   | `list`, `getById`, `update`, `publish`, `createVersion`, and `archive` read inside the company of the account; another company answers 404. `list` passes the company as `$1` |
| `kpi-goals.controller.ts` and both specs | Pass the user id                                                                                                                                                              |

## Open

1. Phase 3, then slice 5 screens, phases 5, 6, 4, 7, "Assessment Details", and a final `security-auditor` pass (order in the previous handoff).
2. Phase 3 traps to settle before code: how a reopened downstream review is kept from being submitted before the earlier stage; refuse reopen and extension once `finalized_at` is set; an extension also moves `assignments.deadline`; the routes are nouns.
3. When slice 5 maps the columns, remove `cycleResponseSchema` in `review-cycle.schema.ts`.
4. Phase 7 needs its own schema script after its design.
5. The check queries of the earlier demos are not run.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-26-kpi-company-scope-and-slice-5-script.md.
Say whether I ran the slice 5 script. Build phase 3 test first, with the advisor.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
