# Handoff: the remaining gaps of the review modules

Date of this state: 2026-11-27. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-27-completed-read-and-history.md` and `docs/reviews/2026-11-27-review-modules-prd-check-and-plan.md`. The user asked to build every open gap without waiting for the decisions or for the review of module owners.

## State by gap

| Gap                              | State        | Verified                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G3 audit rows of templates       | Done         | Backend tests: red 17 failed, green 162 passed. Not seen live                                                                                                                                                                                                                                                       |
| G2 publication actor and time    | Done, no SQL | Version freeze time plus the audit row actor, shown in the version history. An older first version that is no longer current shows Not recorded                                                                                                                                                                     |
| G1 archive                       | Done         | Web red 7 failed, template tests green. Not seen live                                                                                                                                                                                                                                                               |
| G4 version history               | Done         | Contract, backend 174, web template tests green. Routes `GET /:id/versions` and `/:id/versions/:version`. Not seen live                                                                                                                                                                                             |
| G10 history view for HR          | Done         | `GET /review-cycles/:id/history`, History tab. Backend red 6 failed, 7 passed; masking mutation proven; web red 7 failed. Answers, actuals, remarks, and anonymous names are not sent; rows about the reader are left out. Not seen live                                                                            |
| G11 filters kept on return       | Done         | `list-memory.ts`: state lives until a reload. Web 951 passed. Proven by dropping the memory on unmount (the first red run failed on a wrong column shape in the test). Not seen live                                                                                                                                |
| G9 results search, pages, export | Done         | Web only, over the scoped rows the API already sends. CSV in the browser with formula cells prefixed (CWE-1236). Red 12 failed, result tests 50 passed. Not seen live                                                                                                                                               |
| G6 attention list                | Done         | `GET /review-cycle-attention`, section on Review Cycles. Backend red 3 failed, web red 2 failed, green. Not seen live                                                                                                                                                                                               |
| G5 result visibility             | Done         | Script ran locally. Chosen on the Results tab before release, not in the wizard (Cyc-001 stays partly open). New table `pms.cycle_result_visibility`, script `packages/database/migrations/2026-11-27-result-visibility.sql`. Database, contract, backend 572, web tests green. The release choice is not seen live |

## The result visibility script

Ran on the local database on 2026-11-27 (localhost, with the approval of the user, for this script only): `pms.cycle_result_visibility` exists. Then `/reviews/results` and the released result opened again as the employee. Any other database still needs it. The backend already maps the new table, so until the script runs these fail on a database with a released cycle: `/reviews/results` (seen: "Reviews are unavailable"), every result detail, the whole Cycle Details page of a released cycle, and a release.

```powershell
psql "<your connection>" -v ON_ERROR_STOP=1 -f packages/database/migrations/2026-11-27-result-visibility.sql
```

The other developer needs this script too, with the slice 5 and phase 7 scripts.

## Verified after the last change

Shared-types 153, backend 839 in 38 files, web 968 in 75 files. Once, with every suite running together, the entity schema test passed its 5 second limit; it passed alone and in a rerun of the backend suite. `pnpm --filter @pms/database test` (21), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: pass. No row was written to any database by this work; the script created one table. Nothing is committed.

## Red and green runs

| Part                    | Command                                                                                                                                      | Red                                            | Green                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| G3 and G1 backend       | `pnpm --filter @pms/backend test kpi-goals.service behavioral-assessment.service`                                                            | 17 failed, 83 passed                           | 162 (two older save counts took the audit row)                                 |
| G1 web                  | `pnpm --filter @pms/web test goal-template-listing behavioral-template-details-view goal-template-publish-confirmation manage-goal-template` | 7 failed, 37 passed                            | `test template`: 239                                                           |
| G4 contract and backend | `pnpm --filter @pms/backend test publication-history kpi-goals behavioral-assessment`                                                        | contract 1 failed, backend 11 failed           | contract 152, backend 174                                                      |
| G4 web                  | `pnpm --filter @pms/web test template-version-history`                                                                                       | 4 failed, 4 passed                             | `test template`: 247                                                           |
| G10 backend             | `pnpm --filter @pms/backend test cycle-history`                                                                                              | 6 failed, 1 passed                             | 7                                                                              |
| G10 web                 | `pnpm --filter @pms/web test cycle-history-tab cycle-details.test`                                                                           | 7 failed, 58 passed                            | 180 with the cycle tests                                                       |
| G11                     | `pnpm --filter @pms/web test filtered-table-memory`                                                                                          | 2 failed, for a wrong column shape in the test | 2. Proven by dropping the memory on unmount (2 failed)                         |
| G9                      | `pnpm --filter @pms/web test results-export`                                                                                                 | 12 failed                                      | `test result`: 50                                                              |
| G6                      | `pnpm --filter @pms/backend test cycle-attention`, same for web                                                                              | backend 3 failed, web 2 failed                 | 3 and 8                                                                        |
| G5                      | database, shared-types, `test results.service review-cycles.controller`, web `result-visibility`                                             | 1, 1, 5, and 2 failed                          | database 21, contract 153, backend 572 (`test results review-cycles`), web 160 |

## Guards proven by a temporary change

| Change                                             | Failed |
| -------------------------------------------------- | ------ |
| History: the anonymous actor is shown              | 1      |
| History: answers, actuals, and remarks are shown   | 1      |
| History: record ids are shown                      | 1      |
| One result ignores the visibility choice           | 2      |
| Visibility is read before a release                | 1      |
| Any text is accepted as a version number           | 3      |
| An archived KPI template keeps Archive             | 1      |
| An archived behavioral template keeps Archive      | 1      |
| The empty attention list still shows               | 1      |
| The version history reads without a frozen version | 1      |

The files were restored, and the specs passed again. The local backend runs in watch mode, so it served some changed rules for seconds. Compiled files read afterwards hold the final code.

## Decisions built on a default

| Decision                     | What is built                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 HR as participant         | Applied in the History tab only: rows about the reader are left out. The review screens still let an HR participant read about themselves                              |
| D5 result visibility         | Employee and manager, each on or off, HR always. Chosen on the Results tab before the release, not in the wizard, and fixed after it. No stored choice means both read |
| Module owner review (G1, G3) | Built without it, as the user asked                                                                                                                                    |

## Files for the review of their owner

- `backend/src/modules/kpi-goals/`: service, controller, their specs, and the new `services/publication-history.ts`, which the behavioral module imports.
- `backend/src/modules/behavioral-assessment/`: service, controller, spec.
- `web/src/features/review-templates/` and the two template detail pages.

## New routes

| Route                                                                              | Who              |
| ---------------------------------------------------------------------------------- | ---------------- |
| `POST /behavioral-assessment/:id/archived`                                         | HR administrator |
| `GET /kpi-goals/:id/versions`, `/versions/:version`, and the behavioral twins      | HR administrator |
| `GET /review-cycles/:id/history`                                                   | HR administrator |
| `GET /review-cycle-attention`                                                      | HR administrator |
| `POST /review-cycles/:id/release` now takes `employeeVisible` and `managerVisible` | HR administrator |

## Security review

A manual review of the changed lines. The new routes sit under `JwtAuthGuard` and `AdminRoleGuard` at the class, and each read checks the company first. Not run: the security-auditor skill on this set.

| Finding                                                                                          | Severity |
| ------------------------------------------------------------------------------------------------ | -------- |
| The History tab shows the number of answers of a peer draft save (`answeredCount`), with no name | Low      |
| List search words stay in the browser after a sign-out in the same tab, until a reload           | Low      |

## Known limits

1. See the live check section for what is seen. The export is a browser download, so a live check of it needs the approval of the user.
2. Older publications have no audit row: an older first version that is not current shows "Not recorded".
3. The attention list reads readiness once for each scheduled cycle.
4. An archived template and a cycle that maps it: already covered by `cycle-readiness.spec.ts`, `cycle-activation.service.spec.ts`, and `review-cycles.service.spec.ts`.
5. Still open from the plan: Cyc-001 wizard field, D1 to D10, the live checks, and the unrouted setup components.

## Live check after the script

Local app, reads only, signed in by the user as an HR administrator (`Iging DotTech`), and as the employee for the results. This replaces "Not seen live" in the table above for the rows below.

| Gap    | Seen                                                                                                                                             | Still not seen live                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| G1     | Archived in the KPI status filter. Archive on a published KPI and behavioral template; the dialog opens, and Cancel closes it                    | The archive itself (a write)                                           |
| G2, G4 | Version history of a KPI and a behavioral template. Version 1 opens with no action. Publisher of version 2 shows; version 1 shows "Not recorded" |                                                                        |
| G3     |                                                                                                                                                  | Audit rows of a template change (a write, and no screen shows them)    |
| G5     | The released result and the results list open after the script                                                                                   | The choice at a release (needs a finalized cycle that is not released) |
| G6     | The page shows no section, and no load error. No cycle is blocked or late today                                                                  | A list with rows                                                       |
| G9     | Search, department filter, and Export Results on the employee list and on the cycle tab                                                          | The downloaded file                                                    |
| G10    | 18 rows of "ZZ demo three roles" with actor, time, reason, before and after. No answer, remark, or actual value                                  | An anonymous stage                                                     |
| G11    | The cycle register keeps the search "three" after opening a cycle and going back                                                                 |                                                                        |

Not checked live: the new routes as a non-administrator (tested only).

## Found in the live check

1. Fixed the same day: the History tab showed database codes and a UTC time in "Before" and "After". The route now sends the plain values by name, and `web/src/features/review-cycles/services/history-words.ts` puts them in the words of `domain-labels.ts`, with times in Manila time. Red: shared-types 1 failed, backend `cycle-history` 1 failed, web `cycle-history-tab` 7 failed. Green: shared-types 154, backend 839, web 974, lint, typecheck, backend `tsc`. Seen live: 18 rows, no code and no stored time text. The entity schema test passed its 5 second limit again while every suite ran together, and passed in a run of the backend suite alone.
2. An older template version shows its own indicators or questions, with the name, description, and position of the template today: a version row keeps none of them.
3. The browser console holds "An unexpected response was received from the server" entries. Their time and cause are not established; the pages read in this check loaded.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-27-remaining-gaps.md.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
