# Handoff: behavioral company scope, NUL check on every route, and the plan of the pending work

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-security-audit-slices-3-4.md`.

## State

| Item                                                 | State                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Behavioral routes ignore the company (CWE-639, High) | Fixed, tests only. For review by the owner of the module                               |
| NUL character in texts of other modules (Low)        | Fixed for every route by a global pipe, tests only. `main.ts` is not covered by a test |
| KPI goal template routes ignore the company too      | Found, not changed: see Open                                                           |
| Phase 3 (deadline extension, HR reopen) and later    | Not started                                                                            |

Verified on 2026-11-26 after the last change: `pnpm test` (shared-types 132, backend 574 in 28 files, web 800 in 66 files), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass. The database test did not run again: no database file changed.

## Red and green runs

| Part             | Command                                                 | Red                 | Green                       |
| ---------------- | ------------------------------------------------------- | ------------------- | --------------------------- |
| Company scope    | `pnpm --filter @pms/backend test behavioral-assessment` | 6 failed, 46 passed | 568 in the full backend run |
| Global NUL check | `pnpm --filter @pms/backend test global-pipes`          | 5 failed, 1 passed  | 574 in the full backend run |

The passing test of the red run checks that clean input stays unchanged, which held before the check existed.

## Changes for the owners

| File                                                                     | Change                                                                                                                                                                                                      |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `behavioral-assessment.service.ts`                                       | `list`, `getById`, `update`, `publish`, and `createVersion` take the signed-in account and read inside its company. Another company answers 404. An account with no company is refused by `CompanyResolver` |
| `behavioral-assessment.controller.ts` and both specs                     | Pass the user id                                                                                                                                                                                            |
| `common/pipes/nul-character.pipe.ts`, `global-pipes.ts` (new), `main.ts` | A body, query, or parameter with a NUL character answers 400. It applies to every module                                                                                                                    |

## Decisions of the user on 2026-11-26

| Question                            | Answer                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Commit before the new phases        | Not now                                                                                                                                                |
| Live writes of the remaining phases | Tests first; ask before each write                                                                                                                     |
| The modules of the other developer  | Fix them                                                                                                                                               |
| Defaults                            | Phase 4 uses a timer with no new dependency; phase 5 scores as the PRD says (HR approval, Res-009, stays open); no Team Reviews tab without a decision |

## Order of the pending work

1. Phase 3: extension (Rec-001, Rec-002) and reopen (Rev-005, Rec-003 to Rec-005).
2. Slice 5, with one SQL script for the user: cycle description, remarks of each indicator, accomplishment deadline.
3. Phase 5: finalize, score, release (Res-001 to Res-007). A weight of 0 means absent, not zero.
4. Phase 6, then phase 4 (Cyc-008: a cycle that cannot activate stays Scheduled).
5. Phase 7 (needs schema for several peer evaluators), then the "Assessment Details" screen.
6. A final `security-auditor` pass.

The tables of finalization, release, and reopen reasons exist already (`pms.evaluation_snapshots`, `cycles.finalized_at`, `released_at`, `assignment_responses.reopen_reason`).

## Open

- The KPI routes `list`, `getById`, `update`, `publish`, and the new version take no company condition (`kpi-goals.service.ts` near lines 211 to 374). The same class as the fixed finding. Not verified line by line and not part of the approval of 2026-11-26.
- The behavioral comment "Like the KPI route" is removed with the fix.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-26-company-scope-and-nul-all-routes.md.
Build phase 3 test first, with the advisor. Ask me before any write to the database.
Commit nothing until I ask. I run all SQL.
```
