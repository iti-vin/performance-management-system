# Handoff: reviews for the three roles, plan and phase 0 data

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed.

## Objective

The senior developer asks that the review modules work for all three roles (employee, manager, HR administrator), with the missing Review Cycles items finished, before work moves to other modules. The user approved the plan below and asked for phase 0.

Read first: `2026-11-26-review-cycles-security-fixes.md`.

## State

| Item                               | State                                                                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 SQL script and seeds       | Done. The user ran the script on the local database: COMMIT, and the check query returned one row (`27`, Software Engineer, Iging ManagerDotTech, `applied`, `2026-11-26`). `GET /employees` shows the position |
| Demo cycle                         | Done with the approval of the user: `ZZ demo three roles` (`734c8be0-be9a-4f0a-b8f4-1548110ed534`), saved, readiness empty, launched, 3 assignments                                                             |
| Reviews visible to the three roles | Verified live, see below                                                                                                                                                                                        |
| Phases 1 to 7                      | Not started                                                                                                                                                                                                     |

Verified on 2026-11-26: `pnpm --filter @pms/database test` 16 pass. The script has run on the local database of the user only.

Red runs: a first run failed for the wrong reason (the shell had removed backslashes from the new regular expressions; fixed). The red run before the change: 15 pass, 1 fail (the seed gave employee 27 no position). That run stopped at its first assertion, so the later ones were proven by mutations, each restored: without `AND position IS NULL`, without the `NOT EXISTS` block, and with the seed link set to `pending`, the test failed each time (15 pass, 1 fail).

## Live check after the launch

Local database. The cycle was saved and launched through the API as an administrator. Each role was then signed in, with sign-in data that the user gave in chat, to the API and to the browser.

| Role      | `/reviews`                                                                                    | Filters on the page               |
| --------- | --------------------------------------------------------------------------------------------- | --------------------------------- |
| `USER`    | 1 row: Self, own name as evaluator, Not Started, Dec 4, 2026                                  | Stage, Status                     |
| `MANAGER` | 1 row: Manager, the review of the `user` account, Locked, Dec 11, 2026                        | Stage, Status                     |
| `ADMIN`   | All 11 rows of the company; the demo cycle shows Self, Manager, and HR (Locked, Dec 18, 2026) | Cycle, Cycle state, Stage, Status |

The register shows the demo cycle as Active, 1 participant, 0 of 3 completed. No console error. This closes the open item of the security handoff: an account that is not an administrator sees its own assignments, and only those.

The demo cycle cannot be deleted in the application. It can be cancelled through the API, and the record stays.

## Why the employee and the manager saw nothing before phase 0

Read through the API as an administrator before the script ran: employees 26 (`manager`) and 27 (`user`) had no position. A participant needs a published KPI goal template of their position, and the manager stage needs an applied manager.

## Phase 0

Run `packages/database/migrations/2026-11-26-test-account-review-links.sql` (pgAdmin Query Tool, or the `psql` command in its header). It gives employee 27 the position Software Engineer and makes employee 26 their applied manager. It ends with a check query: one row, `Software Engineer`, `Iging ManagerDotTech`, `applied`, `2026-11-26`. The seeds hold the same two values. The database of the other developer needs the same script.

The demo cycle was created with these settings:

| Setting             | Value                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| Participant         | Employee 27                                                                                                     |
| KPI goal template   | Software Engineer. Two are published, so one must be chosen (`429c9433-66c2-48e0-880e-f627b509dc99`, version 2) |
| Behavioral template | Quarterly Performance, version 2 (`a89b227f-1516-4028-86f9-3edf0fa2b729`)                                       |
| Stages              | Self, Manager, HR; the HR evaluator is employee 24                                                              |
| Evaluation period   | 2026-10-01 to 2026-11-25: already ended, so actuals can be submitted in phase 2                                 |
| Deadlines           | Self 2026-12-04, manager 2026-12-11, HR 2026-12-18, verification 2026-12-31; assessment start 2026-11-26        |

## Plan

| Phase | Content                                                                      | PRD                              |
| ----- | ---------------------------------------------------------------------------- | -------------------------------- |
| 0     | Test data and a demo cycle                                                   |                                  |
| 1     | Open a review from the list, save a draft, submit, unlock the next stage     | Rev-001 to Rev-004, Rev-006      |
| 2     | Accomplishment record at launch, employee actuals, manager verification      | Cyc-006, Acc-001 to Acc-008      |
| 3     | Cycle details page, cancel of an active cycle, deadline extension, HR reopen | 6.9, Rec-001 to Rec-005, Rev-005 |
| 4     | Scheduling and activation, with repair of a cycle that cannot activate       | Cyc-006, Cyc-008                 |
| 5     | Finalize, score, release, result visibility                                  | Res-001 to Res-007, Cyc-007      |
| 6     | Choice of components (a weight of 0 means not applicable)                    | Cyc-001, Res-007                 |
| 7     | Peer and upward stages, anonymity threshold                                  | Cyc-003, Res-008                 |

Dependencies that fix the order:

- A manager assessment cannot be submitted while goals apply and the accomplishments are not verified (Acc-005). In phase 1 the manager can save a draft only, and the HR stage stays locked behind it.
- Finalization needs the submitted assessments and the verified accomplishments (Res-001).

## Defaults proposed, not yet confirmed

| Default                                                                           | Note                                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A stage opens per participant, when that participant's earlier stage is submitted | Rev-003 can also be read per cycle. The legacy source is not in this repository |
| Scheduled activation uses a timer in a provider, with no new dependency           | `AGENTS.md` asks before a new dependency                                        |
| Scoring follows the PRD                                                           | Res-009 needs HR approval before production                                     |
| HR chooses the peer evaluators                                                    | Needs a schema change                                                           |
| A review list never widens for a manager                                          | AUTH-002: being the subject gives no evaluator right                            |

Schema changes are likely for result visibility, the reason of a blocked schedule, and peers. The user runs all SQL.

## Open questions for the senior developer

- Does the user own PRD section 7 (accomplishments)? `.github/CODEOWNERS` names both developers for every path, and says nothing about modules.
- Are the manager assignment screens and My Team (section 10), the PIP referral, and notifications part of this order? The plan leaves them out.

## File inventory of phase 0

All uncommitted.

| File                                                                    | Change                                |
| ----------------------------------------------------------------------- | ------------------------------------- |
| `packages/database/migrations/2026-11-26-test-account-review-links.sql` | New                                   |
| `packages/database/seeds/employees.sql`                                 | Position of employee 27               |
| `packages/database/seeds/manager-assignments.sql`                       | The applied link of employee 27 to 26 |
| `packages/database/schema.test.mjs`                                     | One test                              |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-26-reviews-three-roles-phase-0.md.
Phase 0 is done: the demo cycle is launched and each role sees its reviews.
Plan phase 1 test first, with the advisor, and wait for the approval of the user.
Commit nothing until the user asks. The user runs all SQL.
```
