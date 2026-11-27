# Handoff: phase 5, finalization, scoring, release, and results

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-slice-5-cycle-details-and-remarks.md`.

## State

| Item                                                                                  | State                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /review-cycles/:id/finalization`, `POST :id/release`, `GET :id/results`         | Built, tests only                                                                                                                                     |
| `GET /results`, `GET /results/:participantId`                                         | Built, tests only                                                                                                                                     |
| Cycle Details, Results tab: Finalize, Release, list                                   | Built, tests only                                                                                                                                     |
| `/reviews/results` and `/reviews/results/[participant-id]`, "View Results" on Reviews | Built, tests only                                                                                                                                     |
| Schema                                                                                | None. `pms.evaluation_snapshots` already exists in the schema file. Not checked on the local database: the check query of the phase 7 script lists it |
| Live check                                                                            | Not run. Finalize and release cannot be undone: each needs the approval of the user                                                                   |

Verified after the last change: `pnpm test` (shared-types 146, backend 706 in 31 files, web 878 in 68 files), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass.

## Red and green runs

| Part            | Command                                                                | Red                  | Green            |
| --------------- | ---------------------------------------------------------------------- | -------------------- | ---------------- |
| Scoring         | `pnpm --filter @pms/backend test scoring`                              | 22 failed            | 22               |
| Result contract | `pnpm --filter @pms/shared-types test`                                 | 1 failed, 145 passed | 146              |
| Results service | `pnpm --filter @pms/backend test results.service`                      | 20 failed            | 20               |
| Routes          | `pnpm --filter @pms/backend test controller`                           | 4 failed, 70 passed  | full backend 706 |
| Web             | `pnpm --filter @pms/web test result cycle-details manage-review-cycle` | 29 failed, 99 passed | full web 878     |

Mutation checks, each made a test fail: the score range of the contract, and the company filter of `ResultsService.get`.

## Scoring rules as built (PRD Res-004 to Res-008)

| Component                | Rule                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Indicator                | The scoring scale when it scores, otherwise the target-met or below-target score, by direction. No actual, or no target and no scoring scale: no score |
| Goals                    | Weighted by indicator weight. One indicator with no score leaves the component without a score                                                         |
| Behavioral               | Mean of every observed rating of the latest submitted version of every assessment, self included                                                       |
| Anonymous (peer, upward) | Pooled with no name. Below the anonymity minimum, or with none set: no rating, no text, and not in the score                                           |
| Overall                  | Components by cycle weight. A weight of 0 leaves a component out. An applicable component with no score leaves no overall score. Never zero            |
| Rounding                 | Stored unrounded. Pages round half up to two decimals                                                                                                  |

**HR has not approved this policy (Res-009). It is a production gate.**

## Access as built (Res-003)

| Reader           | Sees                                                                               |
| ---------------- | ---------------------------------------------------------------------------------- |
| HR administrator | Every result of the company from finalization on, but their own only after release |
| Employee         | Their own, after release                                                           |
| Manager          | Their current applied team, after release                                          |
| Anyone else      | 404                                                                                |

Finalize and release check the administrator role in the service too.

## Open

1. Phases 6, 4, 7, "Assessment Details", and the final security review.
2. Live check: finalization of "ZZ demo three roles" needs its reopened HR review submitted first (a write), then finalize and release (both permanent).
3. Not built: export of results, the PIP referral of a result below target (another module), and a notification.
4. The scores of a cycle that the old system finalized are not read: only `evaluation_snapshots` rows appear.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-26-phase-5-finalize-score-release.md.
Build the open phases test first, with the advisor. Do not stop to ask about decisions.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
