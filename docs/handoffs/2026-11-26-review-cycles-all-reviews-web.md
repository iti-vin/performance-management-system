# Handoff: Review Cycles, phase 4B: All Reviews in the web, and the module security review

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed.

## Objective

Phase 4B of Review Cycles: the `/reviews` page over `GET /reviews` (PRD 8.2 and Rev-001). With it the four planned phases are built. The module also has its security review.

Read first: `2026-11-26-review-cycles-all-reviews-backend.md` for the API contract and the role scope.

## State

| Item                                                    | State                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `/reviews` page: table, search, filters, pages, notices | Done, tested, checked in the browser as an HR administrator         |
| Non-admin view                                          | Tested with mocks. Not seen live: no password for such an account   |
| Security review of the module                           | Done: 5 findings, all low, none fixed                               |
| Module                                                  | Not complete: the open items below include unverified access checks |

Verified on 2026-11-26, from the repository root:

| Command                            | Result                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `pnpm test`                        | shared-types 110 pass, backend 364 pass (24 files), web 521 pass (50 files) |
| `pnpm --filter @pms/database test` | 15 pass                                                                     |
| `pnpm lint`                        | no findings                                                                 |
| `pnpm typecheck`                   | no errors                                                                   |

Red runs, each before its code:

| Test                                                              | Red                               | Green    |
| ----------------------------------------------------------------- | --------------------------------- | -------- |
| shared `review-list.test.mjs`, the search length                  | 1 fail                            | 110 pass |
| web `review-list-params.test.ts` and `review-list-reader.test.ts` | 15 failed, 1 passed against stubs | all pass |
| web `component/review-list.test.tsx`                              | 23 failed                         | 23 pass  |
| web `component/reviews-content.test.tsx`                          | 11 failed                         | 11 pass  |

The one test that passed against the stub (`maps a 404 to not_found`) was proven by removing the 404 line of `readCycles`: it failed, and the line is restored.

Two filter tests of `review-list.test.tsx` were rewritten after the red run, so each was proven by a mutation of `review-list.tsx`, then restored (23 pass): with the Cycle state filter renamed, the administrator test failed (3 failed in all); with that filter shown to everyone, the non-admin test failed (1 failed).

Browser check on `localhost:3000`, signed in as an HR administrator, read only:

| Check                                               | Result                                                                                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| First load                                          | 8 rows that match the API, no console error                                                                                                    |
| Status filter, search, both together                | URL follows, 4 rows, then 2                                                                                                                    |
| Clear filters                                       | `/reviews`, 8 rows, empty search field                                                                                                         |
| `?state=done&foo=1&perspective=hr&perspective=self` | 8 rows, no error notice                                                                                                                        |
| `?page=9&pageSize=10&state=locked`                  | Redirects to `?state=locked&pageSize=10`, 4 rows                                                                                               |
| `?cycleState=cancelled`                             | "No reviews match these filters."                                                                                                              |
| Widths 320, 768, 1440                               | No horizontal page scroll. At 320 the table scrolls inside its own labelled region                                                             |
| Light and dark                                      | Both read                                                                                                                                      |
| Keyboard                                            | Tab reaches the filters, "Clear filters", and the table region. A filter opens and chooses with Enter and the arrows. Focus outline is visible |

## What was built

- The URL holds the whole list state. `review-list-params.ts` reads it with `reviewListQuerySchema`, one field at a time: a bad value becomes its default and an unknown key is dropped. Raw search params never reach the API, because the API refuses them with 400.
- `reviews-content.tsx` reads the role from `getCurrentUser()`. The role only chooses the filters: an administrator gets Cycle and Cycle state, anyone else gets Stage and Status and a line that says what the list holds. The API scopes the rows.
- The cycle filter lists the cycles that have assignments, from `GET /review-cycles`. When that read fails, the list still shows, and a chosen cycle stays as "Selected cycle" so it can be cleared.
- A page past the end redirects to the last page.
- The table is read only. A cycle that is not active shows its state, and late work shows the word "Overdue".
- No navigation change: all three role menus already link to `/reviews`.

## Decisions and dead ends

| Point                                                                | Reason                                                                                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| The filters are written out one by one in `review-list.tsx`          | A helper function, and then a `.map`, both failed the `react-hooks/refs` lint rule, because they build the handlers during render |
| `formatTemplateDate` is imported from the `review-templates` feature | It already formats an instant as a Manila date. Move it to a shared folder when a third caller appears                            |
| The search debounce repeats the one of the KPI list                  | Two callers, and a change to the KPI list is outside this task                                                                    |
| No link from a row                                                   | No page for one review exists                                                                                                     |

## Security review

Scope: `backend/src/modules/review-cycles`, `backend/src/common/pipes`, the cycle and review parts of `web`, the shared review schemas, the schema, seed, and migration changes. Overall risk: low. Nothing was changed.

| #   | Rating                        | Finding                                                                                                                                                                                                                                      | Where                                                                    | Suggested fix                                                 |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 1   | Low (CWE-770)                 | `stages` has a minimum and no maximum, in the DTO and in the shared schema. A launch creates participants times stages rows in one transaction. Only an administrator can call it, and the default body limit bounds it (limit not verified) | `create-review-cycle.dto.ts` `stages`, `review-cycle.schema.ts` `stages` | A maximum in both                                             |
| 2   | Low (CWE-20)                  | A stage `evaluatorId` is saved without a company check. A GUID of another company is stored on the draft (launch refuses it through readiness). A GUID that no employee has breaks the foreign key and answers 500. From the code, not run   | `review-cycles.service.ts` `buildStages`, `create`, `update`             | Check the id against the company at save, answer 400          |
| 3   | Low (CWE-778, OWASP A09:2021) | The audit row of a save keeps counts, not which participants or stages changed, and the "before" value has no counts. The actor is empty for an account whose employee has no GUID. PRD 6.7 asks for actor and before and after values       | `review-cycles.service.ts` `describeCycle`, `recordAudit`                | Record the ids before and after; refuse a write with no actor |
| 4   | Low                           | "Today" is the UTC day. From 00:00 to 08:00 in Manila, a launch can still use the previous manager, who then gets the review of that employee                                                                                                | `cycle-facts.ts` `dayOf`, `appliedManagersOf`                            | Compute the day in Asia/Manila                                |
| 5   | Low (CWE-20)                  | `saved in SAVED` accepts inherited keys, so `?saved=toString` draws an empty notice. No data is exposed                                                                                                                                      | `review-cycle-saved-notice.tsx`                                          | `Object.hasOwn`                                               |

Checked and found in order:

- Every `/review-cycles` route has `JwtAuthGuard` and `AdminRoleGuard`. `GET /reviews` has `JwtAuthGuard`, and the service scopes by the account role.
- Each read and write starts from the company of the account. A cycle of another company answers 404.
- A non-admin reads only rows where they are the evaluator, in active cycles. Filters and search run after that scope.
- No raw SQL. DTO validation refuses unknown fields. The review query is a strict schema.
- Launch locks the cycle row and checks the state inside one transaction.
- The web checks ids and bodies again in its server actions. The token stays in server code. No raw HTML injection.
- No dependency changed.

Not verified: the 403 for a non-admin and the non-admin list, live; company isolation with a second company, live; rate limits; a template archived between the readiness read and the commit of a launch (the templates are not locked).

## File inventory

All uncommitted.

| File                                                                                                                                                                                        | Status                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `web/src/app/(workspace)/reviews/page.tsx`                                                                                                                                                  | Placeholder replaced                                |
| `web/src/features/review-cycles/components/` `reviews-content.tsx`, `review-list.tsx`, `reviews-table.tsx`, `review-list-notice.tsx`                                                        | New                                                 |
| `web/src/features/review-cycles/services/review-list-params.ts`                                                                                                                             | New                                                 |
| `web/src/features/review-cycles/services/review-cycle-reader.ts`, `api/review-cycle-requests.ts`                                                                                            | `getReviews`, `fetchReviews` added                  |
| `web/tests/unit/review-list-params.test.ts`, `web/tests/integration/review-list-reader.test.ts`, `web/tests/component/review-list.test.tsx`, `web/tests/component/reviews-content.test.tsx` | New                                                 |
| `packages/shared-types/src/dtos/review-list.schema.ts` and its test                                                                                                                         | `REVIEW_SEARCH_MAX_LENGTH` added                    |
| `docs/system-architecture.md`, `docs/project-structure.md`                                                                                                                                  | New files listed, `reviews` no longer a placeholder |

## What older handoffs got wrong

- The opening prompt of `2026-11-26-review-cycles-all-reviews-backend.md` asks for a navigation entry for every role. It already existed.
- That handoff and `2026-11-25-review-cycles-launch-web.md` say `/reviews` is not built. It is built.

## Open items

| Item                                                                                        | Trigger or owner                                                  |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Non-admin live check: own rows or none on `/reviews`, 403 on `/review-cycles/*`             | Needs a sign-in as an account that is not an admin                |
| Security findings 1 to 5                                                                    | Waits for the user                                                |
| A link from a row, and the check that the list keeps its filters on return                  | When a page for one review exists                                 |
| At 320 pixels the search field is narrower than the selects (shared `ListingToolbar`)       | A change of the shared toolbar                                    |
| 200 percent browser zoom, `next build`                                                      | Not run                                                           |
| Cancel of an active cycle in the web                                                        | Needs a cycle details page                                        |
| Scheduled activation, peer and upward stages, result visibility                             | Deferred in the plan                                              |
| The assessment module                                                                       | Must require an `active` cycle on every assignment read and write |
| The migration `2026-11-25-cycle-stage-evaluator.sql` on the database of the other developer | Before their backend starts                                       |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/handoffs/2026-11-26-review-cycles-all-reviews-web.md,
and the backend handoff of the same date.
Open: the non-admin live check (the user signs in) and the five low security findings.
Fix a finding test first, and only after the user says so.
Commit nothing. The user runs all SQL.
```
