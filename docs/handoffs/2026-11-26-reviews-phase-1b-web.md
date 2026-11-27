# Handoff: answering a review, phase 1B: the web

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed.

## Objective

Phase 1 of `2026-11-26-reviews-three-roles-phase-0.md`, web part: open a review from All Reviews, save a draft, submit it. Read first: `2026-11-26-reviews-phase-1a-backend.md` for the API and its rules.

## State

| Item                                                            | State                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| Page `/reviews/[assignmentId]`, form, server actions, row links | Done, tested                                          |
| Browser check, three roles, read only                           | Passed                                                |
| Live demo: real saves and a submission                          | Passed with the approval of the user, see "Live demo" |

Verified on 2026-11-26, from the repository root: `pnpm test` (shared-types 117, backend 437, web 575 in 54 files), `pnpm --filter @pms/database test` (16), `pnpm lint`, `pnpm typecheck`, backend `tsc --noEmit`: all pass.

Red runs, each before its code:

| Test                                                                                 | Red                                       | Green   |
| ------------------------------------------------------------------------------------ | ----------------------------------------- | ------- |
| `unit/assessment-request.test.ts`                                                    | 3 failed, 1 passed                        | 4 pass  |
| `integration/review-response.test.ts`                                                | 13 failed                                 | pass    |
| `component/evaluator-scoring-form.test.tsx`                                          | 16 failed                                 | 16 pass |
| `component/review-page.test.tsx`                                                     | 14 failed, later 1 failed (place of Back) | 15 pass |
| `component/review-list.test.tsx`, the row link                                       | 1 failed                                  | pass    |
| `component/evaluator-scoring-form.test.tsx`, keyboard focus (found in the live demo) | 3 failed, 15 passed                       | 18 pass |

The converter test that passed before the code (a blank answer is left out) was proven by sending blank answers: it failed; restored.

## What was built

| Part                             | Behavior                                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rows of All Reviews              | Every row links to its review. The link name says the stage and the cycle. The list filters travel in the query                                                                  |
| `review-content.tsx` (in `app/`) | Joins `review-cycles` (summary, reader, actions) and `evaluations` (form), so neither feature imports the other                                                                  |
| Summary                          | Employee, evaluator, cycle, stage, deadline, status, "Overdue" as a word, and the reason when read only                                                                          |
| Form                             | One control for each question type; "Not observed" where allowed; optional choices can be cleared; 5000 characters at most                                                       |
| Save draft                       | Sends what is filled in; says "Draft saved."                                                                                                                                     |
| Submit                           | Required questions first, on their inputs; then a confirmation: "After you submit, you cannot change your answers."                                                              |
| Refusals                         | A problem of `answers.<questionId>` shows on its question; the rest at form level                                                                                                |
| Leaving                          | "Back to reviews" asks before it discards changes; a tab close warns                                                                                                             |
| Not readable                     | A bad id or an API 404 shows the not-found page                                                                                                                                  |
| Keyboard focus                   | A pending action stays focusable (`focusableWhenDisabled`), so a save and a refused submission keep the focus on their button. A submitted review moves it to the result message |

`web/src/types/review-question.ts` is removed: the form uses the shared contract. `cycle-request.ts` gains `sendForRefusal`, which also returns the error of the API; `sendCycleRequest` uses it.

`apiErrorText` and the date formatter (now `formatWorkspaceDate`) moved from `review-templates` to `web/src/utils/`, because two features use them and a feature does not import another one. A refactor: the web suite stayed green.

## Browser check

Local servers, signed in with sign-in data that the user gave in chat. No save and no submission was sent.

| Check                                          | Result                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| Administrator opens the demo Self from its row | Read only, "Only the evaluator can change this review", no console error         |
| Back                                           | Returns to the list with the cycle filter                                        |
| Seed submitted review (`...0202`)              | "This review is submitted", answers 4 and 4                                      |
| Own HR review                                  | "Waiting for the Self stage."                                                    |
| Unknown id; `manager` on the Self of `user`    | Not-found page                                                                   |
| `user` on own Self                             | Editable; Submit with nothing marks the 4 required questions and opens no dialog |
| `user`, unsaved text, Back                     | Leave dialog; Leave returns to the filtered list                                 |
| `manager` on own review                        | Locked, "Waiting for the Self stage.", no action                                 |
| Width 320                                      | No horizontal page scroll; controls at least 44 px high                          |
| Dark                                           | Not verified visually on this page                                               |

## Live demo

Local database, the demo cycle, in the browser. Each account signed in with sign-in data that the user gave in chat.

| Step                                               | Writes                                        | Result                                                                                                    |
| -------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `user` fills the Self review by keyboard only      | none                                          | Tab reaches every control; the selects open and choose with Enter and the arrows; the focus outline shows |
| `user` saves the draft                             | draft                                         | "Draft saved.", In Progress in the summary and in the list; a reload keeps the five answers               |
| `user` presses Submit, then Cancel                 | none                                          | Focus starts on Cancel and returns to "Submit review"; still In Progress                                  |
| `user` submits                                     | submission, not reversible in the application | "Review submitted.", read only with the answers, the list says Submitted                                  |
| `manager` opens the list                           | none                                          | The Manager review changed from Locked to Not Started, and its form is editable                           |
| `manager` saves a draft                            | draft                                         | "Draft saved.", In Progress                                                                               |
| `manager` submits                                  | none                                          | Refused with the Acc-005 message at form level; still In Progress, the answers kept                       |
| Administrator opens the Self                       | none                                          | The submitted answers show, read only                                                                     |
| Administrator opens the Manager review             | none                                          | "No answer" on each question: the draft of the manager is hidden (PRD 8.3)                                |
| Administrator opens the HR review and the register | none                                          | HR locked, "Waiting for the Manager stage."; the register says 1 submitted of 3                           |

No console error. State of the demo cycle now: Self submitted, Manager in progress (it waits for verified accomplishments, phase 2), HR locked.

The demo found that focus fell to the page body after an action. After the fix, a second refused submission of `manager` kept the focus on "Submit review" in the browser (it writes nothing). The focus after a save and after a successful submission is proven by tests only.

The user ran this read-only query on the local database after the demo. It returned exactly the four expected rows (the unlock and the submission share one time), and no row for the refused submissions:

```sql
SELECT a.action, s.perspective, e.first_name || ' ' || e.last_name AS actor, a.occurred_at
FROM pms.audit_events a
JOIN pms.assignments x ON x.assignment_id = a.entity_id
JOIN pms.cycle_stages s ON s.stage_id = x.stage_id
LEFT JOIN pms.employees e ON e.guid = a.actor_id
WHERE a.entity_type = 'assignment' AND x.cycle_id = '734c8be0-be9a-4f0a-b8f4-1548110ed534'
ORDER BY a.occurred_at, a.action;
```

Expected: `draft_saved` (self), then `stage_unlocked` (manager) and `submitted` (self) with the same time, all by the `user` employee; then `draft_saved` (manager) by the `manager` employee. No `submitted` row for the manager.

## Gaps

| Item                                                                           | Trigger or owner                                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| No menu item is marked on `/reviews/<id>`; the HR "Reviews" group shows closed | A rule for the detail path in `workspace-layout.tsx`, when the user asks |
| PRD Rev-006 feedback, HR reopen (Rev-005), accomplishments (phase 2)           | As in the 1A handoff and the plan                                        |
| 200 percent zoom, `next build`                                                 | Not run                                                                  |

## What older handoffs got wrong

- `2026-11-26-reviews-phase-1a-backend.md` says that phase 1B is not started and that the converter sends a choice as text. Both are done.

## File inventory of phase 1B

All uncommitted.

| File                                                                                                                                                                                                                                                                 | Change             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `web/src/app/(workspace)/reviews/[assignmentId]/` `page.tsx`, `review-content.tsx`                                                                                                                                                                                   | New                |
| `web/src/features/evaluations/components/` `evaluator-scoring-form.tsx` (rewritten), `review-question-field.tsx` (new); `services/assessment-request.ts`                                                                                                             | Form and converter |
| `web/src/features/review-cycles/` `components/review-summary.tsx`, `services/review-response.ts` (new); `api/review-cycle-requests.ts`, `services/review-cycle-reader.ts`, `services/cycle-request.ts`, `components/reviews-table.tsx`, `components/review-list.tsx` | Read, send, link   |
| `web/src/types/review-action.ts` (new), `review-question.ts` (removed)                                                                                                                                                                                               | Types              |
| `web/src/utils/api-error-text.ts` (moved), `workspace-date.ts` (new); the importers in `review-templates`, `review-cycles`, and `tests/unit/api-error-text.test.ts`                                                                                                  | Shared helpers     |
| `web/tests/` `unit/assessment-request.test.ts`, `integration/review-response.test.ts`, `component/evaluator-scoring-form.test.tsx`, `component/review-page.test.tsx` (new), `component/review-list.test.tsx`                                                         | Tests              |
| `docs/system-architecture.md`, `docs/project-structure.md`                                                                                                                                                                                                           | Routes and files   |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/handoffs/2026-11-26-reviews-phase-1b-web.md and the 1A handoff.
Phase 1 is done and was shown live.
Plan phase 2 (accomplishments) test first, with the advisor, and wait for the approval of the user.
Commit nothing until the user asks. The user runs all SQL.
```
