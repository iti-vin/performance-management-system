# Handoff: review module, the pending list built, with Assessment Details and a security review

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed (about 230 changed paths).

Read in this order for the detail of each part: `2026-11-26-phase-3-extension-and-reopening.md`, `2026-11-26-slice-5-cycle-details-and-remarks.md`, `2026-11-26-phase-5-finalize-score-release.md`, `2026-11-26-phase-6-and-4-components-and-scheduling.md`, `2026-11-26-phase-7-peer-and-upward.md`.

## State

| Item                                                                                                 | State                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Phases 3 to 7 and slice 5                                                                            | Built, tested                                                                                                             |
| Assessment Details on the review page: stage cards, goals card with "Open Goals", "Written Feedback" | Built, tested                                                                                                             |
| Security review of the new work (manual, `security-auditor` checklist)                               | Done: see below                                                                                                           |
| SQL `2026-11-26-phase-7-peer-evaluators.sql`                                                         | Not run. Until it runs, a cycle with a peer stage fails                                                                   |
| Live writes                                                                                          | Only the two of phase 3 (one extension, one reopening) and the slice 5 SQL script                                         |
| Live reads after the last change, as administrator                                                   | New routes answer 401 without a token. The Results tab, one review page with its stage cards, and `/reviews/results` load |

Verified after the last change: `pnpm test` (shared-types 150, backend 758 in 33 files, web 923 in 69 files), `pnpm --filter @pms/database test` (20), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass. No `package.json` or lock file changed.

## Assessment Details

| Part             | Rule                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage cards      | Every stage of the participant. An anonymous stage is one card with no name, and never marks the caller                                                 |
| Goals card       | Only for the subject, their manager of today, and HR                                                                                                    |
| Written feedback | Optional, at most 5000 characters, stored in `answers_json` under `written_feedback`. No schema change. Shown in results with the other written answers |

Red and green: `pnpm --filter @pms/shared-types test` 2 failed then 150; `pnpm --filter @pms/backend test review scoring` 13 failed then full 754; `pnpm --filter @pms/web test review-page assessment-request` 7 failed then full 921.

The sample shows the indicator table with actual results inside the review. Here the card links to the record instead, so one screen owns the values.

## Security review

### Security Audit Report

**Target Environment:** TypeScript, NestJS 12 with TypeORM and PostgreSQL, Next.js 16 with React 19, Zod 4. Scope: everything changed since phase 3 in the review module. No manifest or lock file changed, so there is no supply-chain item. No AI prompt is embedded.

| #   | Issue                                                                                                                                                                   | Rating                                              | Lines                                                                                                                                                    | OWASP and CWE | State                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------- |
| 1   | A question that fewer than the anonymity minimum rated showed the rating of one person                                                                                  | MEDIUM: it identifies an anonymous rater            | `backend/src/modules/review-cycles/services/scoring.ts:91-116`                                                                                           | A01, CWE-359  | Fixed, test first                                   |
| 2   | The same rating stayed inside the group mean and the score, so it could be computed back                                                                                | LOW: needs the counts to be guessed                 | `backend/src/modules/review-cycles/services/scoring.ts:91-116`                                                                                           | A01, CWE-359  | Fixed, test first                                   |
| 3   | Written answers of an anonymous group kept the order of their authors                                                                                                   | LOW: links two answers of one person                | `backend/src/modules/review-cycles/services/scoring.ts:148-163`                                                                                          | A01, CWE-359  | Fixed, test first                                   |
| 4   | A peer or upward evaluator could read the names and states of the other reviews of the colleague                                                                        | LOW: more than the task needs                       | `backend/src/modules/review-cycles/services/review-assessment.service.ts:280-285`                                                                        | A01, CWE-200  | Fixed, test first                                   |
| 5   | An HR administrator who is a participant can read the submitted self, manager, and HR reviews about themselves (older than this work; results are hidden until release) | MEDIUM: an interested party reads evaluations early | `backend/src/modules/review-cycles/services/review-assessment.service.ts:251-252`                                                                        | A01, CWE-863  | Open: PRD owner question                            |
| 6   | No rate limit on any route, the new writes included                                                                                                                     | LOW: signed-in accounts only                        | `backend/src/modules/review-cycles/controllers/results.controller.ts:18`, `backend/src/modules/review-cycles/controllers/review-cycles.controller.ts:47` | A04, CWE-770  | Fixed on 2026-11-27: see `2026-11-27-rate-limit.md` |

**Recommendations:** for 5, decide whether an administrator may read a review whose subject is their own, and refuse it in `get` if not. For 6, add a rate limit at the gateway or with the Nest throttler (a new dependency needs approval).

Checked with no finding: company scope on every new route (a foreign id answers 404); the administrator guard on the cycle routes and a second role check in the reopen, finalize, release, and schedule services; result visibility before and after release (`backend/src/modules/review-cycles/services/results.service.ts:55-59`); evaluator names masked in the list, the progress, and the detail; the answers of an anonymous review hidden from everyone but its author; route ids parsed as GUIDs; text limits and the NUL check on the new fields; no string-built query; no secret in a changed file.

Unverified: a live second company, concurrent writers on real PostgreSQL, and the phase 7 table, which does not exist locally yet. A minimum-size peer group still shows its written answers verbatim, as the PRD pools them.

#### Overall Risk Rating: MEDIUM (finding 5)

A correctness fix from the same pass: the reopen dialog no longer names other reviews of the same stage as opening again, and an anonymous question with too few ratings reads "Withheld".

## Open risks and questions

1. An HR administrator who is a participant can read the submitted reviews about themselves (PRD owner question). Results are hidden from them until release.
2. A peer group of the minimum size still shows its written answers verbatim, as the PRD pools them.
3. Rate limit: added on 2026-11-27, see `2026-11-27-rate-limit.md`.
4. HR has not approved the scoring policy (Res-009): a production gate.
5. Team Reviews tab: a change of an access rule that needs the decision of the senior developer.
6. One evaluator who never submits holds the later stages. No route removes one assignment.
7. After finalization an evaluator who is not an administrator can no longer open their completed reviews (existing rule: active cycles only). Employees read results at `/reviews/results`.
8. Not built: result export, PIP referral, notifications, duplicate cycle.
9. Unverified: live writes of slice 5 and phases 4 to 7, real PostgreSQL lock order, dark theme, zoom, screen reader, a second company, the check queries of earlier demos.

## For the other developer

Run, in order: the slice 5 script, then the phase 7 script. Check that `pms.assignment_responses.reopen_reason` and `pms.evaluation_snapshots` exist. Without the column, every review page fails. Without the table, the whole Cycle Details page fails for every cycle, because it reads the results on each open.

Both exist on the local database of the user: the review pages load, and the Results tab and `/reviews/results` read the table. This closes the "not checked" note of the phase 5 handoff. Review the changes in the behavioral and KPI modules named in the earlier handoffs.

## Live check plan (each write needs the approval of the user)

1. Phase 7 script (the user).
2. "ZZ demo three roles": submit the reopened HR review, finalize, release. Finalize and release cannot be undone.
3. A new draft with a description and a later assessment start: save, schedule, back to draft.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-26-review-module-pending-closed.md.
Say whether I ran the phase 7 script. Then run the live check plan, asking me before each write.
Commit nothing until I ask. I run all SQL.
```
