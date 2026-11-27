# Handoff: Review Cycles, phase 2A (participants, readiness, options)

State at 2026-11-25. Uncommitted on `main`. Phase 2 of the plan is split in two: 2A is the shared contract and the backend (this handoff), 2B is the web wizard (not started). Read it with `2026-11-25-review-cycles-backend-and-list.md`.

## Objective

A draft cycle keeps its participants with the frozen template versions, can say what blocks its launch, and the wizard can ask what it may offer. The PRD rows are Cyc-001 to Cyc-005.

## Current state (verified)

Failing test first on every slice. Commands run from the repository root.

| Slice                                                                                               | Command                                           | Red                                 | Green    |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------- | -------- |
| Readiness rules, a pure function (`cycle-readiness.ts`)                                             | `pnpm --filter @pms/backend test cycle-readiness` | 17 fail (the stub returned `[]`)    | 19 pass  |
| Participant resolver (`participant-resolver.ts`)                                                    | `... test participant-resolver`                   | 13 fail                             | 14 pass  |
| Shared create schema: participants, stage `evaluatorId`, stage order                                | `pnpm --filter @pms/shared-types test`            | 3 fail                              | 97 pass  |
| Deadlines compare as instants, not text                                                             | same                                              | 1 fail                              | 98 pass  |
| Backend DTO: participants (stub had no decorators)                                                  | `... test review-cycle-contract`                  | all fail (the key had no validator) | 32 pass  |
| Service: create and update save participants                                                        | `... test review-cycles.service`                  | 3 fail                              | 27 pass  |
| Service: the detail returns participants                                                            | same                                              | 1 fail                              | 28 pass  |
| Service: `readiness`                                                                                | same                                              | 5 fail                              | 33 pass  |
| Peer and upward stages are not supported (new rule, and `checkStages` split into smaller functions) | `... test cycle-readiness`                        | 2 fail                              | 21 pass  |
| Service `options`, controller `GET options` and `GET :id/readiness`, route order                    | `... test review-cycles`                          | 3 fail                              | all pass |

Totals after the last change: shared-types 98, backend 311 (22 files), web 312, database 15. `pnpm lint` and `pnpm typecheck` are clean.

Stub-passing tests, each proven by a one-line mutation that went red and was restored:

- `finds nothing wrong with a complete cycle`: with the stage order check flipped it fails.
- `does not ask for a manager when no stage is a manager stage`: without the `manager` stage guard it fails.
- The resolver `empty request` case: without the early return it fails (`employees.find` is called).

Live check against the running backend and the local database, signed in as the seed admin `lebronjames` (no write sent):

- `GET /review-cycles/options` returns the employees, KPI and behavioral published templates, and the HR evaluators of the company.
- `GET /review-cycles/…0141/readiness` on the seed cycle returns one issue: `stages.2.evaluatorId`, "must be an HR administrator of the company". The seed HR stage names employee 23, who has no admin login (decision 3). This is the expected result.
- The backend boots with the new module wiring (the read-only repositories of the other modules are registered).

## What exists now

- `PUT /review-cycles/:id` and `POST /review-cycles` take `participants: [{ employeeId, kpiTemplateId?, behavioralTemplateId? }]` (up to 500; the DTO and the shared schema agree). They resolve and save the participants in the same transaction as the stages and the audit row. `PUT` replaces the old rows.
- `GET /review-cycles/:id` returns `participants` with the frozen version ids.
- `GET /review-cycles/:id/readiness` returns `{ step, field, message }[]`. `step` is `details`, `participants`, `kpi`, `behavioral`, or `stages`.
- `GET /review-cycles/options` (declared before `:id`, with an assertion in the controller spec) returns what the wizard may offer.

## Decisions and reasons

1. No column for the default behavioral template. `PUT` replaces the whole content, so the request carries one template id per participant. The wizard expands a default and its position overrides on the client. On re-edit, the web rebuilds the overrides from the participant rows.
2. KPI match: with no `kpiTemplateId`, the one published template of the company whose `position` equals the position of the employee, exact text. None or several leave the version empty, and readiness asks HR to choose. A chosen id must be published, in the company, and for the same position (Cyc-004).
3. HR evaluator: an employee of the company that has an admin login (`users.user_role_id = 1`), and who is not a participant of the same cycle. The seed HR stage names employee 23 (Human Resources Officer, no login), so the seed cycle fails readiness. Accepted: it is already `active`, and readiness matters for a draft. Change the seed or the rule if boss hersvin disagrees.
4. Participants must be active employees of the company with a GUID. One query returns them: a missing row (unknown, other company, inactive, no GUID) answers 400 without saying which. Duplicate ids keep one row.
5. A stored version whose template was archived since: readiness says "no longer published". The cycle keeps its frozen version.
6. Readiness is a pure function (`checkReadiness`) with a fixed `now`. The service only gathers facts. Phase 3's launch reuses it. A participant with no applied manager (`manager_assignments.status = 'applied'`, effective on or before today) is an error at the stages step when a manager stage exists. "Today" is the UTC date; the PRD says Asia/Manila: unverified edge near midnight.
7. Expired work window: any stage deadline, or the verification deadline, earlier than now.
8. Deadlines compare as instants (`Date.parse`), not as text: `…+08:00` and `…Z` strings order wrongly as text. This also fixed the verification versus assessment rule of the shared schema.
9. The other modules are read only through their entities in `ReviewCyclesModule`, always with a company filter. `BehavioralAssessmentService.list()` is not used: it is not scoped by company. No other module changed.
10. Peer and upward stages are a readiness error ("not supported yet"), and only an HR stage takes the HR-administrator rule. `cycle_stages.evaluator_id` holds one person per stage, but a peer stage needs one evaluator per participant, so the model cannot hold them. The DTO still accepts the values, because the shared enum lists them. Trigger: HR asks for 360 stages (Cyc-003), with a table of evaluators per participant.
11. The options and the detail shapes live in the service for now. A shared schema lands in 2B, with the web caller.

## What an older handoff got wrong

The phase 1 handoff (and the plan it carries) puts the manager check in launch (phase 3). It now runs in readiness, so a draft shows it before launch, and launch reuses `checkReadiness`. The detail and options response schemas, which that handoff defers, are still deferred to 2B.

## Dead ends

- `IsUUID` and `ParseUUIDPipe` refuse the dev ids: the `ParseGuidPipe` and a GUID regex stay (phase 1 handoff).
- A heredoc that held both quote styles broke the shell: edit scripts now live in files.

## File inventory

New (backend, `backend/src/modules/review-cycles/`): `services/cycle-readiness.ts` and spec, `services/participant-resolver.ts` and spec, `entities/manager-assignment.entity.ts`. Changed: `services/review-cycles.service.ts` and spec, `controllers/review-cycles.controller.ts` and spec, `dtos/create-review-cycle.dto.ts` and `review-cycle-contract.spec.ts`, `entities/cycle-participant.entity.ts`, `review-cycles.module.ts`, `backend/src/app.module.ts`. Shared: `packages/shared-types/src/dtos/review-cycle.schema.ts` and `test/review-cycle.test.mjs`. Docs: `system-architecture.md`, `project-structure.md`, this file, the index row.

## Not done (2B, the web wizard)

The plan table of phase 2, rows 2.7 to 2.11, is not started:

- Adapt only `cycle-details-form` (DB codes for the review type, no `description`), `participant-selection`, a simple template-mapping step, and `evaluation-workflow` trimmed to self, manager, and HR, all typed from shared contracts. Mark `goal-mapping-editor`, `goal-readiness`, `release-settings`, `cycle-launch-summary`, and the peer and upward stages "not used in this phase". They model operational goals, the release policy (Section 9), and the mock `@/types/employee`, which this schema does not have.
- The editor (`/review-cycles/new` and `/review-cycles/[cycleId]/edit`) saves a draft with the exact body, shows the server reason, keeps the input, and asks before it discards edits (reuse `useUnsavedChangesWarning` and the leave dialog of the behavioral editor).
- A shared schema for the options and the detail response, and the readiness list rendered per step.

## Known small gap

`eligibleHrEvaluatorIds` does not filter on `status = active`, while `options` offers only active employees. An inactive admin stays "eligible" in readiness. Fix when a real case appears.

## Throwaway draft check (ran live, with the user's yes)

Against the running backend and the local database (`localhost:5433`), signed in as the seed admin `lebronjames`. It left one cancelled cycle named "ZZ throwaway check (edited)" (id `48d7a667-6acc-4d07-bcfc-583cb5e4f243`) with two participants and four audit rows (`audit_events` is append-only, so they stay). Delete nothing by hand: the audit table has no delete path.

- `POST` create with one participant: 201, state `draft`, 1 participant row with the frozen position and the behavioral version, 3 stages. The foreign keys accepted the row.
- Readiness right after: one issue, the KPI step. The database has two published KPI templates for "Software Engineer", so the exact-position match is ambiguous, the KPI version stays empty, and readiness asks HR to choose. The rule works on real data.
- `PUT` with the same employee listed twice and a second employee: 200, two rows (the duplicate collapsed, `UNIQUE (cycle_id, employee_id)` held). Readiness listed the KPI issue of each, and the missing applied manager of the second employee.
- `PUT` with an unknown employee: 400 "not active employees of your company", and the two participants stayed (no partial mutation).
- `PUT` with a KPI template of another position: 400.
- The register counted the throwaway: 2 participants, 0 assignments, deadline of the last stage.
- Cancel with a reason: 200, state `cancelled`. Cancel again: 409. `PUT` after cancel: 409.

## Unverified

- The rollback of a failed insert in the middle of a transaction (the refused `PUT` stopped before the transaction, so it does not prove it).
- A 403 for a non-admin account.
- `next build`.
- The UTC versus Asia/Manila date of "applied on or before today".
- The company filter relies on exact text equality of `employees.company` with the template `company` (the same rule as the templates).

## Opening prompt for 2B

```text
Basahin muna ang AGENTS.md, CLAUDE.md, backend/AGENTS.md, web/AGENTS.md, web/llm.txt, web/DESIGN.md, at ang dalawang handoff: docs/handoffs/2026-11-25-review-cycles-backend-and-list.md at docs/handoffs/2026-11-25-review-cycles-participants-and-readiness.md. Tawagin mo si Hersvin na "boss hersvin". Taglish at Caveman ultra ang sagot. Failing test muna sa bawat slice, at i-report ang red at green run na may command. Wag mag-run ng SQL sa database ko. Walang commit o push hanggang sabihin ko.

Phase 2B ng Review Cycles: ang web wizard. Sundin ang seksyong "Not done (2B)" ng handoff ng 2A. Tawagin ang advisor bago magsulat ng code at bago sabihing tapos.
```
