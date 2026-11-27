# Handoff: the decisions applied to the review modules

Date of this state: 2026-11-27. Branch `main` at `9f86101`, nothing committed, no pull request (the user asks for both when wanted). Read first: this file, then `2026-11-27-module-final-state.md` for the state of the other modules.

## Before this code runs on another database

Run `packages/database/migrations/2026-11-27-earlier-answers-visibility.sql` after `2026-11-27-result-visibility.sql`. Without the new column, these answer 500: cycle create, edit, and detail; release; result lists and results; and every review read by a person who neither answers nor administers it. It ran once on the local database of the user, with approval: 4 rows unchanged, none with the flag on.

## Objective

Apply the answers of the senior developer and the designer to the review modules. The table of decisions D1 to D12 is in `docs/reviews/2026-11-27-review-modules-prd-check-and-plan.md`.

## State by phase

| Phase                                            | State                         | Verified                                                                                                                                                                                                  |
| ------------------------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Documents and History (D1, D2, D4, D10)        | Done                          | `cycle-history`: 2 failed, then 9 passed                                                                                                                                                                  |
| 2 Deadline rule (D6)                             | Done, draft problem seen live | Red: shared-types 1 failed, backend 2 failed. Guards proven on copies of the source (4 mutants, 1 failed test each). Extension not seen live                                                              |
| 3 Who reads a review (D5)                        | Done, release part seen live  | Red: database 1 failed, backend 13 failed, web 2 failed. 13 guards of the reader rules and the release screen proven on copies of the source. The later reviewer reading earlier answers is not seen live |
| 4 Team Reviews, list scope, department (D3, D11) | Done, seen live               | Red: backend 19 failed, web 9 failed. 11 backend guards and the tab rule proven on copies of the source                                                                                                   |
| 5 Peers who cannot be anonymous (D12)            | Done, chooser seen live       | Red: backend 29 failed (the readiness input changed shape), web 2 failed, shared-types 1 failed. The refusal at launch is not seen live                                                                   |
| 6 Checks                                         | Done                          | See below                                                                                                                                                                                                 |

## Last full run

`pnpm test`: shared-types 156, backend 925 (42 files), web 1002 (80 files). `pnpm --filter @pms/database test`: 22. `pnpm lint`, `pnpm typecheck`, backend `tsc --noEmit`: pass. No changed or new file holds the test password (three older spec files hold it as a fixture and are unchanged).

## Live checks (reads only, local, test accounts)

| Check                                                                   | Seen                                                                                                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Smoke read of every review route, 330 requests as HR, manager, employee | No unexpected answer. No restricted review holds content, no anonymous evaluator is named, no draft of another person is read, every unlisted review answers 404   |
| `ZZ demo three roles` (released, all read)                              | The employee reads the manager and HR reviews about them. The manager reads the self and HR reviews; Team view lists 3                                             |
| `ZZ live peer` (released, employee hidden)                              | The employee reads their self review only; the others are restricted, peers anonymous. The manager reads self and HR; the other peer is restricted                 |
| Manager screen                                                          | Team Reviews tab between My Reviews and Completed                                                                                                                  |
| Employee screen                                                         | No Team tab; `?view=team` in the address is dropped; restricted and anonymous pages show their sentence and no question; no console error                          |
| HR wizard on `ZZ schedule check` (draft)                                | The new checkbox is off for the old draft; Review & Launch shows the D6 problem; the peer list leaves out the manager and the HR administrators. Nothing was saved |

## Decisions made while building

| Decision                                                                                         | Reason                                                                                       |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| A missing or old visibility row means earlier answers stay closed; a new cycle opens them        | A running cycle opens nothing by itself                                                      |
| A release chooses employees and managers only                                                    | The earlier-answers choice is about the running cycle                                        |
| One predicate (`isListed`) scopes the list and the restricted detail                             | The two cannot disagree                                                                      |
| The restricted sentence is "This response is restricted by the review confidentiality settings." | The plan said "restricted until release", which is false for peer reviews and hidden results |
| An anonymous upward row keeps the name "Anonymous direct report"                                 | The existing words of the app                                                                |
| An administrator is not scoped by team                                                           | The administrator reads every review already                                                 |

## Security audit of the new read rules

Run with the `security-auditor` skill, read only. Target: TypeScript, NestJS 12, TypeORM (parameterized queries only), Next.js 16.4. Paths are under `backend/src/modules/review-cycles/services/`. Scope: `viewer.ts`, `review-readers.ts`, `result-readers.ts`, `review-assessment.service.ts`, `reviews.service.ts`, `results.service.ts`, `cycle-history.service.ts`, `cycle-readiness.ts`, `cycle-facts.ts`, the options route (`controllers/review-cycles.controller.ts` 49 and 68-74, admin guard). No manifest, lockfile, CI file, or AI prompt changed. The author of the code ran it; no second reviewer agent ran.

| #   | Issue                                                                                                                                                                                                     | Rating                       | Lines                                                        | Why, and reference                                                            | Recommendation                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | Cycles released before this change now open their reviews, written feedback included, to the employee and the current manager when the stored choice allows it. A cycle with no stored choice allows both | LOW, accepted by D5: confirm | `result-readers.ts` 9-23, `review-readers.ts` 47-48          | A reviewer may have written while only HR could read. CWE-200, OWASP A01:2021 | Confirm. Otherwise open reviews only for cycles released after a chosen date      |
| 2   | A cycle launched earlier keeps a peer who reads the pooled result (`ZZ live peer` has one), and a peer who becomes the manager or an administrator after the launch gains that read                       | LOW                          | `cycle-readiness.ts` 191-209                                 | The check runs at launch and activation only. Res-008, CWE-359                | Accept, or refuse the pooled peer values to a reader who is also one of the peers |
| 3   | The subject and the manager see one row per anonymous reviewer with its state and due date: they learn how many there are and which one is pending. No name, no answer                                    | LOW                          | `reviews.service.ts` 86-109                                  | Timing can narrow who a reviewer is. CWE-200                                  | Accept as in the sample, or show one row per anonymous stage                      |
| 4   | An HR administrator can be an upward evaluator and also read the pooled upward result                                                                                                                     | LOW, open question           | `cycle-readiness.ts` 183-188 (no rule), 196-208 (peers only) | CWE-359                                                                       | Ask: apply the D12 rule to direct reports too                                     |
| 5   | An administrator who takes part sees in History when each anonymous reviewer of them saved and submitted, with no name                                                                                    | LOW, accepted by D1          | `cycle-history.service.ts` 90-109                            | CWE-359                                                                       | None while D1 stands                                                              |

Checked with no finding: the company scope comes from the cycle (`review-assessment.service.ts` 486-488, `reviews.service.ts` 66); a person with no employee ID gets nothing (`reviews.service.ts` 64, `viewer.ts` 33); a restricted row sends nothing of the review (`review-assessment.service.ts` 316); a draft stays with its evaluator, and peer and upward answers too (`review-assessment.service.ts` 325-326 and 517, `review-readers.ts` 45); earlier versions and reopening reasons go to the evaluator and HR only (340-341); a release cannot change the earlier-answers choice (`results.service.ts` 145-147).

Overall risk rating: **LOW**.

## Corrections of older handoffs

`2026-11-27-module-final-state.md` calls the D12 anonymity gap open: new launches refuse it now (finding 2 holds for launched cycles). Its list of open decisions is answered except D7, D8, and D9. The browser of the app is signed in as the test HR administrator, not the employee.

## Dead ends

A shell heredoc removed the backslashes of a test regular expression: write scripts with an editor. Temporary mutants in live source are served by the watched backend: copy the source to `*.spec.ts` names, which the build leaves out.

## Files of this round

| Area         | Files (all uncommitted)                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database     | `migrations/2026-11-27-earlier-answers-visibility.sql` (new), `schema/evaluation-results.sql`, `schema.test.mjs`                                                                                                                                                                                                                                                                                                                  |
| Shared types | `rules/cycle-dates.ts`, `dtos/review-cycle.schema.ts`, `dtos/review-detail.schema.ts` (`isRestricted`), `dtos/review-list.schema.ts` (`team`), generated `rows/`, tests                                                                                                                                                                                                                                                           |
| Backend      | `review-cycles`: `entities/cycle-result-visibility.entity.ts`, `dtos/create-review-cycle.dto.ts`, `services/` `viewer.ts`, `reviews.service.ts`, `review-assessment.service.ts`, `review-readers.ts` (new), `result-readers.ts`, `results.service.ts`, `cycle-history.service.ts`, `cycle-readiness.ts`, `cycle-facts.ts`, `cycle-extension.ts`, `cycle-extension.spec.ts` (new), `review-cycles.service.ts`, `scoring.ts`, specs |
| Web          | `review-cycles`: `anonymous-stages.tsx`, `cycle-stages-step.tsx`, `cycle-details-form.tsx`, `review-list.tsx`, `reviews-content.tsx`, `review-summary.tsx`, `result-reader-choices.ts`, `cycle-draft.ts`, `review-list-params.ts`; `evaluations/components/evaluator-scoring-form.tsx` (`isRestricted`); `reviews/[assignment-id]/review-content.tsx`; tests                                                                      |
| Documents    | the plan file, `system-architecture.md`, this handoff, the handoff index                                                                                                                                                                                                                                                                                                                                                          |

## Open

| Item                                                                                                                                                                           | Waits for                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Findings 1 to 4 of the audit                                                                                                                                                   | The senior developer or the product manager                                                                      |
| D9: a new manager and old KPI records                                                                                                                                          | The product manager                                                                                              |
| D7 notifications, D8 manager assignment                                                                                                                                        | A UI design                                                                                                      |
| Timer activation: `ZZ live ready` Active, `ZZ live blocked` still Scheduled                                                                                                    | 28 November                                                                                                      |
| Live: a new cycle with the new checkbox, a later reviewer reading earlier answers, a launch refused for a barred peer, an extension refused by D6                              | Approval of each write                                                                                           |
| A link from a later reviewer's own page to the earlier review                                                                                                                  | Wanted only if a reviewer who is not the current manager needs it; Team Reviews and the HR list cover the others |
| Upward stage live, a second company, dark theme, zoom, screen reader, two writers at once                                                                                      | A later check                                                                                                    |
| The database of the senior developer: all migration scripts. Review of the template and Goals module changes                                                                   | The senior developer                                                                                             |
| The list of a person who is not an administrator reads every assignment of the active and completed cycles, then filters. Narrow the query when a company has many assignments | A real size problem                                                                                              |
| Commit and pull request                                                                                                                                                        | The user                                                                                                         |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-27-decisions.md.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
