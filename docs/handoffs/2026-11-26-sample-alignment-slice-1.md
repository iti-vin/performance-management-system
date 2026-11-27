# Handoff: align with the sample frontend, slice 1: words and column order

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed.

## Objective

The user wants the app to match the deployed sample `https://pms-iota-beryl.vercel.app/` in its words, its tables, and the data that the tables show. The full comparison is `docs/reviews/2026-11-26-sample-frontend-alignment.md`. This slice changes words and column order in the web only. No contract, API, or schema changed.

## State

| Item                                                              | State                                       |
| ----------------------------------------------------------------- | ------------------------------------------- |
| Comparison of the review modules and Goals, three roles           | Done                                        |
| Slice 1: words and column order                                   | Done, tested, opened live                   |
| Slice 2: data that the sample shows and the API does not send     | Not started                                 |
| Slice 3: tabs and filters                                         | Not started                                 |
| Slice 4: layout of Goals, the review form, and the cycle progress | Not started                                 |
| Slice 5: schema changes (the user runs the SQL)                   | Not started                                 |
| Live demo of phase 2 (7 writes)                                   | Not run: waits for the approval of the user |

Verified on 2026-11-26, from the repository root, after the last change: `pnpm test` (shared-types 123, backend 532 in 27 files, web 683 in 62 files), `pnpm lint`, and `pnpm typecheck`: all pass. The database test did not run again: no database file changed.

Red runs: after the tests asked for the new words, `pnpm --filter @pms/web test` had 101 failed and 579 passed. Two tests of the wizard steps, added next, failed. The wizard header test and five back-link assertions failed (6 failed, 27 passed). Then all passed. Four assertions that still named old words were corrected after the code change. The step 5 sentence: 1 failed, 19 passed, then passed.

## What changed

| Where                           | Change                                                                                                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu                            | "KPI Goal Templates", "Behavioral Assessment Templates"                                                                                                                                               |
| Dialog for unsaved changes      | Second sentence; "Keep editing" and "Discard changes"                                                                                                                                                 |
| Every list                      | The clear button reads "Clear"; table headings show in capitals by style                                                                                                                              |
| All Reviews                     | Title "Reviews" and its description; columns Employee, Review Cycle, Review Type, Reviewer, Due Date, Status; late work shows "Overdue" as its status; search "Search employee or evaluator..."       |
| One review                      | "Review Details", "Back to Reviews", summary in the new order, "Save as Draft", "Submit Review"                                                                                                       |
| Goals                           | Description by role; columns Employee, Review Cycle, Accomplishment Status; the two date columns left the list; the record is headed "Goals"; button and summary words                                |
| Review Cycles                   | "Create Cycle" with an icon; headings in title case                                                                                                                                                   |
| Cycle wizard                    | Heading, description, "Back to Cycles", the five step names, field and stage words; Goals Performance now comes before Behavioral Performance; the last step says that a saved draft launches from it |
| KPI Goal Templates              | Description; columns Template Name, Applicable Position / Role, Indicators, Status, Last Updated                                                                                                      |
| Behavioral Assessment Templates | Description; columns Template Name (with version and category), Description, Review Type, Last Updated, Status                                                                                        |

## For the owner of shared code and the template modules

Review these: `components/molecules/` (`confirmation-dialog` gains `cancelLabel`; `unsaved-changes-dialog`; `filter-bar` and `listing-toolbar` gain `searchPlaceholder` and the word "Clear"; `page-header` description takes a node), `components/organisms/data-table.tsx` (capital headings), `components/templates/listing-page-template.tsx`, `constants/workspace-navigation.ts`, the two template list components and their two pages, and the template tests that name the dialog buttons.

## Decisions

| Decision                                                                                      | Reason                                                 |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| "Review Type" on All Reviews is the stage (Self, Manager, HR); on Cycles it is the cycle type | The sample uses one name for both                      |
| The cycle state filter of the administrator stays                                             | The sample has none; removing it takes a function away |
| The sample dates, names, and numbers are not copied                                           | They are sample data                                   |
| Administrator text on Goals: "View employee performance goals and accomplishments."           | The sample gives HR no Goals page (PRD 2.3)            |

## Next

1. Slice 2, test first, one contract at a time: participant position (`cycle_participants.frozen_position`) with initials and name on All Reviews and Goals; department; "Assigned to you"; the KPI template name and version on Goals; the question count on behavioral templates; employee code and manager on the participant step; page size 10.
2. Slice 3: tabs (My Reviews, Team Reviews, Completed; Cycles tabs), Department and Overdue filters, the Review Cycle filter for every role (the register route is for administrators only, so the options need a new source), filters on Goals, Cycles, and behavioral templates. Until the Overdue filter exists, a row labelled "Overdue" (also a locked one past its deadline) shows under the filter of its stored state, and no filter finds the late ones.
3. Slice 4: indicators as one table on a goal record; rating buttons and the completion panel on a review; the progress bar; "Actual Result" label.
4. Slice 5, one request to the user with the scripts: the cycle description, the remarks of each indicator, and the employee accomplishment deadline (the sample asks for it in the wizard beside the verification deadline).
5. Not read on the sample: the template builders and the cycle tabs after Overview. Step 5 of the sample ends with "Schedule Cycle" for a later assessment start: scheduling is phase 4 of the plan.
6. `GoalsDescription` asks `getCurrentUser()` once more on each Goals page, and the record header depends on that call. One cached call needs a change in the auth module.

Not opened live in this slice: the review detail page, the new dialog, the manager pages, a phone width, and the dark theme.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/reviews/2026-11-26-sample-frontend-alignment.md,
and docs/handoffs/2026-11-26-sample-alignment-slice-1.md.
Build slice 2 test first, with the advisor. The phase 2 demo writes still wait for my approval.
Commit nothing until I ask. I run all SQL.
```
