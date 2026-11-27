# Handoff: five bugs of the review modules fixed

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-slice-4-live-check.md` and `2026-11-26-reviews-phase-2-demo-and-security.md`.

## Objective

Fix the open bugs of the review modules before the next build slice.

## State

| Bug                                                                                  | State                                                                             |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| A NUL character in a text ends in a 500 (low finding of the phase 2 security review) | Fixed for the routes of the review modules. This closes finding 1 of that handoff |
| The wizard shows two templates with one name                                         | Fixed, seen live                                                                  |
| A submit of a review does not move the focus to the first problem                    | Fixed, seen live on a text field                                                  |
| "Create Cycle" shows to an account that is not an administrator                      | Fixed, seen live                                                                  |
| The goal record says the same words twice after an action                            | Fixed, tests only: a live check needs a submission                                |

Verified on 2026-11-26, from the repository root, after the last change: `pnpm test` (shared-types 132, backend 562 in 27 files, web 798 in 66 files), `pnpm --filter @pms/database test` (18), `pnpm lint`, `pnpm typecheck`, and `pnpm --filter @pms/backend exec tsc --noEmit -p tsconfig.json`: all pass.

## Red and green runs

| Bug                   | Command                                                                    | Red                  | Green                                                        |
| --------------------- | -------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------ |
| NUL: contracts        | `pnpm --filter @pms/shared-types test`                                     | 2 failed, 130 passed | 132 passed after `pnpm build:packages`                       |
| NUL: API              | `pnpm --filter @pms/backend test review-cycle-contract reviews.controller` | 3 failed, 49 passed  | 561 in the full run                                          |
| NUL: words of the API | `pnpm --filter @pms/backend test review-cycle-contract`                    | 1 failed, 35 passed  | 562 in the full run                                          |
| Template labels       | `pnpm --filter @pms/web test cycle-templates-step cycle-wizard`            | 6 failed, 38 passed  | 792 web tests, after one more option name in the wizard test |
| Review focus          | `pnpm --filter @pms/web test evaluator-scoring-form`                       | 2 failed, 25 passed  | 794 web tests                                                |
| Create Cycle          | `pnpm --filter @pms/web test create-cycle-action`                          | 2 failed, 3 passed   | 798 web tests                                                |
| Doubled words         | `pnpm --filter @pms/web test accomplishment`                               | 3 failed, 67 passed  | 798 web tests                                                |

The three "offers nothing to" tests passed against the empty stub. With the role check removed, all three fail; the check is restored.

## Decisions

| Decision                                                                                     | Reason                                                            |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `storableTextSchema` in `common.ts`, used by the report texts and the written answers        | The two places of the finding                                     |
| The class DTOs of the cycle name and the cancel reason refuse the character too              | They are in the review module and do not read the Zod contract    |
| `requiredTextSchema` is unchanged                                                            | Behavioral, PIP, and NTE use it and have other owners. See Open   |
| A template reads "name · vN", and adds the start of its id only when two still read the same | The local data holds two templates with one name and one version  |
| The behavioral list shows the version too                                                    | One rule for both lists                                           |
| `hooks/use-problem-focus.ts` serves the review form and the goal record                      | Two callers. The focus moves after an action, never after an edit |
| The button reads the role in its own Suspense boundary                                       | The page header stays static                                      |
| The words after an action are "Report submitted.", "Report returned.", "Report verified."    | The notice of the API already says the state                      |

## Live check

Local, 1440 pixels wide, light theme. No write to the database: only sign-in and sign-out. Administrator: the KPI list of the wizard reads "Software Engineer Performance Goals · v2" and "· v1"; the register shows "Create Cycle". `user`: no button, and `/review-cycles` and `/review-cycles/new` show "HR access required"; a submit of the draft self review with the comment emptied on screen marked it, moved the focus to it, and opened no dialog. The page was reloaded and the saved draft is unchanged.

Not checked live: a NUL character (tests only), the new words after an action, and the focus on a rating button (tests only). The focus does not choose that rating: `RadioRoot.js` of `@base-ui/react` clicks a radio on focus only after an arrow key in the group, and a form test asserts that no rating is checked.

## Open

1. Other free texts still accept a NUL character: every `requiredTextSchema` use outside the review answers, the behavioral and KPI DTOs, and the participant and employee DTOs. For the owners of those modules; one global check in `main.ts` is the other way.
2. The cycle name and the cancel reason are checked by the API DTOs, which answer "Remove the character that cannot be saved." The shared create schema still accepts the character.
3. The back link of one review goes to All Reviews, not to the cycle.
4. The check queries of the phase 2 demo and of the slice 4 live check are not run: the user runs SQL.
5. `security-auditor` over slices 3 and 4, the second review screen of the sample, deadline extension, HR reopen, and slice 5.

## For the owners of other modules and shared code

Shared: `common.ts` gained `storableTextSchema`; `web/src/hooks/use-problem-focus.ts` is new. No file of another module changed.

## File inventory

All uncommitted.

| Area      | Files                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared    | `common.ts`, `dtos/evaluation.schema.ts`, `test/stored-text.test.mjs` (new)                                                                                                    |
| Backend   | `dtos/storable-text.ts` (new), `create-review-cycle.dto.ts`, `cancel-review-cycle.dto.ts`, `review-cycle-contract.spec.ts`, `reviews.controller.spec.ts`                       |
| Web       | `create-cycle-action.tsx` (new), `review-cycles/page.tsx`, `use-problem-focus.ts` (new), `cycle-templates-step.tsx`, `evaluator-scoring-form.tsx`, `accomplishment-record.tsx` |
| Web tests | `create-cycle-action.test.tsx` (new), `cycle-templates-step`, `cycle-wizard`, `evaluator-scoring-form`, `accomplishment-record`, `sample-wording`                              |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/handoffs/2026-11-26-review-bug-fixes.md, and
docs/reviews/2026-11-26-sample-frontend-alignment.md.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
