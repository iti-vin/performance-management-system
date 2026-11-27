# Handoff: phase 6 (component choice) and phase 4 (scheduling and activation)

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-phase-5-finalize-score-release.md`.

## State

| Item                                                                                              | State                                                                                                                     |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Wizard: choose Goals, Behavioral, or both. Weights 50/50 or 100                                   | Built, tests only                                                                                                         |
| Readiness asks for no template of a component with weight 0. Launch opens no report without goals | Built, tests only                                                                                                         |
| `POST /review-cycles/:id/schedule`, `DELETE :id/schedule`                                         | Built, tests only                                                                                                         |
| Server timer that activates due cycles, every 60 seconds                                          | Built, tests only. It runs in the local backend as soon as it reloads. No cycle was Scheduled then (read in the register) |
| Wizard "Schedule Cycle"; Cycle Details of a scheduled cycle with its problems and "Back to Draft" | Built, tests only                                                                                                         |
| Live check of both phases                                                                         | Not run                                                                                                                   |

Verified after the last change: `pnpm test` (shared-types 146, backend 726 in 32 files, web 906 in 69 files), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass. The last small change (optional schedule action) was checked with the web cycle tests, lint, and typecheck.

## Red and green runs

| Part                | Command                                                    | Red                   | Green            |
| ------------------- | ---------------------------------------------------------- | --------------------- | ---------------- |
| Components, backend | `pnpm --filter @pms/backend test cycle-readiness`          | 3 failed, 26 passed   | full backend 709 |
| Components, web     | `pnpm --filter @pms/web test cycle`                        | 13 failed, 256 passed | full web 892     |
| Activation service  | `pnpm --filter @pms/backend test cycle-activation`         | 15 failed, 1 passed   | 16               |
| Schedule routes     | `pnpm --filter @pms/backend test review-cycles.controller` | 2 failed, 12 passed   | full backend 726 |
| Schedule web        | `pnpm --filter @pms/web test cycle manage-review-cycle`    | 10 failed, 273 passed | full web 906     |

The test "waits for its day" passed before its code. Removing the day checks made it fail.

## Decisions and reasons

| Decision                                                                                                               | Reason                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| A scheduled cycle activates on the Manila day of its assessment start. A start of today or earlier cannot be scheduled | The cycle already says when its first stage opens. No new field                     |
| A timer in a provider, no new dependency                                                                               | `AGENTS.md` asks before a new dependency                                            |
| Scheduling freezes the current published versions. Activation never moves to another version                           | Cyc-006, Cyc-008                                                                    |
| A due cycle with a problem stays Scheduled. One `activation_blocked` audit row for each new set of problems            | Cyc-008, and no row each minute                                                     |
| Repair is "Back to Draft", then edit, then schedule or launch again                                                    | A scheduled configuration is frozen (6.3)                                           |
| A component with weight 0 still has stages. Its reviews show no question                                               | The stages order the work. A goals-only manager review still waits for verification |
| `cycle-work.ts` holds what launch, schedule, and activation share                                                      | One copy of the assignment rules                                                    |

## Limits

- The timer runs in each backend process. With two processes, the row lock keeps one activation.
- A cycle with goals only gives empty review forms. HR approval of that flow is open.

## Open

1. Phase 7 (peer and upward). It needs `2026-11-26-phase-7-peer-evaluators.sql`, which the user runs.
2. "Assessment Details", then the final security review.
3. Live checks of slice 5, and of phases 5, 6, and 4. Each write needs the approval of the user.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-26-phase-6-and-4-components-and-scheduling.md.
Build the open phases test first, with the advisor. Do not stop to ask about decisions.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
