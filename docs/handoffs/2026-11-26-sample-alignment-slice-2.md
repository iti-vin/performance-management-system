# Handoff: align with the sample frontend, slice 2: the data of the tables

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-sample-alignment-slice-1.md` and `docs/reviews/2026-11-26-sample-frontend-alignment.md`.

## Objective

The tables of the review modules and Goals show the data that the sample frontend shows. This slice adds the data that the API did not send. Contracts, backend, and web changed. No schema change and no data script.

## State

| Item                                                                                | State                                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------- |
| All Reviews and one review: position, department, "Assigned to you", 10 rows a page | Done, tested, read live                     |
| Goals: position, KPI template name and frozen version                               | Done, tested, read live                     |
| Behavioral templates: question count of the current version                         | Done, tested, read live                     |
| Wizard participants: employee ID, manager, the words of the step, 10/20/50 rows     | Done, tested, read live                     |
| KPI template list: 10/20/50 rows                                                    | Done, tested                                |
| Live demo of phase 2 (7 writes)                                                     | Not run: waits for the approval of the user |
| `security-auditor` over phase 2                                                     | Not run: after the demo                     |

Verified on 2026-11-26, from the repository root, after the last change: `pnpm test` (shared-types 127, backend 540 in 27 files, web 693 in 62 files), `pnpm lint`, and `pnpm typecheck`: all pass. `pnpm --filter @pms/database test` (18) and the backend `tsc --noEmit` passed after the data work; the one change after them is in the web.

## Red and green runs

| Part                        | Contract             | Backend              | Web                  |
| --------------------------- | -------------------- | -------------------- | -------------------- |
| Reviews                     | 4 failed, 120 passed | 5 failed, 327 passed | 3 failed, 178 passed |
| Goals                       | 2 failed, 123 passed | 4 failed, 73 passed  | 5 failed, 86 passed  |
| Participants and page sizes | 2 failed, 124 passed | 1 failed, 66 passed  | 6 failed, 19 passed  |
| Question count              | 1 failed, 126 passed | 1 failed, 45 passed  | 1 failed, 109 passed |
| Name link                   |                      |                      | 1 failed, 20 passed  |

Every run was green after its code. A test of the assigned flag passed before the code; a mutation (an account with no GUID counts as the caller) turns it red.

## New fields

| Contract                                           | Fields                                                       | Source                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `reviewListRowSchema` (so also the detail)         | `subjectPosition`, `subjectDepartment`, `isAssignedToCaller` | Position frozen by the cycle; department of today; evaluator equals the caller |
| `accomplishmentListRowSchema` (so also the detail) | `position`, `kpiTemplateName`, `kpiTemplateVersion`          | Position and version frozen; template name of today                            |
| `reviewCycleOptionsSchema.employees`               | `employeeCode`, `managerName`                                | `employees.code`; applied manager today                                        |
| `behavioralTemplateListResponseSchema`             | `questionCount`                                              | Questions of the version that `currentVersion` names                           |
| `DEFAULT_REVIEW_PAGE_SIZE`                         | 20 to 10                                                     | The sample                                                                     |

## Decisions

| Decision                                                                                                                 | Reason                                   |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| A cycle that froze no position shows none under the name and "Not set" in a Position column; never the position of today | PRD Cyc-004                              |
| An older KPI template with no name shows its position                                                                    | The KPI list does the same               |
| The review summary keeps "Reviewer", which the sample does not show there                                                | An administrator reads reviews of others |
| The name of a person sits on its own line above the position; an invisible area gives the link a 44px touch height       | The sample keeps them together           |

## For the owners of other modules and shared code

Changed: `behavioral-assessment.service.ts` (`list` returns `questionCount`; one query each for versions, sections, and questions), its spec, `behavioral-template.schema.ts` and its test, `behavioral-template-list.tsx`, and three web test fixtures.

KPI template module: `goal-template-selection.ts` and its test. The page sizes went from 10, 25, 50 to 10, 20, 50, so a saved address with `pageSize=25` now shows 10 rows.

Shared code: `components/molecules/person-cell.tsx` gained `nameSlot` and `PERSON_LINK_CLASS`.

### Found, not changed: the behavioral routes ignore the company (CWE-639)

For the owner of the behavioral module. `AdminRoleGuard` protects the routes, but no company check follows. Read in the code on 2026-11-26; only one company exists locally, so none of it was shown live. Paths are under `backend/src/modules/behavioral-assessment/`.

| Severity                                                          | Route                                | Evidence                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High: an administrator can change the template of another company | `update`, `publish`, `createVersion` | `controllers/behavioral-assessment.controller.ts` passes no user to `update`; `publish` uses the user for the actor only. `services/behavioral-assessment.service.ts`: `lockTemplate` (line 316) and `createVersion` (line 215) read by `templateId` alone; the comment at line 202 says so |
| Medium: an administrator can read the templates of every company  | `list`, `getById`                    | The controller passes no user (lines 54 and 87); the service reads with no company condition (lines 255 and 261)                                                                                                                                                                            |

## Live check

Local, real data, sign-in data that the user gave in chat. Reads only. All responses of the three roles parse with the shared schemas. Opened as administrator: All Reviews, Goals, behavioral templates, and the participant step of a new cycle (Continue only, nothing saved).

The review detail and the goal record were also opened as administrator: the summaries show the position, the department, and "Software Engineer Performance Goals · v2". Not opened after this slice: the manager and employee pages in the browser, the participant filters, a phone width, and the dark theme. The browser console log of the pane holds three "The authentication service is unavailable" errors, one more than before this slice; the cause is unverified (the backend restarts after each edit).

## Open

1. Slice 3: tabs, the Department and Overdue filters, the Review Cycle filter for every role, filters on Goals, Cycles, and behavioral templates.
2. Slice 4: the goal indicator table, rating buttons and the completion panel, the review heading "name · position" with the template card, the progress bar.
3. Slice 5, with scripts for the user: cycle description, remarks of each indicator, the employee accomplishment deadline.

## File inventory of slice 2

All uncommitted.

| Area    | Files                                                                                                                                                                                                                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared  | `review-list.schema.ts`, `accomplishment.schema.ts`, `review-cycle.schema.ts`, `behavioral-template.schema.ts`, and their tests                                                                                                                                                                      |
| Backend | `reviews.service.ts`, `review-assessment.service.ts`, `accomplishments.service.ts`, `review-cycles.service.ts`, `behavioral-assessment.service.ts`, their specs, `reviews.controller.spec.ts`                                                                                                        |
| Web     | `person-cell.tsx` (`nameSlot`, `PERSON_LINK_CLASS`), `reviews-table.tsx`, `review-summary.tsx`, `accomplishments-table.tsx`, `accomplishment-summary.tsx`, `kpi-template-label.ts` (new), `participant-selection.tsx`, `goal-template-selection.ts`, `behavioral-template-list.tsx`, and their tests |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/reviews/2026-11-26-sample-frontend-alignment.md,
and docs/handoffs/2026-11-26-sample-alignment-slice-2.md.
Build slice 3 test first, with the advisor. The phase 2 demo writes still wait for my approval.
Commit nothing until I ask. I run all SQL.
```
