# Handoff: first check of phase 2A, and route folders in kebab-case

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read it after `2026-11-26-reviews-phase-2a-backend.md`.

## State

| Item                                                              | State                                                                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Accomplishment data script on the local database of the user      | Run by the user: COMMIT; the check query shows 1 record for 1 participant in each of the 4 active cycles |
| Accomplishment data script on the database of the other developer | Not run                                                                                                  |
| First check after the script (read only)                          | Passed                                                                                                   |
| Dynamic route folders in kebab-case                               | Done, tested, opened in the browser                                                                      |
| A real save, submission, or decision against PostgreSQL           | Still not run                                                                                            |
| Phase 2B, web                                                     | Not started                                                                                              |

## First check after the script

Signed-in reads of the running backend with sign-in data that the user gave in chat.

| Account                                                  | Result                                                                                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`                                                   | One record (`77d5c007-269d-4fb2-8ab9-687f8c005a0f`, demo cycle, draft), `isOwn` true; detail `canEdit` and `canSubmit` true, 5 indicators, no values |
| `manager`                                                | The same record, `canDecide` false, "The employee has not submitted it yet.", no values, no remarks. This is the first live run of the team rule     |
| Administrator                                            | 4 records, each parses with the shared schema                                                                                                        |
| `user` and `manager` on the 3 records of other employees | 404                                                                                                                                                  |

## Route folders

The user asked for kebab-case in the dynamic folders too, as `AGENTS.md` says for files and folders.

| Old                                                             | New                        |
| --------------------------------------------------------------- | -------------------------- |
| `review-cycles/[cycleId]`                                       | `review-cycles/[cycle-id]` |
| `reviews/[assignmentId]`                                        | `reviews/[assignment-id]`  |
| `reviews/templates/kpi-goal-template/[templateId]`              | `.../[template-id]`        |
| `reviews/templates/behavioral-assessment-template/[templateId]` | `.../[template-id]`        |

- For the owner of the KPI and behavioral template modules: the four template pages are committed code on `main`. Only the folder names and the way each page reads its param changed.
- A page reads the param by its quoted name and keeps a camelCase variable: `const { "template-id": templateId } = await params;`.
- URLs do not change: they hold the id, not the folder name.
- `web/tests/unit/app-folder-names.test.ts` guards both rules: every folder under `src/app` is kebab-case, and each inline `params: Promise<{ ... }>` names a dynamic folder of its path. A params type behind a named alias is not read by the test.
- The second test is needed: after the folders moved, `pnpm --filter @pms/web typecheck` reported only the page test, and none of the 6 pages that still declared the old names.
- Dead end: renaming a folder fails with `EPERM` on Windows while the dev server runs. The files moved one by one into the new folders, and the old folders were removed.
- Unverified: how a branch that edits the old paths merges.
- Handoffs before this one name the old paths.

## Verification

Red runs, each before its change:

| Test                                            | Red                      | Green   |
| ----------------------------------------------- | ------------------------ | ------- |
| folder names                                    | 1 failed: 4 folders      | pass    |
| `review-page`, folders moved and page unchanged | 2 failed, 13 passed      | 15 pass |
| declared params                                 | 1 failed: 6 declarations | pass    |

From the repository root: `pnpm test` (shared-types 123, backend 532 in 27 files, web 577 in 55 files), `pnpm lint`, and `pnpm typecheck`: all pass. The database test and the backend `tsc` did not run again: no file of theirs changed since the 2A handoff.

Browser, local, real data: `/reviews/<id>` as `manager` shows the review form. As the administrator, the four template pages show the template, and `/review-cycles/<id>/edit` of the active demo cycle answers "This cycle cannot be edited", which needs the cycle to be read. No draft cycle exists, so the edit wizard did not open. Nothing was saved.

The browser console holds two "The authentication service is unavailable" errors. They were there after the first page and the five administrator pages added none. Their cause is unverified.

## Files

All uncommitted: the 7 page files in the 4 moved folders, `web/tests/component/review-page.test.tsx`, `web/tests/unit/app-folder-names.test.ts` (new), `docs/system-architecture.md`, `docs/project-structure.md`.

## Next

Phase 2B as in section "Phase 2B, next" of the 2A handoff. The data script and the first check are done. The web route of the detail page is `/goals/[accomplishment-id]`.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/handoffs/2026-11-26-reviews-phase-2a-backend.md,
docs/handoffs/2026-11-26-route-folders-and-2a-first-check.md, and web/llm.txt.
Build phase 2B test first, with the advisor. Name route folders in kebab-case.
Ask before the live demo writes. Commit nothing until I ask. I run all SQL.
```
