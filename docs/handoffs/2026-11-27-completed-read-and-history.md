# Handoff: reading completed work, and earlier versions of a review

Date of this state: 2026-11-27. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-27-rate-limit.md` and `docs/reviews/2026-11-27-review-modules-prd-check-and-plan.md`. This closes gaps G7 and G8 of that plan.

## State

| Item                                                             | State                                               |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| G7: a participant reads their own work after the cycle completes | Built, tested, checked live as employee and manager |
| G8: earlier versions on a review                                 | Built, tested, checked live as HR administrator     |
| Database change, new route, new dependency                       | None                                                |

Verified after the last change: `pnpm test` (shared-types 151, backend 795 in 35 files, web 927 in 69 files), `pnpm --filter @pms/database test` (20), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass.

## The access rule (G7)

`PARTICIPANT_CYCLE_STATES` in `backend/src/modules/review-cycles/services/viewer.ts` is `active` and `completed`. It is a list of allowed states, so a new state is closed until someone adds it.

| Read                                                  | Who, when the caller is not an HR administrator |
| ----------------------------------------------------- | ----------------------------------------------- |
| `GET /reviews` and `GET /reviews/:id`                 | The evaluator of the assignment                 |
| `GET /accomplishments` and `GET /accomplishments/:id` | The employee, and the manager of today          |

`draft`, `scheduled`, and `cancelled` stay closed to them (PRD 6.3: HR only). Every write keeps its own `active` check: `lockOwnOpenReview`, `lockOwnOpenRecord`, `lockRecordToDecide`, `permissionsOf`, and `canEdit`. The HR administrator path did not change. A completed cycle says "The cycle is completed" on a review and on a KPI record, in place of "not active".

## Earlier versions (G8)

`GET /reviews/:id` answers `history`: the submitted versions other than the one in `response`, newest first, each with its answers, written feedback, time, and the reason HR gave when that version was reopened.

| Reader                                               | `history`                                                                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Evaluator, with a reopened draft                     | Every submitted version                                                                               |
| HR administrator, while the new version is a draft   | Empty: `response` is the last submitted version, and nothing older shows until the draft is submitted |
| HR administrator, after a resubmission               | The older submitted versions                                                                          |
| Anyone but the evaluator, on a peer or upward review | Empty, an HR administrator included (Res-008)                                                         |

The page shows an "Earlier versions" section under the review, each version closed until opened (`web/src/features/evaluations/components/review-history.tsx`, composed in `review-content.tsx`).

## Decisions and reasons

| Decision                                                                              | Reason                                                                                               |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `history` inside the detail, no new route                                             | The service already reads every version. The same gate covers both                                   |
| No actor name on a history entry                                                      | Only the evaluator of the assignment can submit it, and the page names the evaluator                 |
| The reason of version n comes from version n+1                                        | A reopening stores it on the new draft, and a later save or submission keeps it. A test asserts this |
| A prior manager who still holds a completed assignment gets no link to the KPI record | `goals` follows the manager of today (Rev-007: no general team access)                               |

## Red and green runs

| Part        | Command                                                                                             | Red                  | Green                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| G7 backend  | `pnpm --filter @pms/backend test reviews.service review-assessment.service accomplishments.service` | 6 failed, 226 passed | 232, after one older test of the filter options took the completed cycle |
| G7 words    | `pnpm --filter @pms/web test review-list reviews-content review-page`                               | 4 failed, 91 passed  | 95                                                                       |
| G8 contract | `pnpm --filter @pms/shared-types test`                                                              | 2 failed, 149 passed | 151                                                                      |
| G8 backend  | `pnpm --filter @pms/backend test review-assessment`                                                 | 5 failed, 105 passed | 110, after a test used `rating` where the contract says `score`          |
| G8 page     | `pnpm --filter @pms/web test review-page`                                                           | 1 failed, 34 passed  | 35                                                                       |

Some new tests passed at once, because they guard what must stay closed. Each group was proven by a temporary change that made it fail, then the file was restored:

| Temporary change                                    | Failed |
| --------------------------------------------------- | ------ |
| `cancelled` added to the list of states             | 13     |
| `draft` and `scheduled` added to the list           | 2      |
| Review read without the evaluator check             | 5      |
| KPI record read without the owner and manager check | 7      |
| Review writes allowed on a completed cycle          | 2      |
| KPI record writes allowed on a completed cycle      | 1      |
| History without the anonymity check                 | 1      |
| History with drafts                                 | 1      |
| History section without its empty case (web)        | 1      |

After the restore: the three backend specs 237 passed, `review-page` 35 passed. The local backend ran in watch mode during the backend changes, so it served the changed rules for some seconds. Its compiled files were read afterwards and hold the final code.

## Live check

Local app, reads only. No row was written by this work.

| Caller           | Seen                                                                                                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manager          | The review list shows the completed "ZZ demo three roles" review. It opens with no field and no action. The KPI list and record of the report in that cycle open read only. The HR review of the employee answers "Page not found" |
| HR administrator | The HR review shows "Earlier versions" with version 1 and "Reopened by HR: ZZ live check ng reopen"                                                                                                                                |
| Employee         | Own completed self review and KPI record open read only. The HR review about them answers "Page not found"                                                                                                                         |

Not seen live: a cancelled cycle, an anonymous review, a prior manager.

## Security review

A manual review of the changed lines.

| Finding                                                                                                                    | Severity                           | Detail                                                               |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| An HR administrator who is a participant reads the reviews about themselves, now with their earlier versions too (CWE-863) | Medium, older, wider               | `review-assessment.service.ts`, `findVisible` and `get`. Decision D1 |
| A former manager keeps the row of a completed review, which names the department of the subject as it is today             | Low, was already true while Active | `reviews.service.ts`, `subjectFields`                                |
| A new manager reads the completed KPI records of a team member from before their time                                      | To confirm                         | Follows the current-team rule of AUTH-001. Decision D9               |
| Completed work stays readable with no end date                                                                             | To confirm                         | No retention policy exists (G2, COM-007)                             |

No finding in company scope, in the write gates, or in the anonymity of earlier versions. Not checked: a second company live, and two writers at once.

## Files

| File                                                                                            | Change                     |
| ----------------------------------------------------------------------------------------------- | -------------------------- |
| `backend/src/modules/review-cycles/services/viewer.ts`                                          | The list of states         |
| `.../services/reviews.service.ts`, `accomplishments.service.ts`, `review-assessment.service.ts` | Read gates, `history`      |
| `.../services/accomplishment-rules.ts`                                                          | Words of a completed cycle |
| The three service specs                                                                         | New cases                  |
| `packages/shared-types/src/dtos/review-detail.schema.ts` and `test/review-assessment.test.mjs`  | `history`                  |
| `web/src/features/evaluations/components/review-history.tsx`                                    | New                        |
| `web/src/app/(workspace)/reviews/[assignment-id]/review-content.tsx`                            | Shows it                   |
| `web/src/features/review-cycles/components/review-list.tsx`, `review-summary.tsx`               | Words                      |
| Web tests: `review-page`, `review-list`, `reviews-content`, `sample-wording`, `review-response` | Cases and fixtures         |

## Open after this

Decisions for the senior developer: D1 to D8 of the plan file, plus D9 above. Next in the plan: G3, G1, G4, G2, G10, G9, G5, G11, G6. Live checks of the plan file are still open. Nothing is committed.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-27-completed-read-and-history.md.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
