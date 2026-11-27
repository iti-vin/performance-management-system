# Handoff: align with the sample frontend, slice 4: layout

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-sample-alignment-slice-3-and-cycle-details.md`, `2026-11-26-reviews-phase-2-demo-and-security.md`, and `docs/reviews/2026-11-26-sample-frontend-alignment.md`.

## Objective

The goal record, one review, and the cycle register look like the sample frontend: the indicator table, the rating buttons and the completion panel, the heading with the template card, and the progress bar.

## State

| Item                                                                                                             | State                                                                  |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Goal record: header "position · template · vN", indicator table, scoring criteria, buttons at the end            | Done, tested. A verified report read live                              |
| One review: heading with "name · position", numbered sections, question counts, rating buttons, completion panel | Done, tested. Only a submitted review read live                        |
| One review: template card (contract, API, web)                                                                   | Done, tested, read live                                                |
| Cycle register: progress bar                                                                                     | Done, tested, read live                                                |
| The editable rating buttons, completion panel, and indicator fields in a real browser                            | Not seen: no open review or draft report is left for the test accounts |
| Slice 5 (schema)                                                                                                 | Not started                                                            |

Verified on 2026-11-26, from the repository root, after the last change: `pnpm test` (shared-types 130, backend 558 in 27 files, web 784 in 65 files), `pnpm --filter @pms/database test` (18), `pnpm lint`, `pnpm typecheck`, and `pnpm --filter @pms/backend exec tsc --noEmit -p tsconfig.json`: all pass. The last edit after the full test run was one test fixture that the typecheck found; the web tests, lint, and typecheck ran again.

## Red and green runs

| Part               | Command                                                          | Red                                          | Green                                                                                       |
| ------------------ | ---------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Target rule        | `pnpm --filter @pms/web test target-result`                      | 13 failed (stub)                             | 13 passed                                                                                   |
| Goal record        | `pnpm --filter @pms/web test accomplishment goals target-result` | 17 failed, 21 passed (record and page files) | 91 passed in 6 files, after two old checks moved from the removed cards to the table fields |
| Review layout      | `pnpm --filter @pms/web test evaluator-scoring-form review-page` | 16 failed, 25 passed                         | 41 passed; web 778 passed                                                                   |
| Progress bar       | `pnpm --filter @pms/web test review-cycles-table`                | 3 failed, 10 passed                          | 31 passed with `list-filters`                                                               |
| Template: contract | `pnpm --filter @pms/shared-types test`                           | 2 failed, 128 passed                         | 130 passed after `pnpm build:packages`                                                      |
| Template: backend  | `pnpm --filter @pms/backend test review-assessment`              | 4 failed, 52 passed                          | 558 passed in the full backend run                                                          |
| Template: web      | `pnpm --filter @pms/web test review-page`                        | 2 failed, 19 passed                          | 784 passed in the full web run                                                              |

Two tests passed before their code and were proven by a mutation, then restored: "leaves a position that the cycle did not freeze out" (1 failed with the filter removed) and "shows no template card for a review with no template" (1 failed with the card always drawn).

The rating questions changed from a list to a radio group, so the form tests that looked for a list now look for radios. That was the red run of the new behavior.

## What the change adds

### Contract and API

| Part                          | Detail                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `reviewDetailSchema.template` | New, nullable: name, description, and version of the behavioral template whose version the cycle froze |
| `GET /reviews/:id`            | Returns it. The template is read inside the company of the viewer. No new route and no schema change   |

The name and the description are those of the template today: a version keeps neither. The KPI template name of a goal record follows the same rule.

### Web

| File                                                         | Role                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------- |
| `features/position-goals/services/target-result.ts`          | "Target met" or "Below target", in the direction of the indicator    |
| `features/position-goals/components/indicator-table.tsx`     | One table for the fields and for the words                           |
| `features/position-goals/components/indicator-criteria.tsx`  | The frozen criteria and matrix in a closed block                     |
| `features/evaluations/components/rating-field.tsx`           | One rating as a radio group, with a clear button for an optional one |
| `features/evaluations/components/review-completion.tsx`      | Required answered, a bar, and the actions                            |
| `features/review-cycles/components/review-template-card.tsx` | The template card                                                    |
| `components/ui/radio-group.tsx`                              | New `RadioGroupCard`: a radio that is the whole button               |

## Decisions

| Decision                                                                         | Reason                                                                                        |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The criteria sit under the table in a closed block                               | PRD Acc-001: the employee sees the matrix, direction, and target. The sample table shows less |
| No "Remarks" column and no "Accomplishment Deadline"                             | No column stores them (slice 5). The report keeps its one remark                              |
| A draft and a returned report show no comparison with the target                 | Nothing is submitted. Another account gets no value of them at all                            |
| A submitted value reads "Target met · Unverified" or "Below target · Unverified" | The sample. Verification is evidence and does not make a target met (PRD 7.6)                 |
| No pager on the indicator table                                                  | A pager would hide a field that has a problem                                                 |
| The completion panel counts required questions only, Not Observed among them     | The sample                                                                                    |
| The review summary keeps "Reviewer"                                              | Recorded in slice 2                                                                           |
| The note about Not Observed shows only when a question offers it                 | It would say nothing otherwise                                                                |

## Live check

Local, real data, the administrator account, light theme, 1440 by 900 and 375 by 812. Reads only. Seen: the submitted HR review (heading, template card "Quarterly Performance v2", numbered sections, rating words); the verified demo report (header, table, "Target met" and "Below target", closed criteria, history); the progress bar of the register. At 375 pixels both pages are not wider than the screen, and the indicator table scrolls in its own region.

During the check, two pages answered 500 with "d is not defined" at `web/src/utils/api-error-text.ts` line 3, in an overlay marked "stale". The call stack named `features/review-cycles/services/cycle-request.ts`, which no longer exists and which nothing imports (phase 2B moved it to `services/api-send.ts`). The file on disk is correct; its last change is 15:32:29 on the same day, and the cause of that change is unverified. Both pages loaded after a reload. If it returns, restart the web dev server.

Not checked: the editable controls in a browser, the keyboard on the real rating buttons, the dark theme, 200% zoom, a screen reader, and whether the sticky completion panel clears the header while a long review scrolls.

## Live check of the editable controls: started, stopped at the launch

The user approved four writes: save a new draft cycle, launch it, one review draft save, and one goals draft save as `user`. No submission.

| Write                   | State                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Save the draft cycle | Done: `ZZ slice 4 live check`, id `f67833ad-5445-42a9-b3c8-55d26b204024`. One participant (the `user` employee), the settings of the phase 0 demo, readiness empty |
| 2. Launch               | Not done. The permission mode of the agent tool refused the click on the confirmation. The user can press "Launch Cycle"                                           |
| 3. Review draft save    | Waits for the launch                                                                                                                                               |
| 4. Goals draft save     | Waits for the launch                                                                                                                                               |

Seen on the way: the KPI template list of the wizard shows two templates with the same name, "Software Engineer Performance Goals", and no version, so HR cannot tell them apart. The one used is `429c9433-66c2-48e0-880e-f627b509dc99`.

## Open

1. Finish writes 2 to 4 and look at the editable controls.
2. The sample has a second review screen, "Assessment Details", with three stage cards and a "Goals Performance" card. Not built.
3. After a submission the record shows "Submitted. It waits for your manager." twice.
4. Run the check query of the demo handoff. Fix its low finding (a NUL character ends in a 500) after the user agrees.
5. `security-auditor` did not run over this slice. The one API change reads three fields inside the company of the viewer.
6. Phase 3 remainder (deadline extension, HR reopen), release of results, scheduling.
7. Slice 5, with scripts for the user: cycle description, remarks of each indicator, the employee accomplishment deadline.
8. The open items of the slice 3 handoff stay: the Create Cycle button for an account that is not an administrator, the back link of one review, Team Reviews.

## Constraints and corrections

- The user runs all SQL. No branch, commit, or push until the user asks.
- A write to the database of the user through the app needs the approval of the user, with every write named.
- The dev servers belong to the user. Do not stop them, and do not run `next build` while `next dev` serves.
- The hidden letter "x" in a progress bar comes from `@base-ui/react` (a screen reader measure), not from this code.

## For the owners of other modules and shared code

- Shared: `components/ui/radio-group.tsx` gained `RadioGroupCard`. `review-detail.schema.ts` gained `template`.
- Behavioral module: no file changed. Its two entities are read by the review service.

## File inventory of slice 4

All uncommitted.

| Area           | Files                                                                                                                                                                                                                                                                             | Status          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Shared         | `src/dtos/review-detail.schema.ts`, `test/review-assessment.test.mjs`                                                                                                                                                                                                             | Changed         |
| Backend        | `review-assessment.service.ts` and its spec                                                                                                                                                                                                                                       | Changed         |
| Web routes     | `reviews/[assignment-id]/page.tsx`, `review-content.tsx`                                                                                                                                                                                                                          | Changed         |
| Web components | `indicator-table.tsx`, `indicator-criteria.tsx`, `rating-field.tsx`, `review-completion.tsx`, `review-template-card.tsx`                                                                                                                                                          | New             |
| Web components | `accomplishment-record.tsx`, `accomplishment-summary.tsx`, `accomplishment-values.tsx`, `kpi-reporting-form.tsx`, `kpi-verification-panel.tsx`, `kpi-indicator-card.tsx`, `evaluator-scoring-form.tsx`, `review-question-field.tsx`, `review-cycles-table.tsx`, `radio-group.tsx` | Changed         |
| Web            | `target-result.ts` (new), `domain-labels.ts`                                                                                                                                                                                                                                      | New and changed |
| Web tests      | `target-result.test.ts` (new); `accomplishment-record`, `accomplishment-page`, `evaluator-scoring-form`, `review-page`, `review-cycles-table`, `sample-wording`, `review-response`                                                                                                | New and changed |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/reviews/2026-11-26-sample-frontend-alignment.md,
and docs/handoffs/2026-11-26-sample-alignment-slice-4.md.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
