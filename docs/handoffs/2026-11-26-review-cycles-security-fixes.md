# Handoff: Review Cycles, the five security findings fixed, and the non-admin live check

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed.

## Objective

Fix the five low findings of the module security review, and verify live what an account that is not an administrator can reach.

Read first: `2026-11-26-review-cycles-all-reviews-web.md` (the findings and the web page) and `2026-11-26-review-cycles-all-reviews-backend.md` (the API contract).

## State

| Item                                             | State                                               |
| ------------------------------------------------ | --------------------------------------------------- |
| Findings 1 to 5                                  | Fixed, each with its test first                     |
| Non-admin live check, `user` and `manager` roles | Passed: no row leaks, every cycle route answers 403 |
| A non-admin who sees their own assignments, live | Not run: neither account has an assignment          |
| Database                                         | No schema change and no SQL                         |

Verified on 2026-11-26, from the repository root:

| Command                                                                              | Result                                                                      |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `pnpm test`                                                                          | shared-types 111 pass, backend 376 pass (24 files), web 524 pass (50 files) |
| `pnpm --filter @pms/database test`                                                   | 15 pass                                                                     |
| `pnpm lint`                                                                          | no findings                                                                 |
| `pnpm typecheck` and `pnpm --filter @pms/backend exec tsc --noEmit -p tsconfig.json` | no errors                                                                   |

## The fixes

| #   | Change                                                                                                                                                                                                                                                                | Red                                   | Green          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------- |
| 1   | `MAX_CYCLE_STAGES` is 10, in the shared schema and in the DTO                                                                                                                                                                                                         | shared 1 fail; contract spec 1 failed | 111 pass; pass |
| 2   | `create` and `update` refuse with 400 a stage evaluator who is not an employee of the company, before any write. One query for all named people, none when no stage names one                                                                                         | service spec 3 failed                 | pass           |
| 3   | `create`, `update`, `cancel`, and `launch` refuse with 403 an account whose employee has no GUID. The audit row of a save keeps the dates, the stages, and the participants with their frozen versions; `update` reads the old ones under the lock, before the delete | service spec 6 failed                 | pass           |
| 4   | `dayOf` gives the day in Asia/Manila: the manager in force and the activation day follow it                                                                                                                                                                           | service spec 1 failed                 | pass           |
| 5   | The saved notice reads own keys only (`Object.hasOwn`)                                                                                                                                                                                                                | web 3 failed                          | 11 pass        |

The run for findings 1 and 2 was `4 failed, 161 passed`; the run for findings 3 and 4 was `7 failed, 58 passed`.

One test of finding 2 passed before the code existed, so it was proven by a mutation and restored: without the early return, "asks no employee when no stage names a person" failed. "asks the company once for each person" failed in the red run only because no query existed, so its check of duplicates was proven the same way: without the `Set`, it failed.

## Decisions

| Decision                                                                                                                 | Reason                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 10 stages                                                                                                                | Above the three that the wizard sends and the five stage types, and small enough to bound a launch     |
| The save check is company membership only. Eligibility (active, administrator, not a participant) stays a readiness rule | A draft can be saved while HR decides                                                                  |
| An account with no employee GUID can read cycles and cannot change them                                                  | PRD 6.7 asks for the actor of every change. The KPI and behavioral modules still accept an empty actor |
| The audit row of a launch keeps counts, as before                                                                        | The finding was about a save. The assignments of a launch are rows of their own                        |

## Live check

Local database, both servers of the developer. The two accounts that are not administrators were signed in with sign-in data that the user gave in chat. No credential is stored in the repository by this work.

API, with the roles `USER` and `MANAGER`:

| Request                                                                                          | Result for both                                                                     |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `GET /reviews`                                                                                   | 200, 0 rows. The administrator list has no active row where either person evaluates |
| `cycleState=completed`, `cycleState=cancelled`, the seed `cycleId`, a search for two other names | 0 rows each                                                                         |
| `state=done`                                                                                     | 400                                                                                 |
| `GET /review-cycles`, `/options`, `/:id`, `/:id/readiness`                                       | 403                                                                                 |
| `POST /review-cycles` with `{}`, `PUT`, `launch`, `cancellation` on an id that does not exist    | 403                                                                                 |

Browser, with each of the two accounts:

| Check                     | Result                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Navigation                | `USER`: Dashboard, Goals, Reviews, 202 Files, PIP. `MANAGER`: also My Team and Reports   |
| `/reviews`                | The explanation line, Search, Stage, and Status only. Empty message                      |
| A cycle filter in the URL | Dropped: no cycle control, and no alert                                                  |
| `/review-cycles`          | "HR access required", no row. The edit URL of a cycle shows the same (checked as `USER`) |
| Console                   | No error                                                                                 |

## File inventory

All uncommitted.

| File                                                                                                 | Change           |
| ---------------------------------------------------------------------------------------------------- | ---------------- |
| `packages/shared-types/src/dtos/review-cycle.schema.ts`, `test/review-cycle.test.mjs`                | Stage maximum    |
| `backend/src/modules/review-cycles/dtos/create-review-cycle.dto.ts`, `review-cycle-contract.spec.ts` | Stage maximum    |
| `backend/src/modules/review-cycles/services/review-cycles.service.ts` and `.spec.ts`                 | Findings 2 and 3 |
| `backend/src/modules/review-cycles/services/cycle-facts.ts`                                          | Finding 4        |
| `web/src/features/review-cycles/components/review-cycle-saved-notice.tsx` and its test               | Finding 5        |

## What older handoffs got wrong

- `2026-11-26-review-cycles-all-reviews-web.md` lists the five findings and the non-admin check as open. They are closed as above.
- The 3A, 3B, and 4A handoffs say that "today" is the UTC day. It is the Manila day now.

## Open items

| Item                                                                                                                                                                 | Trigger or owner                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A non-admin who sees their own assignments, live. Proven by unit tests only                                                                                          | Not possible with the present data: the employees of `user` and `manager` have no position (read from `GET /review-cycles/options`), so neither can be a participant, and neither is the applied manager of one. Needs a position or a manager assignment for such an account, by SQL that the user runs, then a launch that the user approves |
| Findings 1 to 4 are proven by tests, not by a live request                                                                                                           | A live request would write if a fix were missing                                                                                                                                                                                                                                                                                               |
| `/review-cycles` shows "Create cycle" to an account that is not an administrator. The button leads to the same forbidden notice, and the API refuses                 | A change of the page header, when the user asks                                                                                                                                                                                                                                                                                                |
| Company isolation with a second company, rate limits                                                                                                                 | Not verified                                                                                                                                                                                                                                                                                                                                   |
| A template archived between the readiness read and the commit of a launch                                                                                            | Templates are not locked                                                                                                                                                                                                                                                                                                                       |
| 200 percent browser zoom, `next build`, cancel of an active cycle in the web, scheduled activation, peer and upward stages, result visibility, the assessment module | As in the 4B handoff                                                                                                                                                                                                                                                                                                                           |
| The migration `2026-11-25-cycle-stage-evaluator.sql` on the database of the other developer                                                                          | Before their backend starts                                                                                                                                                                                                                                                                                                                    |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-26-review-cycles-security-fixes.md.
The module is built and its findings are fixed. Open: the live check of a non-admin who
has assignments (it needs a write that the user approves) and the items of that table.
Commit nothing until the user asks. The user runs all SQL.
```
