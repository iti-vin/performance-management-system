# Handoff: KPI accomplishments, phase 2B: the web

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed.

## Objective

Phase 2 of the plan in `2026-11-26-reviews-three-roles-phase-0.md`, web part (PRD section 7): the employee reports actual results, and the current manager verifies or returns them. Read first: `2026-11-26-reviews-phase-2a-backend.md` for the API and its rules, and `2026-11-26-route-folders-and-2a-first-check.md` for the data script and the route folder rule.

## State

| Item                                                                  | State                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `/goals` and `/goals/[accomplishment-id]`                             | Done, tested, opened live                                  |
| Live reads, three roles, and the checks of the form that send nothing | Passed                                                     |
| A save, a submission, a return, or a verification from the web        | Not run: they write, and wait for the approval of the user |
| Those writes against PostgreSQL                                       | Never run                                                  |
| Phase 2 as a whole                                                    | Not done until the live demo passes                        |

Verified on 2026-11-26, from the repository root, after the last change: `pnpm test` (shared-types 123, backend 532 in 27 files, web 662 in 61 files), `pnpm lint`, and `pnpm typecheck`: all pass. The database test and the backend `tsc` did not run again: no file of theirs changed since the 2A handoff.

Red runs, each before its code:

| Test (web)                                             | Red                 | Green                                                                      |
| ------------------------------------------------------ | ------------------- | -------------------------------------------------------------------------- |
| `accomplishment-reader`                                | 7 failed, 1 passed  | 8 pass; the passing one fails when the list contract is not enforced       |
| `accomplishment-response`                              | 20 failed           | 20 pass                                                                    |
| `goals-list`                                           | 10 failed           | 10 pass                                                                    |
| `actuals-request`                                      | 15 failed, 2 passed | 17 pass; both passing ones fail under a mutation                           |
| `accomplishment-record`                                | 22 failed, 1 passed | 23 pass; the passing one fails when the history shows without a submission |
| `accomplishment-page`                                  | 6 failed            | 6 pass                                                                     |
| matrix column names, fixture corrected to the contract | 1 failed            | pass                                                                       |
| focus on the problem field                             | 1 failed, 23 passed | 24 pass                                                                    |

The move of the shared request helpers is a refactor: 577 web tests passed after it.

## What the pages do

| Caller and state            | Page                                                                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List                        | "Your reports", then "Your team" (an administrator: "All employees"). A report that waits for the caller comes first, marked "Waiting for you"                  |
| Employee, draft or returned | One field for each indicator, one remarks field, after a return the reason and a "What you corrected" field. Save draft, and Submit report after a confirmation |
| Current manager, submitted  | The values, a reason field, Return for correction and Verify, each after a confirmation                                                                         |
| Anyone else with access     | The values as words, or only the notice of the API when it holds the values back                                                                                |
| Every record                | Summary, the frozen criteria and matrix of each indicator, and the submission history                                                                           |

## Decisions

| Decision                                                                                       | Reason                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The flags `canEdit`, `canSubmit`, `canDecide` of the API choose what the page offers           | The role is not enough: AUTH-004 and the deadlines live in the API                                                                                                |
| One component holds the typed values, the result, and the dialogs                              | A submission or a decision changes the flags: the message and the focus must stay                                                                                 |
| A value is a text field with a decimal keyboard, not a number field                            | A number field hides a bad entry as blank, which a save would store                                                                                               |
| A save sends every indicator, null for a blank one                                             | The API replaces the whole report                                                                                                                                 |
| A save does not keep the correction reason; the field says so, and the leave warning counts it | The API stores it with a submission only                                                                                                                          |
| A small matrix view in `position-goals`, not the preview of the template builder               | The preview shows words of the builder ("Enable Use for scoring") and needs the shape of the editor                                                               |
| No Goals entry in the menu of the HR administrator                                             | PRD 2.3 gives HR no Goals entry, and PRD 7 gives HR schedule recovery, not verification. An administrator who opens `/goals` by its address gets a read-only page |
| No search or filters in the list, so the way back is plain `/goals`                            | The API list has none. PRD 7.2 asks for them when the list grows                                                                                                  |

## Moved code

For the next developer, because the two features share it now:

| Old                                                | New                                                                                            |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `readCycles` in `review-cycle-reader.ts`           | `readApi` and `ApiReadResult` in `web/src/services/api-read.ts`                                |
| `features/review-cycles/services/cycle-request.ts` | `web/src/services/api-send.ts` (`sendForRefusal`, `sendForMessage`, `RequestWords`, `Refusal`) |
| The request helpers of `review-cycle-requests.ts`  | `web/src/api/authorized-requests.ts`                                                           |
| `types/review-action.ts` (`ReviewActionResult`)    | `types/form-action.ts` (`FormActionResult`)                                                    |

The unrouted scaffolds of `position-goals` are replaced: `kpi-reporting-form.tsx`, `kpi-verification-panel.tsx`, `actuals-request.ts`. `KpiIndicatorResult` is gone.

## Live check

Local, real data, sign-in data that the user gave in chat. Nothing was saved: the browser sent no form request to a record page during the form checks.

| Account            | Result                                                                                                                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Administrator      | 4 rows under "All employees"; the seed record shows both scales, values 4 and 1, remarks, and version 1; an unknown id shows Page not found; the demo record shows the notice and no values                                                                                    |
| `manager`          | "Your reports" empty, "Your team" with the demo record; the record shows the notice and no field; the seed record shows Page not found                                                                                                                                         |
| `user`, 375 by 812 | Own row; the page is not wider than the screen (the table scrolls in its own region); a text in a value field is named and nothing is sent; Back asks, and Leave returns to the list; Submit report on the empty form opens no dialog and focuses the first of 5 marked fields |

Not checked: dark theme, 320, 768, and 1440 widths, 200% zoom, a screen reader. Version 1 of the seed record shows one value of two: its stored id is malformed (see the 2A handoff).

## Security pre-check of phase 2

A manual pass over the API of 2A and the web of 2B. No verified finding. It is not the gate of the phase: run the `security-auditor` skill over all of phase 2 after the live demo, before phase 2 counts as done.

| Checked                                                                              | How                                              |
| ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Authentication, company scope, 404 for no access, who writes and who decides         | See the 2A handoff; live again through the pages |
| Server actions check the id and the body again; the API decides access               | Tests; the actions send only a GUID in the path  |
| No raw HTML, `eval`, console output, browser storage, or cached read in the new code | Search of the new files                          |
| The session token stays on the server (httpOnly cookie, server-only modules)         | `server-only` imports                            |
| A failed request shows fixed words, with no address or header                        | Tests                                            |
| No new dependency                                                                    | No manifest or lockfile change                   |

Unverified: the origin check of server actions is the one of Next.js and is not tested here; no rate limit exists on these routes; a NUL character in a text field is not tested.

## Live demo, next

One approval for these writes on the local database, in this order. The demo record is `77d5c007-269d-4fb2-8ab9-687f8c005a0f`, the cycle `734c8be0-be9a-4f0a-b8f4-1548110ed534`.

| Step | Account       | Write                             | Can it be undone                |
| ---- | ------------- | --------------------------------- | ------------------------------- |
| 1    | `user`        | Save a draft of the report        | Yes, edit again                 |
| 2    | `user`        | Submit the report                 | Only by a return of the manager |
| 3    | `manager`     | Return it with a reason           | The history keeps it            |
| 4    | `user`        | Resubmit with a correction reason | Only by a return                |
| 5    | `manager`     | Verify                            | No                              |
| 6    | `manager`     | Submit the manager review         | No (a reopen comes in phase 3)  |
| 7    | Administrator | Submit the HR review              | No                              |

After it, give the user a read-only query of the record, its values, both versions, and the audit rows with `entity_type = 'accomplishment'`, with the expected rows. These writes reach PostgreSQL for the first time: when a step fails, record the response and its `correlationId` before any change, and do not retry blindly. Then run the `security-auditor` pass.

## Gaps

- The 5 indicators of the demo are test data ("helo", "enter", "a", "name").
- Evidence files, search and filters, and the "unreleased" check (phase 5) are not built.
- `GET /kpi-goals/<seed id>` answers 400 (see the 2A handoff).
- The database of the other developer needs the accomplishment data script.

## File inventory of phase 2B

All uncommitted.

| File                                                                                                                                                                                                         | Change                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `web/src/app/(workspace)/goals/` `page.tsx`, `goals-content.tsx`, `[accomplishment-id]/page.tsx`, `[accomplishment-id]/record-content.tsx`                                                                   | Placeholder replaced; new                        |
| `web/src/features/position-goals/` `api/`, `components/`, `services/`                                                                                                                                        | Reader, actions, request builder, ten components |
| `web/src/api/authorized-requests.ts`, `web/src/services/api-read.ts`, `api-send.ts`, `web/src/types/form-action.ts`                                                                                          | Shared                                           |
| `web/src/features/review-cycles/` request, reader, and action files; `features/evaluations/components/evaluator-scoring-form.tsx`                                                                            | Use the shared code                              |
| `web/src/constants/domain-labels.ts`, `web/src/types/kpi-indicator.ts`                                                                                                                                       | Accomplishment words; unused type removed        |
| `web/tests/` `accomplishment-page`, `accomplishment-record`, `goals-list` (component), `accomplishment-reader`, `accomplishment-response` (integration), `actuals-request` (unit), `utils/accomplishment.ts` | New                                              |
| `docs/system-architecture.md`, `docs/project-structure.md`                                                                                                                                                   | Routes and files                                 |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/handoffs/2026-11-26-reviews-phase-2b-web.md and the 2A handoff.
Ask me to approve the writes of the live demo, then run it and give me the read-only check query.
After it, plan phase 3. Name route folders in kebab-case. Commit nothing until I ask. I run all SQL.
```
