# Handoff: security audit of slices 3 and 4 and the bug fixes, and the back link

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-review-bug-fixes.md` and `2026-11-26-reviews-phase-2-demo-and-security.md`.

## State

| Item                                                             | State                |
| ---------------------------------------------------------------- | -------------------- |
| Security audit of what changed since the phase 2 audit           | Done: no new finding |
| The back link of one review, opened from the progress of a cycle | Fixed, tests only    |

Run on 2026-11-26 after the back link: web 800 tests in 66 files, `pnpm lint`, `pnpm typecheck`: pass. The red run: 2 failed, 56 passed (`review-page`, `cycle-details`). The test for an account that is not an administrator passed before the code; with the role condition removed it fails (mutation, restored).

## Security audit report

Target: NestJS, TypeORM, PostgreSQL, Next.js, React, Zod. Read line by line: `reviews.service.ts` (scope, filters, facets), `review-cycles.service.ts` (`getParticipants`), `review-assessment.service.ts` (`templateOf`), `review-list-params.ts`, `details-content.tsx`, `manage-review-cycle.ts`, `create-cycle-action.tsx`, `review-content.tsx`, `storable-text.ts`, `use-problem-focus.ts`.

| Check                              | Result                                                                                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of the new filters and views | They narrow rows that are already scoped by company and role. The options come from those rows                                                                              |
| Participants route                 | Guards on the class, cycle read by id and company (404), people read inside the company                                                                                     |
| Template of a review               | Read inside the company of the viewer; a spec covers another company                                                                                                        |
| Create Cycle button                | Display only. The API guard is the control, and the pages show "HR access required"                                                                                         |
| Back link                          | Built from the cycle id of the review and a fixed value; no address from the URL is followed                                                                                |
| Browser                            | One `dangerouslySetInnerHTML`, in `components/ui/chart.tsx` (shadcn code, not used by these features). No `eval`, console output, or browser storage in the review features |
| Supply chain                       | No `package.json` or lockfile change                                                                                                                                        |

Overall risk rating of this scope: None.

## Open, not part of this scope

- High: the behavioral routes ignore the company (CWE-639), for the owner of that module. See `2026-11-26-sample-alignment-slice-2.md`.
- Low: texts of other modules still accept a NUL character. See the bug fixes handoff.
- Question for the PRD owner: an HR administrator reads submitted reviews about themselves before release.
- Not verified: no rate limit; a second company was never shown live.
