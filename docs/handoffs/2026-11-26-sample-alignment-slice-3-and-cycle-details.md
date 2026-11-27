# Handoff: Cycle Details, and slice 3 of the sample alignment (tabs and filters)

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-sample-alignment-slice-2.md`, `2026-11-26-reviews-three-roles-phase-0.md` (the plan of phases 0 to 7), and `docs/reviews/2026-11-26-sample-frontend-alignment.md`.

## Objective

1. An administrator opens any launched or finished cycle: Overview, Participants, Progress, Results, and Cancel Cycle.
2. The review lists have the tabs and filters of the sample frontend.

## Why the details page did not exist before

The plan of phases 0 to 7 puts it in phase 3: "Cycle details page, cancel of an active cycle, deadline extension, HR reopen" (PRD 6.9, Rec-001 to Rec-005, Rev-005). The register linked only a draft, to the wizard. Slices 1 and 2 of the sample alignment covered words and table data. This change builds the first two items of phase 3. The deadline extension and the HR reopen are not built.

## State

| Item                                                                               | State                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Cycle Details at `/review-cycles/[cycle-id]`, with `?tab=`                         | Done, tested, four tabs read live                                  |
| Cancel of a scheduled or active cycle from the details page                        | Done and tested. Dialog opened live and closed: no cycle cancelled |
| Register: every row has a link (a draft opens the wizard, others open the details) | Done, tested, read live                                            |
| All Reviews: tabs All Reviews, My Reviews, Completed                               | Done, tested, read live                                            |
| All Reviews: Review Cycle for every role, Department, Status with Overdue          | Done, tested, read live                                            |
| Register: tabs and filters                                                         | Done, tested, read live                                            |
| Behavioral templates: tabs and filters                                             | Done, tested, read live                                            |
| Goals of others: search, Review Cycle, Status                                      | Done, tested, read live                                            |
| Deadline extension, HR reopen, release of results                                  | Not built                                                          |
| Team Reviews tab of the sample                                                     | Not built: see Decisions                                           |
| Live demo of phase 2 (7 writes)                                                    | Not run: waits for the approval of the user                        |
| `security-auditor` over phase 2                                                    | Not run: after the demo                                            |
| `security-auditor` over this change                                                | Not run: part of the pass before the module is complete            |

Verified on 2026-11-26, from the repository root, after the last code change: `pnpm test` (shared-types 129, backend 555 in 27 files, web 751 in 64 files), `pnpm --filter @pms/database test` (18), `pnpm lint`, `pnpm typecheck`, and `pnpm --filter @pms/backend exec tsc --noEmit -p tsconfig.json`: all pass. Only documents changed after that run.

## Red and green runs

| Part                       | Command                                                      | Red                  | Green                                                             |
| -------------------------- | ------------------------------------------------------------ | -------------------- | ----------------------------------------------------------------- |
| Details: contract          | `pnpm --filter @pms/shared-types test`                       | 1 failed, 127 passed | 128 passed                                                        |
| Details: backend           | `pnpm --filter @pms/backend test review-cycles`              | 5 failed, 334 passed | 544 passed in the full backend run                                |
| Details: web               | `pnpm --filter @pms/web test` with the file names            | 32 failed, 34 passed | 118 passed in 9 files                                             |
| Reviews tabs: contract     | `pnpm --filter @pms/shared-types test`                       | 2 failed, 127 passed | 129 passed                                                        |
| Reviews tabs: backend      | `pnpm --filter @pms/backend test reviews`                    | 12 failed, 23 passed | 555 passed in the full backend run                                |
| Reviews tabs: web          | `pnpm --filter @pms/web test review-list`, `reviews-content` | 33 failed            | 733 passed in the full web run, after one old expectation changed |
| Register, Goals, templates | `pnpm --filter @pms/web test list-filters`                   | 18 failed            | 751 passed in the full web run                                    |

The changed expectation: the back link of one review now keeps `cycleId` for every role, because every role has the Review Cycle filter.

## What the change adds

### Contract and API

| Part                                  | Detail                                                                                                                                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /review-cycles/:id/participants` | New. Each participant with name, frozen position, department, and assignments (perspective, evaluator name, state, overdue, deadline). Sorted by name. `JwtAuthGuard` and `AdminRoleGuard`, `ParseGuidPipe`, 404 for a cycle of another company |
| `reviewCycleParticipantsSchema`       | New, in `review-cycle.schema.ts`                                                                                                                                                                                                                |
| `GET /reviews` query                  | New `view` (`mine`, `completed`) and `department`; `state` also takes `overdue`                                                                                                                                                                 |
| `GET /reviews` response               | New `cycles` (id and name) and `departments`, built from the rows that the caller can already see                                                                                                                                               |

### Web

| Part                                      | Detail                                                                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Details page                              | Header card, Cancel Cycle with a reason dialog, tabs in the address. A draft redirects to the wizard. An unknown cycle shows not found |
| Participants and Progress tabs            | Both read the participants route. The browser filters them                                                                             |
| Results tab                               | Says that results are not released, or the release date. No result is shown                                                            |
| `components/organisms/filtered-table.tsx` | New shared organism: tabs, search, filters, table, and pager (10, 20, 50) over a list that the page holds whole                        |
| Reviews                                   | The server filters and pages. The address holds the state                                                                              |

## Decisions

| Decision                                                                       | Reason                                                                                                                                                   |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No Team Reviews tab                                                            | A manager sees only the assignments that the manager answers (PRD 8.3). A team view is a change of an access rule: boss hersvin and the PRD owner decide |
| No Reopen button on the Progress tab                                           | The route does not exist (Rev-005)                                                                                                                       |
| Completed holds the states Submitted and Completed                             | `isInView` in `reviews.service.ts`                                                                                                                       |
| A filter never widens the scope; the filter options come from the visible rows | An option reveals nothing more                                                                                                                           |
| A person who is not an administrator loses only the Cycle state filter         | That account sees active cycles only                                                                                                                     |
| The register, Goals, and the behavioral templates filter in the browser        | The API sends those lists whole                                                                                                                          |
| Goals: only the lists of others have filters                                   | An employee has few reports of their own                                                                                                                 |
| The participant status is derived in the web (`cycle-progress.ts`)             | The API sends the assignment states                                                                                                                      |

## Live check

Local, real data, sign-in data that the user gave in chat, viewport 1440 by 900, light theme. No write except sign-in and sign-out.

| Account       | Seen                                                                                                                                                                                                                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrator | Register tabs and filters; the demo cycle: Overview, Participants (0 / 3, pending 2), Progress (0 of 3 completed, 1 submitted), Results; the cancel dialog, closed with its Cancel button; Completed tab (2 rows); Overdue with Engineering (empty, no deadline has passed); Goals filters; behavioral template filters |
| User          | One review, marked "Assigned to you"; no Cycle state filter; `?cycleState=draft` in the address has no effect; the details address shows "HR access required"; Goals lists the own report with no filter                                                                                                                |
| Manager       | One review (Manager, In Progress); no Cycle state filter; Goals: own list empty, team list with filters; `/review-cycles` shows "HR access required"                                                                                                                                                                    |

Not checked live: the participants route called directly by an account that is not an administrator (the spec covers the guards), a phone width, the dark theme, the redirect of a draft, the filters inside the Participants and Progress tabs, and the "View response" links. A draft of another evaluator stays hidden from an administrator (PRD 8.3): read in `review-assessment.service.ts` (`get`), and covered by its spec. The console log of the pane holds "The authentication service is unavailable" errors; the cause is unverified (the backend restarts after each edit).

## Open

1. Found live: `/review-cycles` shows the Create Cycle button above "HR access required" when an account that is not an administrator opens the address. The menu of those roles has no Cycles entry, and the API guards every write.
2. The back link of one review goes to All Reviews, not to the cycle, when the reader came from the Progress tab.
3. At 1440 pixels the Status filter of All Reviews wraps to a second line for an administrator.
4. Phase 2 demo: seven writes on demo record `77d5c007-269d-4fb2-8ab9-687f8c005a0f`, cycle `734c8be0-be9a-4f0a-b8f4-1548110ed534`. Writes 5 to 7 cannot be undone. Cancel nothing on this cycle before the demo ends.
5. Phase 3 remainder: deadline extension, HR reopen. Later phases: release of results, scheduling.
6. Slice 4: the goal indicator table, rating buttons and the completion panel, the review heading "name · position" with the template card, the progress bar of the register, "Actual Result".
7. Slice 5, with scripts for the user: cycle description, remarks of each indicator, the employee accomplishment deadline.
8. Behavioral routes ignore the company (CWE-639): recorded in the slice 2 handoff, not changed.

## Constraints and corrections

- The user runs all SQL. Connect to the database only with permission for that task.
- No branch, commit, or push until the user asks.
- A write to the database of the user through the app needs the approval of the user, with every write named. A daily log or review is never submitted without it.
- Dynamic route folders are kebab-case (`web/tests/unit/app-folder-names.test.ts`).
- The dev servers on ports 3000 and 4000 belong to the user. Do not stop them, and do not run `next build` while `next dev` serves.

## Dead ends

- The first Cycles table with filters lived in the `review-cycles` feature. Goals and the templates need the same table and a feature imports no other feature, so it moved to `components/organisms/`.

## For the owners of other modules and shared code

- Behavioral module: `behavioral-template-list.tsx` is now a client component with tabs, search, and filters.
- Shared code: `components/organisms/filtered-table.tsx` is new. `review-list.schema.ts` and `review-cycle.schema.ts` gained the fields above.

## File inventory of this change

All uncommitted.

| Area                 | Files                                                                                                                                                                   | Status  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Shared               | `src/dtos/review-cycle.schema.ts`, `src/dtos/review-list.schema.ts`, `test/review-cycle.test.mjs`, `test/review-list.test.mjs`                                          | Changed |
| Backend              | `review-cycles.service.ts`, `review-cycles.controller.ts`, `reviews.service.ts`, and their specs                                                                        | Changed |
| Web routes           | `app/(workspace)/review-cycles/[cycle-id]/page.tsx`, `details-content.tsx`                                                                                              | New     |
| Web components       | `cycle-details.tsx`, `cycle-overview.tsx`, `cycle-participants-tab.tsx`, `cycle-progress-tab.tsx`, `components/organisms/filtered-table.tsx`                            | New     |
| Web components       | `review-cycles-table.tsx`, `review-list.tsx`, `reviews-content.tsx` (no longer reads the register), `accomplishments-table.tsx`, `behavioral-template-list.tsx`         | Changed |
| Web services         | `cycle-progress.ts`, `status-filter.ts`                                                                                                                                 | New     |
| Web services and API | `review-cycle-reader.ts`, `review-cycle-requests.ts`, `review-list-params.ts`                                                                                           | Changed |
| Web tests            | `cycle-details.test.tsx`, `list-filters.test.tsx`                                                                                                                       | New     |
| Web tests            | `review-cycles-table.test.tsx`, `review-cycle-reader.test.ts`, `review-list.test.tsx`, `reviews-content.test.tsx`, `review-page.test.tsx`, `review-list-params.test.ts` | Changed |
| Documents            | `system-architecture.md`, `project-structure.md`, the sample alignment review                                                                                           | Changed |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/reviews/2026-11-26-sample-frontend-alignment.md,
and docs/handoffs/2026-11-26-sample-alignment-slice-3-and-cycle-details.md.
Build the next slice test first, with the advisor. The phase 2 demo writes still wait for my approval.
Commit nothing until I ask. I run all SQL.
```
