# Handoff: slice 5, cycle description, accomplishment deadline, and indicator remarks

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-phase-3-extension-and-reopening.md`.

## State

| Item                                                                                           | State                                                                      |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Cycle description and accomplishment deadline: contract, API, wizard, Cycle Details, extension | Built, tests only                                                          |
| Remarks of each indicator: contract, API, versions, Goals record and history                   | Built, tests only                                                          |
| First submission closes at the accomplishment deadline (Acc-006)                               | Built, tests only                                                          |
| Live check of slice 5                                                                          | Not run                                                                    |
| SQL for phase 7 (`2026-11-26-phase-7-peer-evaluators.sql`)                                     | Written and tested. The user runs it. Not run. No backend code maps it yet |

Verified after the last change: `pnpm test` (shared-types 144, backend 661 in 28 files, web 848 in 66 files), `pnpm --filter @pms/database test` (20), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass.

## Red and green runs

| Part              | Command                                                                       | Red                   | Green            |
| ----------------- | ----------------------------------------------------------------------------- | --------------------- | ---------------- |
| Peer table script | `pnpm --filter @pms/database test`                                            | 1 failed, 19 passed   | 20               |
| Contracts         | `pnpm --filter @pms/shared-types test`                                        | 7 failed, 137 passed  | 144              |
| Backend           | `pnpm --filter @pms/backend test review-cycle accomplishment cycle-readiness` | 18 failed, 419 passed | full backend 661 |
| Web               | `pnpm --filter @pms/web test`                                                 | 20 failed, 828 passed | 848              |

The test "a returned record stays open" passed before its code. Removing the draft condition of the rule made it fail.

## Rules and decisions

| Rule                                                                                                                   | Reason                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| The accomplishment deadline is optional. None means no extra gate                                                      | Saved cycles have none                                                     |
| It falls after the evaluation period in Manila, and not after the verification deadline                                | A report is submitted after the period (Acc-002) and a manager verifies it |
| After it, a draft is read only and cannot be submitted. A returned record stays open through the verification deadline | Acc-006. This corrects the note "shown, not a gate" of the earlier plan    |
| An extension moves it only for a cycle that has one                                                                    | A new deadline would close open work                                       |
| `accomplishmentDeadlineProblem` in `shared-types/src/rules/cycle-dates.ts`                                             | One rule for the schema, the API, and readiness                            |
| Remarks are optional, at most 2000 characters, and are also stored in `actuals_json` of each version                   | History keeps what was sent                                                |

## For the other developer

Run `2026-11-26-slice-5-cycle-and-accomplishment-fields.sql` before this backend starts. It now maps `cycles.description`, `cycles.accomplishment_deadline`, and `accomplishment_actuals.remarks`.

## Open

1. Phase 5, then phases 6, 4, 7, "Assessment Details", and the final security review.
2. Live check of slice 5: reads, and one draft save with a description if the user approves.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-26-slice-5-cycle-details-and-remarks.md.
Build every open phase test first, with the advisor. Do not stop to ask about decisions.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
