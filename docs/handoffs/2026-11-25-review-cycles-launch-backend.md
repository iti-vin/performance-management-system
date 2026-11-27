# Handoff: Review Cycles, phase 3A (launch in the backend)

State at 2026-11-25. Uncommitted on `main`. Phase 3 is split: 3A is the launch route and its rules (this handoff), 3B is the web (the launch and cancel dialogs, not started). Read it with the handoffs before it.

## Objective

`POST /review-cycles/:id/launch` turns a ready draft into an active cycle: it freezes the templates, creates the assignments, and records who did it (PRD Cyc-005, Cyc-006, Cyc-009).

## Current state (verified)

Failing test first on every slice. Commands run from the repository root.

| Slice                                                                                                                                | Command                                           | Red     | Green   |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ------- | ------- |
| An inactive participant is a participants-step problem, alone                                                                        | `pnpm --filter @pms/backend test cycle-readiness` | 2 fail  | 23 pass |
| Inactive participant, manager, and HR evaluator in the service; the latest applied manager; one query shape for readiness and launch | `... test review-cycles.service`                  | 5 fail  | 41 pass |
| `launch`: lock, state check, readiness after the lock, 422, assignments, states, audit, rollback, retry, version freeze              | same                                              | 13 fail | 54 pass |
| `POST :id/launch` route                                                                                                              | `... test review-cycles.controller`               | 2 fail  | 9 pass  |

Totals after the last change (the live launch changed no code): shared-types 103, backend 336 (22 files), web 439, database 15. Lint and typecheck of the backend are clean. The web and shared-types were not touched.

None of the launch tests passed on the stub. The mocks cannot show the real row lock: see "Not done".

## Live check (ran, nothing written)

Against the running API, signed in as the seed admin `lebronjames`. A refused launch throws inside the transaction and rolls back, so these wrote nothing:

- `POST :id/launch` on the active seed cycle and on the cancelled throwaway cycle: 409 "Only a draft cycle can be launched." On an unknown GUID: 404. On `abc`: 400. With no token: 401.
- The running backend has the new route, the new entity columns, and the active-status rules: readiness of the saved draft is still empty, and readiness of the seed cycle still lists only the HR evaluator (employee 23 has no admin login). So the real `status` values match `'active'`.
- The draft stayed a draft with 0 assignments after the refused calls.

## Live launch (ran, with the user's yes; cannot be undone)

Two `POST :id/launch` at once on the ready draft "ZZ wizard check (edited)" (id `7d47ea3a-ec86-4120-abde-c13b7b14dbf4`), as the seed admin `lebronjames`:

- The statuses were 200 and 409. The loser answered "Only a draft cycle can be launched.": it waited on the row lock, saw an active cycle, and created nothing. This is the real proof of the lock and the state check, which the mocks cannot give.
- The register then showed the cycle active with 1 participant and **3 assignments** (one participant, three stages), 0 submitted. A third launch answered 409.
- The cycle stays active in the local database. It can only be cancelled now, which leaves 3 assignments under a cancelled cycle: see the constraint for the assessment module below. It has two `audit_events` rows (created, updated) and now a `launched` row, all append-only.

## What exists now

- `POST /review-cycles/:id/launch` (admin only). In one transaction: lock the cycle row; 404 if it is not in the company; 409 if it is not a draft; read the facts and run `checkReadiness` (so a save that committed meanwhile is seen), and answer 422 with each problem as a detail (`field`, `code` = the step, `message`) when there is any; freeze the current published version of each template; insert the assignments; set the state `active` and `activation_date` to today; write one `launched` audit row with the counts.
- One assignment for each participant and stage. The self stage is answered by the participant, the manager stage by the manager of the day (the applied assignment with the latest effective date up to today, and only when that manager is active), and the HR stage by the evaluator that the stage names. The first stage is `not_started`, later ones `locked`, each with the deadline of its stage.
- A retry gets 409, with no second set of assignments.
- `cycle-facts.ts` reads the facts through repositories that it is given: `GET readiness` passes the injected ones, launch passes those of its transaction. `appliedManagersOf` is the one function that decides the manager, for readiness (is the employee in the map) and for launch (who is the manager).

## Decisions and reasons

1. Readiness runs after the lock, inside the transaction. Run before the lock, a `PUT` could commit in the gap and launch would use the old facts.
2. Idempotency is the lock plus the state check. The assignments are a plain insert, **not** `ON CONFLICT DO NOTHING` as the plan said. No conflict is reachable: each stage has its own id and the self evaluator is the participant, so a conflict could only come from a bug, and ignoring it would hide the bug. A unique violation rolls the launch back loudly.
3. The version freezes at launch. A template published again since the last save moves the cycle onto its new version, through the same resolver as a save, and the audit row records how many moved (`refrozenCount`). A template that was archived is a readiness problem (422) before it. A position change of an employee since the last save makes the resolver refuse (400): HR re-saves the draft. Not covered by a live check.
4. The inactive-employee gap of the earlier handoffs is closed, because launch would otherwise assign work to an inactive employee: an inactive or departed participant is a participants-step problem (one, not a pile), and an inactive HR evaluator or manager is not eligible.
5. "Today" is still the UTC date (the known gap against Asia/Manila).
6. Opening a later stage by date, and by the submitted state of the stage before, belongs to the assessment module (Rev-003). Not built.

## What an older handoff got wrong

- The plan and the first handoff said "insert the assignments with `ON CONFLICT DO NOTHING`". Decision 2 replaces it.
- The 2A and 2B-2 handoffs list "readiness does not filter inactive employees" as a gap for later. It is closed here.
- They also say the version freezes at launch. That is true only from this change (decision 3).

## Dead ends

- A scripted edit of the service removed more than I meant (the methods `getById` and `list`). The suite caught it at once (many failing tests and type errors) and I restored both from the earlier code. Edits to this file now check the method list afterwards.

## File inventory

New: `backend/src/modules/review-cycles/services/cycle-facts.ts`. Changed: `services/review-cycles.service.ts` and spec, `services/cycle-readiness.ts` and spec, `entities/assignment.entity.ts` (the columns that launch writes), `controllers/review-cycles.controller.ts` and spec. Docs: this file, the index row, `system-architecture.md`.

## Not done

- 3B, the web: the Launch button on the edit page (disabled while readiness has problems and while the wizard has unsaved changes: launch uses the saved draft), the dialog that names the cycle and says what cannot be undone, the `?saved=launched` notice, the cancel of a draft with a reason (add the shared `cancelReviewCycleRequestSchema` there, where it has a caller). Cancelling an active cycle waits for a cycle detail page.
- A live 422 (the envelope with the details) needs a draft that is not ready, which is one more write. It is covered by the unit test and by the filter, which passes `details` through.
- The 403 for a non-admin, `next build`.

## Constraint for the assessment module

Cancelling an `active` cycle (built in phase 1, before assignments existed) now leaves `not_started` and `locked` assignments under a cancelled cycle, and the `assignments.state` check has no cancelled value. Every read or write of an assignment in the assessment module (Rev-001 to Rev-007) must therefore require its cycle to be `active`. Without it PRD 6.3 ("no new work" after a cancel) breaks the day that module ships.

## Opening prompt for 3B

```text
Basahin muna ang AGENTS.md, CLAUDE.md, backend/AGENTS.md, web/AGENTS.md, web/llm.txt, web/DESIGN.md, at ang mga handoff ng Review Cycles sa docs/handoffs, lalo na ang 2026-11-25-review-cycles-launch-backend.md. Tawagin mo si Hersvin na "boss hersvin". Taglish at Caveman ultra ang sagot. Failing test muna sa bawat slice, at i-report ang red at green run na may command. Wag mag-run ng SQL sa database ko: SQL script lang ang gawin mo, ako ang magru-run. Walang commit o push hanggang sabihin ko.

Phase 3B ng Review Cycles: ang web ng launch. Sundin ang seksyong "Not done" ng handoff ng 3A. Tawagin ang advisor bago magsulat ng code at bago sabihing tapos.
```
