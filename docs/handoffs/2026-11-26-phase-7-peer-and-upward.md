# Handoff: phase 7, peer and upward assessment

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-phase-6-and-4-components-and-scheduling.md`.

## State

| Item                                                  | State                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| SQL script `2026-11-26-phase-7-peer-evaluators.sql`   | The user runs it. Not run when this was written              |
| Peers of a participant: contract, API, wizard         | Built, tests only                                            |
| Peer and upward stages: readiness, launch, activation | Built, tests only                                            |
| Anonymity of names and answers (Res-008)              | Built, tests only. Pooling and the minimum came with phase 5 |
| Live check                                            | Not run. It needs the script first                           |

**Until the script runs, a cycle with a peer stage fails with a server error.** A cycle without a peer stage never reads the new table.

Verified after the last change: `pnpm test` (shared-types 148, backend 741 in 33 files, web 915 in 69 files), `pnpm --filter @pms/database test` (20), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass.

## Red and green runs

| Part     | Command                                                            | Red                   | Green            |
| -------- | ------------------------------------------------------------------ | --------------------- | ---------------- |
| Contract | `pnpm --filter @pms/shared-types test`                             | 2 failed, 146 passed  | 148              |
| Backend  | `pnpm --filter @pms/backend test review cycle`                     | 13 failed, 504 passed | full backend 741 |
| Web      | `pnpm --filter @pms/web test cycle-draft cycle-stages review-page` | 12 failed, 76 passed  | full web 915     |

## Rules as built

| Rule              | Behavior                                                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stages            | At most one peer and one upward stage. The wizard orders self, manager, peer, upward, HR                                                                                                           |
| Anonymity minimum | 2 to 10, required with either stage                                                                                                                                                                |
| Peers             | HR names them for each participant: active employees of the company, not the participant, at most 20. Each participant needs at least the minimum                                                  |
| Upward evaluators | The direct reports of the day. A participant with fewer than the minimum gets no upward assignment. At least one participant must have enough                                                      |
| Opening           | The next stage opens when every assignment of the stage before is submitted                                                                                                                        |
| Names             | Only the evaluator reads their own name. Lists, details, and progress show "Anonymous peer" or "Anonymous direct report", to an administrator too. The search finds no anonymous evaluator by name |
| Answers           | Only the evaluator reads them. Others see them pooled in the result, from the minimum on                                                                                                           |

## Limits that HR should know

- One peer who never submits holds the later stages of that participant, because stages run in order. HR extends the deadline; there is no way yet to remove one assignment.
- A group can fall below the minimum when peers leave the company before the launch: readiness then blocks the launch.
- The administrator who set up the cycle knows who the peers are. The answers are not linked to them anywhere in the screens or routes. The database holds the link.
- The audit rows hold the actor of each submission. No route returns them.

## For the other developer

Run the phase 7 script. `gatherReadiness`, `buildAssignments`, and the services changed signature: see `cycle-facts.ts` and `cycle-work.ts`.

## Open

1. "Assessment Details", then the final security review.
2. Live checks. Each write needs the approval of the user.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-26-phase-7-peer-and-upward.md.
Say whether I ran the phase 7 script. Build the open items test first, with the advisor.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
