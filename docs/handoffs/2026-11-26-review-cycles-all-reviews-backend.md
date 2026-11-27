# Handoff: Review Cycles, phase 4A: All Reviews in the backend

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed.

## Objective

All Reviews (PRD 8.2 and Rev-001): one list of review assignments, filtered and paged, in which each role sees only what it may see. This phase is the backend and the shared contract. The web page `/reviews` is phase 4B and is not started: it is still a placeholder.

## State

| Item                                                                                 | State                                    |
| ------------------------------------------------------------------------------------ | ---------------------------------------- |
| Shared contract `review-list.schema.ts`                                              | Done, tested                             |
| `ReviewsService.list`                                                                | Done, tested with repository fakes       |
| `ReviewsController` (`GET /reviews`) and module registration                         | Done, tested                             |
| Live check as an HR administrator against the running backend and the local database | Passed, see below                        |
| Live check as an account that is not an admin                                        | Not run: no password for such an account |
| Web page                                                                             | Not started (4B)                         |

Verified on 2026-11-26, from the repository root:

| Command                                                         | Result                                                                      |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm test`                                                     | shared-types 109 pass, backend 364 pass (24 files), web 471 pass (46 files) |
| `pnpm --filter @pms/database test`                              | 15 pass                                                                     |
| `pnpm lint`                                                     | no findings                                                                 |
| `pnpm typecheck`                                                | no errors                                                                   |
| `pnpm --filter @pms/backend exec tsc --noEmit -p tsconfig.json` | no errors                                                                   |

Red runs, each before its code: shared test `review-list.test.mjs` 5 fail; `pnpm --filter @pms/backend test reviews.service` 21 failed against a stub; `pnpm --filter @pms/backend test reviews.controller` 7 failed against a stub.

Live check, read only, signed in as an HR administrator (local database):

| Request                                                         | Result                                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `GET /reviews` without a token                                  | 401                                                                                           |
| `GET /reviews?pageSize=50`                                      | 200, parses with `reviewListResponseSchema`, 8 rows (2, 3, and 3 for the three active cycles) |
| `cycleState=active` / `cycleState=cancelled`                    | 8 / 0 (the cancelled cycles have no assignment)                                               |
| `perspective=hr` / `state=locked` / `cycleId` of the seed cycle | 2 / 4 / 2                                                                                     |
| `q=maria` / `q=lebron`                                          | 3 / 0                                                                                         |
| `page=2&pageSize=10`                                            | 0 rows, `totalItems` 8                                                                        |
| `cycleId` that does not exist                                   | 0                                                                                             |
| `state=done`, `page=0`, `evaluatorId=...`, a repeated `state`   | 400 `VALIDATION_ERROR` with the field                                                         |

No row of the local database is overdue, so `isOverdue: true` is proven by tests only.

## Contract

`GET /reviews` (`JwtAuthGuard`).

Query, all optional: `cycleId`, `cycleState`, `perspective`, `state`, `q` (120 characters at most), `page` (default 1), `pageSize` (10, 20, or 50; default 20). An unknown or repeated key returns 400 with `details[].field` (`query` for an unknown key) and the code `INVALID_QUERY`.

Response: `{ items, page, pageSize, totalItems }`. Each item: `assignmentId`, `cycleId`, `cycleName`, `cycleState`, `subjectName`, `evaluatorName`, `perspective`, `state`, `deadline` (or null), `isOverdue`.

## Decisions

| Decision                                                                                                    | Reason                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An HR administrator (`users.user_role_id = '1'`) sees every assignment of the company, in every cycle state | The register of the company. Cycle state is a column and a filter                                                                                                                                                                |
| Everyone else sees only the assignments where they are the evaluator, in `active` cycles                    | The earlier plan said "subject or evaluator". A subject row would show who reviews a person and the progress of that review, and no result visibility rule exists yet (PRD 6.5). "Reviews about me" waits for the results module |
| No `AdminRoleGuard` on the route                                                                            | Every role has this list. The service decides the scope from the account, never from the request                                                                                                                                 |
| An account without an employee GUID gets an empty list (non-admin)                                          | It cannot be an evaluator. A fallback to the company list would be a leak                                                                                                                                                        |
| Company scope comes from the cycles: cycles of the company first, then assignments of those cycles          | Assignments carry no company column                                                                                                                                                                                              |
| Filters, search, count, and pages run on the authorized rows                                                | No filter can widen the scope, and `totalItems` matches the list                                                                                                                                                                 |
| `isOverdue` is computed on the server: active cycle, state not `submitted` or `completed`, deadline passed  | A display only (Rev-004). A cancelled or finished cycle expects no work                                                                                                                                                          |
| Order: deadline, then subject, cycle, and stage order                                                       | Stable pages                                                                                                                                                                                                                     |
| Filters and pages run in memory after three batched reads and one name lookup                               | Present volume is small. See Open items                                                                                                                                                                                          |

## Constraints for the next developer

- Assessment reads and writes must require an `active` cycle. A cancelled cycle keeps its assignments.
- A non-admin must never receive a row where they are not the evaluator, until a visibility rule says so.
- The web imports the types and the query schema from `@pms/shared-types`. Run `pnpm build:packages` after a contract change.
- Nothing reads or writes the `public` schema.

## File inventory

All uncommitted.

| File                                                                                 | Status                                                                                                             |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `packages/shared-types/src/dtos/review-list.schema.ts`                               | New                                                                                                                |
| `packages/shared-types/test/review-list.test.mjs`                                    | New                                                                                                                |
| `packages/shared-types/src/index.ts`                                                 | Export added                                                                                                       |
| `packages/shared-types/src/common.ts`                                                | Comment on `pageSchema` updated                                                                                    |
| `backend/src/modules/review-cycles/services/reviews.service.ts` and `.spec.ts`       | New                                                                                                                |
| `backend/src/modules/review-cycles/controllers/reviews.controller.ts` and `.spec.ts` | New                                                                                                                |
| `backend/src/modules/review-cycles/review-cycles.module.ts`                          | Controller and service registered                                                                                  |
| `docs/system-architecture.md`, `docs/project-structure.md`                           | Route table and file trees; also adds `manager-assignment.entity.ts` and removes a stale "launch comes later" note |

## What older handoffs got wrong

- `2026-11-25-review-cycles-launch-web.md` says phase 4 is not started. Its backend part is now done.

## Open items

| Item                                                                             | Trigger or owner                                                          |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A second company in the live database: company scope is proven by tests only     | When a second company exists                                              |
| Non-admin live check: empty or own rows on `/reviews`, 403 on `/review-cycles/*` | Needs a sign-in as an account that is not an admin                        |
| Pagination in SQL instead of memory                                              | When a company holds a few thousand assignments, or the list becomes slow |
| "Today" and deadlines compare in UTC against Asia/Manila dates in the web        | Inherited from phase 3A                                                   |
| `/reviews` web page                                                              | Phase 4B                                                                  |
| `security-auditor` over the whole Review Cycles module                           | Before the module is called complete                                      |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-26-review-cycles-all-reviews-backend.md.
The admin live check passed. The check as a non-admin needs a sign-in from the user.
Build phase 4B test first: the /reviews page in web, with filters and the page in the URL,
status and overdue in words, a cycle filter for admins, and a nav entry for every role.
Commit nothing. The user runs all SQL.
```
