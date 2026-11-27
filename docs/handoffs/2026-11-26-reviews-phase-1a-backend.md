# Handoff: answering a review, phase 1A: shared contract and backend

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed.

## Objective

Phase 1 of the plan in `2026-11-26-reviews-three-roles-phase-0.md`: an evaluator opens a review, saves a draft, and submits it, and the next stage opens (PRD Rev-001 to Rev-004, Rev-006). Phase 1A is the shared contract and the API. Phase 1B, the web, is not started: the review list has no link and no form is routed.

## State

| Item                                                                            | State                                                      |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Shared contract                                                                 | Done, tested                                               |
| `GET /reviews/:id`, `PUT /reviews/:id/response`, `POST /reviews/:id/submission` | Done, tested with in-memory repository fakes               |
| Live reads and refused writes, three roles, local database                      | Passed                                                     |
| A real save or submission against the database                                  | Not run: it writes, and waits for the approval of the user |
| Web                                                                             | Not started                                                |

Verified on 2026-11-26, from the repository root: `pnpm test` (shared-types 117, backend 437 in 25 files, web 524), `pnpm --filter @pms/database test` (16), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass.

Red runs, each before its code, against compiling stubs for the backend:

| Test                                | Red                  | Green    |
| ----------------------------------- | -------------------- | -------- |
| shared `review-assessment.test.mjs` | 6 fail               | 117 pass |
| service, `get`                      | 15 failed            | pass     |
| service, `saveDraft`                | 17 failed, 15 passed | 32 pass  |
| service, `submit` and the new lock  | 21 failed, 31 passed | 52 pass  |
| controller                          | 9 failed, 7 passed   | 16 pass  |

## Contract

| Route                          | Body          | Answers                                                                                                      |
| ------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET /reviews/:id`             |               | 200 `reviewDetailSchema`; 400 bad id; 404                                                                    |
| `PUT /reviews/:id/response`    | `{ answers }` | 200 the review; 400 bad body or an answer that does not fit; 404; 409 locked, submitted, or cycle not active |
| `POST /reviews/:id/submission` | `{ answers }` | 200 the review; the above, and 422 for missing required answers or the goals gate                            |

An answer: `questionId`, and one of `score` (whole, 1 to 5), `writtenAnswer` (at most 5000 characters), `optionId`, or `isNotObserved`. At most 500 answers, one per question. A field of a 400 or 422 is `answers.<questionId>` (or the body path).

Stored in `assignment_responses.answers_json`, keyed by question id: a number, a text, an option id, or `"not_observed"`. This reads the shape of the seed.

## Rules and decisions

| Rule                                                                                                                    | Reason                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| The evaluator reads and writes while the cycle is active                                                                | PRD Rev-001 and the 3A handoff                                                                                     |
| An HR administrator of the company reads any review in any cycle state, and writes only their own                       | A finished cycle is no new work. This narrows "every read requires an active cycle"                                |
| Anyone else gets 404, also the subject of the review                                                                    | PRD 8.11 and AUTH-002. A refusal reveals nothing                                                                   |
| A draft is visible to its evaluator only. Others see a response once it is submitted                                    | PRD 8.3: an in-progress review is visible to the assigned evaluator                                                |
| The questions come from the version that the participant froze, never the latest one                                    | The behavioral service loads the latest, so the review service reads the tables itself                             |
| A locked review shows its questions, with `canEdit` false and `waitingFor`                                              | PRD 8.3: visible to the evaluator, not editable                                                                    |
| A save and a submission lock the cycle for read, then every assignment of the participant in id order                   | A cancellation waits or wins; two evaluators of one participant never deadlock                                     |
| The next stage opens for that participant only, when every review of the earlier stages is submitted or completed       | Rev-003, read per participant                                                                                      |
| A manager assessment answers 422 while the goals weight is above 0 and the participant has no `verified` accomplishment | Acc-005. Phase 2 writes accomplishments; until then a manager can save a draft only, and the HR stage stays locked |
| Late work is accepted                                                                                                   | Rev-004                                                                                                            |
| `completed` is never set here                                                                                           | Finalization (phase 5)                                                                                             |
| Audit: `draft_saved`, `submitted` (with the answers), `stage_unlocked`                                                  | PRD 8.7                                                                                                            |

## Live check

Local database, the demo cycle `734c8be0-be9a-4f0a-b8f4-1548110ed534`. Accounts signed in with sign-in data that the user gave in chat. No request could write: refused for ownership or state, or naming a question that no review holds.

| Request                                                 | Result                                                   |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `user` reads own Self                                   | 200, can edit, 2 sections, 5 questions of the four types |
| `user` reads the Manager review about them              | 404                                                      |
| `manager` reads own review                              | 200, locked, waiting for `self`                          |
| `manager` reads, saves, and submits the Self of `user`  | 404, 404, 404                                            |
| Administrator reads Self and own HR                     | 200, read-only; HR locked, waiting for `self`            |
| Administrator reads the seed submitted Self (`...0202`) | 200, 2 answers, scores 4 and 4                           |
| Administrator saves the Self of `user`                  | 404                                                      |
| `manager` saves own locked review                       | 409                                                      |
| `user` saves an unknown question; a bad body            | 400 `UNKNOWN_QUESTION`; 400 `INVALID_BODY`               |
| `user` reads again                                      | Still not started, no response                           |

## Gaps and constraints for the next developer

- PRD Rev-006 names "feedback". `assignment_responses` has no column for overall feedback, so none is stored. A column is a schema change, when HR asks.
- The evaluator of an assignment never changes today. When a manager change rewrites not-started reviews (Mgr-005), the lock must check the evaluator on the locked row too.
- Choice options have no order column: they show in the order the database returns them.
- A reopen of a submitted review (Rev-005) is phase 3. `writeResponse` already starts the next version after a submitted one.
- `web/src/features/evaluations/services/assessment-request.ts` is an unrouted scaffold that still sends a choice as `writtenAnswer`. Phase 1B sends `optionId`.
- `docs/project-structure.md` says that a web feature does not import another feature. `features/review-cycles` already imports `formatTemplateDate` and `apiErrorText` from `review-templates` (phases 2 and 4B). Phase 1B should move shared helpers to a shared folder, or the rule needs a change.
- The lock queries ran on PostgreSQL: the two refused writes of the live check (an unknown question, a locked review) read the cycle `FOR SHARE` and the assignments of the participant `FOR UPDATE`, then rolled back. A concurrent run, and a real save or submission, have not been made.
- A write reads the frozen questions before its transaction, so it holds one database connection.

## File inventory of phase 1A

All uncommitted.

| File                                                                                                                                              | Change                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `packages/shared-types/src/dtos/evaluation.schema.ts`                                                                                             | Answer rules and limits                                  |
| `packages/shared-types/src/dtos/review-detail.schema.ts`, `src/index.ts`, `test/review-assessment.test.mjs`                                       | New contract                                             |
| `backend/src/modules/review-cycles/services/` `review-assessment.service.ts` and `.spec.ts`, `review-answers.ts`, `review-stages.ts`, `viewer.ts` | New                                                      |
| `backend/src/modules/review-cycles/services/reviews.service.ts`                                                                                   | Uses `viewer.ts`; exports `isOverdue`                    |
| `backend/src/modules/review-cycles/entities/` `assignment-response.entity.ts`, `accomplishment.entity.ts`                                         | New; `assignment.entity.ts` gains the submission columns |
| `backend/src/modules/review-cycles/controllers/reviews.controller.ts` and `.spec.ts`, `review-cycles.module.ts`                                   | Three routes, registration                               |
| `docs/system-architecture.md`, `docs/project-structure.md`                                                                                        | Routes and files                                         |

## Phase 1B, next

1. Reader and server actions, reusing `readCycles` and `sendCycleRequest`; check each body against the shared schema again.
2. Page `/reviews/[assignmentId]`: adapt `EvaluatorScoringForm` (drop the feedback field and the verified goals; offer Not observed), confirm before a submission and say that it cannot be changed until a reopen exists, warn on unsaved changes, show a locked review with the stage it waits for.
3. Link the rows that the caller can open. The back link rebuilds the list filters with `parseReviewListParams`: never forward a raw return URL.
4. Live demo with one approval for its writes: `user` submits Self (not reversible before phase 3), `manager` saves a draft and meets the Acc-005 block, the administrator reads all three.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/handoffs/2026-11-26-reviews-phase-1a-backend.md, and web/llm.txt.
Build phase 1B test first, with the advisor. Ask before the live demo writes.
Commit nothing until the user asks. The user runs all SQL.
```
