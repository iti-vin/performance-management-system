# Handoff: closing work of the review modules, and the security audit

Date of this state: 2026-11-27. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-27-remaining-gaps.md`. This file corrects two things in it, marked below.

## Done

| Item                                                                  | State                                                |
| --------------------------------------------------------------------- | ---------------------------------------------------- |
| Flaky entity schema test (passed its 5 second limit under a full run) | Limit of 30 seconds. A full `pnpm test` passed       |
| Five unrouted setup components                                        | Deleted                                              |
| Older template version showed the name and position of today          | Shows those of its publication, from the audit row   |
| Result visibility in the wizard (Cyc-001)                             | Built, seen on the draft edit page. No save was made |
| Security audit of the changes since 2026-11-26                        | Below. No code changed for it                        |

Verified after the last change: `pnpm test` (shared-types 155, backend 848, web 977), `pnpm --filter @pms/database test` (21), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass. This work wrote no database row.

## Corrections to the earlier handoff

1. **The visibility script is now needed more widely.** Creating, changing, and reading a cycle use `pms.cycle_result_visibility` too. On a database without the script every Cycle Details page, every wizard page, and every save of a cycle fails, not only released results. It ran on the local database. The other developer needs it before running this code.
2. Cyc-001 is no longer partly open: the wizard holds the choice.

## Result visibility, as it works now

| Moment                     | Behavior                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| New draft                  | Both readers ticked                                                                                                                               |
| Save of a draft            | The choice is stored. A request that leaves a value out keeps the stored one                                                                      |
| Release                    | The Results tab starts from the stored choice, and HR may change it. A release that leaves a value out keeps the stored one, so it widens nothing |
| After release              | Fixed                                                                                                                                             |
| A cycle with no stored row | Both read                                                                                                                                         |

## Red and green runs

| Part                | Command                                                                                | Red                  | Green                                             |
| ------------------- | -------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------- |
| Version details     | `pnpm --filter @pms/backend test kpi-goals.service behavioral-assessment.service`      | 2 failed, 108 passed | 177 with `publication-history`                    |
| Visibility contract | `pnpm --filter @pms/shared-types test`                                                 | 2 failed, 153 passed | 155, after the detail fixture took the two fields |
| Visibility backend  | `pnpm --filter @pms/backend test results.service review-cycles.service`                | 6 failed, 123 passed | 848 in the full run                               |
| Visibility web      | `pnpm --filter @pms/web test wizard-result-visibility cycle-draft manage-review-cycle` | 4 failed, 86 passed  | 977 in the full run                               |

The test "keeps the details of today for a publication that has no audit row" passed in the red run. It was proven by taking the first audit row whatever its version: 1 failed. The file was restored.

The flaky test change and the deletion have no new test: one is a test setting, the other removes code with no caller (lint and typecheck pass).

## Deleted files, and how to restore one

`evaluation-workflow.tsx`, `release-settings.tsx`, `goal-mapping-editor.tsx`, `goal-readiness.tsx`, `cycle-launch-summary.tsx`, all in `web/src/features/review-cycles/components/`.

```powershell
git checkout 9f86101 -- web/src/features/review-cycles/components/release-settings.tsx
```

`release-settings.tsx` held an option for what evaluators see of earlier stages. Decision D5 still asks about it. `web/src/types/employee.ts` and `web/src/types/kpi-indicator.ts` had no caller after that and are deleted too, with the approval of the user. Restore with the same command and their paths: commit `9f86101` holds `kpi-indicator.ts` with one more type that an earlier slice of this work had removed. After the deletion `pnpm --filter @pms/web typecheck`, `lint`, and `test` (978) pass.

## Security Audit Report

**Target Environment:** TypeScript, NestJS 12 with TypeORM and PostgreSQL, Next.js 16 with React 19. No dependency changed: `package.json` files and the lock file show no change since `9f86101`. No AI prompt is embedded.

Scope: completed-work access and review history, template audit, archive and version routes, cycle history and attention routes, results export, list memory, result visibility, and the version details.

| #   | Issue                                                                                                                       | Rating | Where                                                                                                                                                        | Proof and reference                                                                                                         | Recommendation                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | An HR administrator who is a participant reads the reviews about themselves, earlier versions included (older, decision D1) | MEDIUM | `review-cycles/services/review-assessment.service.ts`, `findVisible` (441 to 449)                                                                            | Code. OWASP A01, CWE-863                                                                                                    | Decide D1, then refuse the own participation for review and cycle reads |
| 2   | Fixed: a version number past the integer range answered 500                                                                 | LOW    | `kpi-goals.controller.ts:148`, `behavioral-assessment.controller.ts:159`; the query at `kpi-goals.service.ts:462` and `behavioral-assessment.service.ts:333` | Seen live on the KPI route: `99999999999999999999` answers 500 with the generic message, no detail leaks. OWASP A03, CWE-20 | A pipe or a check that answers 400 outside 1 to 2147483647, test first  |
| 3   | Fixed: list search words and filters stay in the browser after a sign-out in the same tab, until a reload                   | LOW    | `web/src/components/organisms/list-memory.ts`; `features/auth/services/sign-out.ts` redirects without a reload                                               | Code. CWE-200                                                                                                               | Call `forgetListMemory` when the user signs out                         |
| 4   | Fixed: a former manager keeps the row of a completed review, which names the department of the subject as it is today       | LOW    | `reviews.service.ts`, `subjectFields` (114 to 120)                                                                                                           | Code. OWASP A01, CWE-200                                                                                                    | Show the department of the time, or none, to a former manager           |

Checked, no finding: the new routes sit under the JWT and administrator guards of their class; template and cycle reads check the company before they read versions or audit rows; the history route masks the actor of every row that an anonymous evaluator causes (their draft save, submission, and the stage it opens) and sends no answer, actual value, remark, or record id; the release and the wizard validate the two values as booleans; the export prefixes cells that start with `=`, `+`, `-`, `@`, a tab, or a carriage return.

Not verified: a cell that starts with a line feed in a spreadsheet; whether the framework keeps hidden pages of an earlier user after a sign-out; a second company live; two writers at once.

Hardening tip: the history shows the number of answers of a peer draft save, with no name.

**Overall Risk Rating: MEDIUM**

The audit changed no code. The user then approved the three LOW findings.

## Findings 2, 3, and 4: fixed

| #   | Fix                                                                                                                                                                                               | Red                                                      | Green                       | Seen live                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 2   | `ParseVersionPipe` (`backend/src/common/pipes/`) on both version routes: a whole number from 1 to 2147483647, the range of the column. `backend/src/version-routes.spec.ts` checks the two routes | 11 failed, 3 passed                                      | 191 with the template specs | Version 1 answers 200, 99 answers 404, and `-1`, `0`, `2147483648`, `99999999999999999999` answer 400. `-1` answered 404 before |
| 3   | The login form forgets all list state when it shows, so every way out of a session is covered                                                                                                     | `sign-in-forgets-lists` 1 failed                         | 5 with `credentials-form`   | No: tested only                                                                                                                 |
| 4   | `departmentFor` (`viewer.ts`), on the review list and detail: outside an active cycle only an HR administrator and the subject read the department of today                                       | `reviews.service review-assessment` 2 failed, 148 passed | 150                         | As `manager`, the completed row has no department and the active row has one. As `user` and as an administrator, both have it   |

Guard tests that passed at once were proven for finding 4 by temporary changes: no state condition (2 failed), and the subject loses the department (2 failed). The file was restored.

A trade-off of finding 4: the current manager and a peer see no department on a completed review either, shown as "Not set". No department of the time of the review is stored. The senior developer decides whether that is wanted, as with D9.

After the fixes: `pnpm test` (shared-types 155, web 978), backend 866 in 40 files, `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: pass. The live probes signed in through the API with the local test accounts and made reads only.

Open finding: number 1 (decision D1). The overall rating stays MEDIUM.

For the owner of the template modules: the two controllers now use the new pipe.

## Files of the template modules, for the review of their owner

`kpi-goals/services/publication-history.ts` (new function `detailsOfVersion`), `kpi-goals.service.ts`, `behavioral-assessment.service.ts`, and their specs.

## Known limits

1. A template version published before the audit rows existed shows the name, description, and position of today.
2. The visibility choice cannot change after a release.
3. The shared request schema fills a left-out visibility value with `true`, and the API keeps the stored one. The web always sends both.
4. The security check signed in once through the API as the test administrator on the local app, and made reads only.

## Live checks without a write (2026-11-27, local app)

| Check                                                                                                | Result                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History, attention, KPI and behavioral version routes, and cycle results, as `user` and as `manager` | 403 on all seven. The administrator reads 200. No token answers 401                                                                                                                                                                                                                                                          |
| Login page after 10 attempts of an unknown name                                                      | "Too many attempts. Wait a minute and try again."                                                                                                                                                                                                                                                                            |
| Dark theme: History, cycle results, an older template version                                        | Readable, nothing overlaps                                                                                                                                                                                                                                                                                                   |
| Phone width (375): History, results, the visibility choice of a draft, version history               | No sideways scroll                                                                                                                                                                                                                                                                                                           |
| Phone width: cycle tabs                                                                              | **Bug found and fixed:** the second row of tabs lay over the content (each tab took the height of the whole list). `listing-tabs.tsx` gives a tab its own height. `pnpm --filter @pms/web test listing-tabs-wrap`: 1 failed, then 1 passed. Seen fixed: two rows of 44 pixels inside the list. Web 979, lint, typecheck pass |
| Attention list                                                                                       | Empty today, with no load error                                                                                                                                                                                                                                                                                              |

## New security finding, not fixed

| Issue                                                                                    | Rating | Proof and reference                                                                                                                                                                                                                                                                                                             | Recommendation                                                                                         |
| ---------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| After a sign-out the page of the last user stays in the document, hidden, until a reload | MEDIUM | Seen live: on `/login` after the administrator signed out, a hidden `main` held 10 table rows with employee, reviewer, and cycle names. The framework keeps earlier pages (`cacheComponents`), and `features/auth/services/sign-out.ts` redirects without a reload. CWE-524. This replaces the "Not verified" note of the audit | Sign out with a full page load, so the browser drops the old document; the same for an expired session |

## Still open: live checks that write

Nothing below is run. Each needs the approval of the user: a peer cycle with one component to a release with a hidden employee; indicator remarks and an extension of the accomplishment deadline; a scheduled cycle that activates the next day and one that is blocked by an archived template; the download of the export. Not possible from here: zoom, a screen reader, a second company (needs SQL), two writers at once.

## Sign-out finding: fixed

The login page loads again in full when the document showed a signed-in page before (`web/src/utils/signed-in-document.ts`, marked by `workspace-layout.tsx`, used by `credentials-form.tsx`). It covers a sign-out and an ended session. `pnpm --filter @pms/web test sign-out-document`: 1 failed, 1 passed, then 15 passed with the login and layout tests. Seen live: after the administrator signed out, `/login` is a new document with no table row and none of the earlier names. This replaces "not fixed" above.

## Live checks with writes (2026-11-27, local app, test accounts, approved by the user)

| Step                                                                                                                                                  | Done                                               | Seen                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wizard: new draft `ZZ live peer` (`9e1f2321-43f2-4494-b136-75a833a622f2`), goals off, employee visibility off, peer stage with two peers, minimum 2   | Saved from the wizard                              | The detail holds employee `false`, manager `true`, weights 0 and 1, two peers. Readiness has no problem                                                                         |
| `ZZ live goals` (`db0a90c4-6452-4280-bdf4-e209d95c961e`): create, launch, indicator remark by the employee, accomplishment deadline 10 to 15 December | Through the API                                    | Every call answers 200 or 201, and the saved remark comes back. The History tab shows the extension with both times in Manila time and the reason                               |
| `ZZ live blocked` (`ec5ccfe6-47b4-45c9-8ca0-116d024bece6`): create, schedule for 28 November, then archive "Browser Pass Test v2"                     | Through the API                                    | The attention list was empty before, and shows the cycle with its problem after, on the Review Cycles page. The template shows Archived with no action, and its version history |
| `ZZ live ready` (`67f285a4-965f-49d6-92d9-47c204ba77a9`): create, schedule for 28 November                                                            | Through the API                                    | Scheduled                                                                                                                                                                       |
| Export                                                                                                                                                | The button on the results of "ZZ demo three roles" | The content is right: the byte order mark, the headings, one row, the name `results.csv`. No file was found in a download folder, so the saved file is **not** confirmed        |

**Not done:** the peer cycle from launch to release (6 approved writes). The wizard always adds the Managerial and HR stages, so the cycle needs two submissions that were not named: the manager review and the HR review. It waits for that approval. `ZZ live peer` is still a draft.

**To check on or after 28 November:** `ZZ live ready` is Active, `ZZ live blocked` is still Scheduled with a blocked audit row (the timer runs every minute while the backend runs).

The template archive audit row is not shown by any screen. The user can read it:

```sql
SELECT action, actor_id, occurred_at, after_json
FROM pms.audit_events
WHERE entity_type = 'behavioral_template' AND entity_id = '17e72f75-5a02-4778-9485-beae8f535944';
```

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-27-module-closeout.md.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
