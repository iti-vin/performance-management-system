# Handoff: KPI accomplishments, phase 2A: contract and backend

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed.

## Objective

Phase 2 of the plan in `2026-11-26-reviews-three-roles-phase-0.md` (PRD section 7, Acc-001 to Acc-008): the employee reports actual results against the frozen KPI indicators, and the current manager verifies or returns them. A verified record opens the manager assessment (Acc-005). Phase 2A is the shared contract, the data step, and the API. Phase 2B, the web, is not started: `/goals` is a placeholder.

## State

| Item                                                                                                | State                                                                      |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Shared contract                                                                                     | Done, tested                                                               |
| A launch creates one draft record for each participant                                              | Done, tested with fakes. No cycle has launched against the database since  |
| Data script for cycles that were launched before                                                    | Written, tested as text, NOT run on any database                           |
| Five `/accomplishments` routes                                                                      | Done, tested with in-memory repository fakes                               |
| Live on the local database: the administrator reads one record; refused requests of the three roles | Passed                                                                     |
| Live: an employee reads their own record, and a manager reads a team record                         | Not run: no such record exists until the data script runs                  |
| A real save, submission, or decision against PostgreSQL                                             | Not run: it writes, and the demo cycle has no record until the script runs |
| Web                                                                                                 | Not started                                                                |

Verified on 2026-11-26, from the repository root: `pnpm test` (shared-types 123, backend 532 in 27 files, web 575 in 54 files), `pnpm --filter @pms/database test` (18), `pnpm lint`, `pnpm typecheck`, and `pnpm --filter @pms/backend exec tsc --noEmit -p tsconfig.json`: all pass.

Red runs, each before its code, against compiling stubs for the backend:

| Test                                      | Red              | Green            |
| ----------------------------------------- | ---------------- | ---------------- |
| shared `accomplishment.test.mjs`          | 5 fail, 118 pass | 123 pass         |
| database, the data script and the seed id | 2 fail           | 18 pass          |
| launch creates the records                | 1 failed         | 439 pass         |
| service, `list` and `get`                 | 25 failed        | 25 pass          |
| service, `saveActuals` and `submit`       | 31 failed        | 56 pass          |
| service, `decide`                         | 18 failed        | 74 pass          |
| controller                                | 19 failed        | backend 532 pass |

Mutations, each turned a test red and was restored: the value rule of the contract; the `NOT EXISTS`, the active state, and the goals weight of the script; the goals weight of the launch.

## Step for the database owner

Run `packages/database/migrations/2026-11-26-accomplishment-rows-for-active-cycles.sql` (the `psql` command is in its header, or the pgAdmin Query Tool). It adds one draft record for each participant of an active cycle where the goals weight is above 0. It changes no schema and no existing row, and a second run adds nothing. It ends with a check query: for each such cycle, `records` equals `participants`. The database of the other developer needs the same script.

## First check after the script

Read only. Expected for the demo cycle `734c8be0-be9a-4f0a-b8f4-1548110ed534`, and not verified yet:

| Account       | Expected                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `user`        | Lists the record with `isOwn` true; the detail has `canEdit` and `canSubmit` true (the period ended 2026-11-25) and 5 indicators |
| `manager`     | Lists the same record with `canDecide` false; the detail shows no values and no remarks                                          |
| Administrator | Lists this record and the seed record                                                                                            |

The manager row is the first live run of the team rule. The applied assignment of the manager takes effect on 2026-11-26, and the code includes that day.

The participant froze KPI version `b732b5e6-980e-4dfb-9118-3934c2cbc931`. Read as the current version of its template, it has 5 indicators named "Sprint Deliverable Completion", "helo", "enter", "a", and "name": test data that the demo will show.

## Contract

| Route                                  | Body                                  | Answers                                                                                                                            |
| -------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET /accomplishments`                 |                                       | 200 `accomplishmentListSchema`                                                                                                     |
| `GET /accomplishments/:id`             |                                       | 200 `accomplishmentDetailSchema`; 400 bad id; 404                                                                                  |
| `PUT /accomplishments/:id/actuals`     | `reportIndicatorActualsRequestSchema` | 200 the record; 400 bad body or an indicator of another record; 404; 409 submitted, verified, cycle not active, or deadline passed |
| `POST /accomplishments/:id/submission` | the same                              | 200 the record; the above, and 422 period running, a missing value, or a missing correction reason                                 |
| `POST /accomplishments/:id/decision`   | `{ outcome, reason }`                 | 200 the record; 400 a return with no reason; 404; 409 not submitted, cycle not active, or deadline passed                          |

- A report: `actuals` (one `{ indicatorId, actualValue }` for each indicator that has a value, at most 200, unique), `remarks`, `correctionReason`. Each text has at most 2000 characters. A value is a number of 0 or more, or null.
- A write replaces the whole report: an indicator that the body omits gets null, and remarks that the body omits are cleared. Send every field.
- `outcome` is `verified` or `returned`.
- A field of a 400 or 422 is `actuals.<indicatorId>`, `correctionReason`, or the body path.

## Rules and decisions

| Rule                                                                                                                                            | Reason                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| The launch creates the records. No record is created on a first save                                                                            | Cyc-006. The employee and the manager see the work from the start                                                   |
| An older active cycle needs the data script                                                                                                     | Its launch created no record                                                                                        |
| The employee reads and writes their own record in an active cycle                                                                               | PRD 7.3                                                                                                             |
| The current manager reads the records of their team in active cycles and decides on them                                                        | AUTH-004: a prior manager does not. This differs from a manager review, whose evaluator stays the one of the launch |
| An HR administrator reads every record of the company. They write only their own record, and decide only as the current manager of the employee | PRD 7.8: HR recovers schedules. The HR role gives no decision                                                       |
| Anyone else gets 404                                                                                                                            | AUTH-002: a refusal reveals nothing                                                                                 |
| Values and remarks of a draft or returned record are shown to the employee only. The submission history stays readable                          | PRD 7.3: a draft belongs to the employee                                                                            |
| A draft may be incomplete at any time before submission                                                                                         | Acc-002                                                                                                             |
| A submission needs the evaluation period to have ended (the day in Manila) and every value                                                      | Acc-002. Zero is a value                                                                                            |
| Each submission is a new version. A resubmission after a return needs a correction reason                                                       | Acc-003, Acc-008                                                                                                    |
| Verification compares nothing with a target                                                                                                     | Acc-004                                                                                                             |
| Every write by the employee or the manager stops after the verification deadline                                                                | Acc-006. Phase 3 lets HR extend it                                                                                  |
| A write locks the cycle for read, then the record for write. A decision reads the manager of the day inside its transaction                     | The order of launch and cancellation                                                                                |
| Audit: `actuals_saved`, `submitted`, `verified`, `returned` (with the reason), entity type `accomplishment`                                     | PRD 7.7                                                                                                             |

## Live check

Local database, the running backend. Accounts signed in with sign-in data that the user gave in chat. No request could write: each read, or named a record that does not exist, or carried a body that the API refuses.

| Request                                             | Result                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `user` and `manager` list                           | 200, empty: the demo cycle has no record yet                                                                     |
| Administrator lists                                 | 200, one row (the seed record `...0171`, status `submitted`), parses with the shared schema                      |
| Administrator reads `...0171`                       | 200, parses; 2 indicators, actuals 4 and 1 as numbers, 1 version; read only, "It waits for the current manager." |
| `user` and `manager` read `...0171`                 | 404, 404                                                                                                         |
| Each account reads an unknown id and a malformed id | 404, 400                                                                                                         |
| Save with an empty body; return with no reason      | 400 with the field                                                                                               |
| Save, submit, and verify on an unknown id           | 404                                                                                                              |
| Verify with no token                                | 401                                                                                                              |

## Security check of phase 2A

A manual pass over the controller, the service, the rules, the input check, and the contract. No finding.

| Checked                                                                                   | How                                               |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Authentication on all five routes                                                         | Controller test; 401 live without a token         |
| Company scope through the cycle; 404 for anyone without access                            | Service tests; 404 live for two roles             |
| Only the employee writes; only the current manager decides, never on their own record     | Service tests                                     |
| Draft and returned values hidden from others                                              | Service tests                                     |
| Bounded input: 200 values, 2000 characters; negative, text, and non-finite values refused | Contract tests and a run against the built schema |
| Queries                                                                                   | TypeORM conditions only, no SQL text              |

Open: the `security-auditor` pass of phase 2 as a whole runs after 2B, before the phase counts as done. A NUL character in a text field is not tested.

## Gaps and constraints for the next developer

- The writes have not run against PostgreSQL: the numeric values, the JSON snapshot, the row locks, and the launch that creates records are proven with fakes only.
- A database loaded from the old seed holds a malformed indicator id in the stored version of `...0191`. The seed is fixed, and the API leaves such a value out of the history.
- "Unreleased" (PRD 7.6) has no meaning until results exist (phase 5). Add the check there.
- PRD 7.2 asks for search and filters in the queue. The list has none. Add them when the list grows.
- Evidence files are not part of this phase.
- Not changed, outside this module: `GET /kpi-goals/00000000-0000-0000-0000-000000000041` answers 400 "uuid is expected". The KPI, behavioral, and employee controllers use `ParseUUIDPipe`, which refuses the seed ids; `common/pipes/parse-guid.pipe.ts` accepts them. Their owner decides.
- `web/src/features/position-goals/services/actuals-request.ts` is an unrouted scaffold: it joins one remark for each indicator into the one remarks text and sends no correction reason.

## File inventory of phase 2A

All uncommitted.

| File                                                                                                                                                                   | Change                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `packages/shared-types/src/dtos/accomplishment.schema.ts`, `test/accomplishment.test.mjs`, `src/index.ts`                                                              | New contract                                              |
| `packages/shared-types/src/dtos/evaluation.schema.ts`                                                                                                                  | Report and decision requests replace three unused schemas |
| `packages/database/migrations/2026-11-26-accomplishment-rows-for-active-cycles.sql`                                                                                    | New                                                       |
| `packages/database/seeds/kpi-accomplishments.sql`, `schema.test.mjs`                                                                                                   | Indicator id fixed; two tests                             |
| `backend/src/modules/review-cycles/services/` `accomplishments.service.ts` and `.spec.ts`, `accomplishment-rules.ts`                                                   | New                                                       |
| `backend/src/modules/review-cycles/services/` `review-cycles.service.ts` and `.spec.ts`, `cycle-facts.ts`                                                              | Launch creates the records; `currentTeamOf`               |
| `backend/src/modules/review-cycles/services/review-assessment.service.spec.ts`, `testing/memory-table-spec.ts`                                                         | The repository fake moved to a shared file                |
| `backend/src/modules/review-cycles/entities/` `accomplishment.entity.ts`, `accomplishment-actual.entity.ts`, `accomplishment-version.entity.ts`                        | Full record; two new                                      |
| `backend/src/modules/review-cycles/controllers/` `accomplishments.controller.ts` and `.spec.ts`, `parsed-input.ts`, `reviews.controller.ts`, `review-cycles.module.ts` | Routes, shared input check, registration                  |
| `docs/system-architecture.md`, `docs/project-structure.md`                                                                                                             | Routes and files                                          |

## Phase 2B, next

1. Reader and server actions for the five routes; check each body against the shared schema.
2. `/goals` (the list) and `/goals/[id]`. The employee and manager menus already link `/goals`; add no HR menu entry without a decision.
3. Adapt `features/position-goals`: `KpiReportingForm` gets one remarks field and a correction reason; `KpiVerificationPanel` decides. A feature does not import another feature: compose in `app/`.
4. Field errors by `actuals.<id>`, confirmation before submit and verify, a warning on unsaved changes, focus on the result, and a back link that rebuilds the list state.
5. Live demo with one approval for its writes: `user` saves and submits; `manager` returns with a reason; `user` corrects and resubmits; `manager` verifies and then submits the manager review (the gate opens); the administrator answers the HR review. The data script and the first check come first.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/handoffs/2026-11-26-reviews-phase-2a-backend.md, and web/llm.txt.
Ask whether I ran the 2026-11-26 accomplishment data script, then do the "First check after the script". Build phase 2B test first, with the advisor.
Ask before the live demo writes. Commit nothing until I ask. I run all SQL.
```
