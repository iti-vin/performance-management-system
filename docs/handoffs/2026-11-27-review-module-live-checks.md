# Handoff: live checks of the review module

Date of this state: 2026-11-27. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-review-module-pending-closed.md` (state of the code, security report, open risks). This file replaces its "Not run" notes about the phase 7 script and its live check plan.

## State

| Item                            | State                                                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 7 SQL script              | Ran on the local database of the user, with permission for that script. The check query answered `cycle_peer_evaluators` and `evaluation_snapshots`. The other developer still needs it |
| Finalize and release            | Run live on "ZZ demo three roles". Permanent                                                                                                                                            |
| Results as employee and manager | Read live                                                                                                                                                                               |
| Schedule and Back to Draft      | Run live on a new draft                                                                                                                                                                 |
| Code                            | Not changed on this date. The last full run is in the earlier handoff                                                                                                                   |

## Live writes, all approved by the user, local database

| Write                                                                                                                              | Seen after it                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Submitted the reopened HR review of "ZZ demo three roles", answers unchanged                                                       | Submitted, all three stages Submitted                                  |
| Finalized that cycle                                                                                                               | Completed. One result: goals 4.10, behavioral 3.83, overall 3.97       |
| Released its results                                                                                                               | "Released on Nov 27, 2026"                                             |
| Created "ZZ schedule check" (`2021b26f-0fd6-41ae-8474-4a6cb31bcaf9`) as a draft, with a description and an accomplishment deadline | Both values came back in the wizard                                    |
| Scheduled it                                                                                                                       | Scheduled, "Starts on Apr 1, 2027", 0 assignments, no blocking problem |
| Back to Draft                                                                                                                      | Draft again. It stays a draft                                          |

## Checks of the numbers and the access

| Check            | Result                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Behavioral score | Ratings self 4 and 5, manager 3 and 3, HR 4 and 4: 23 / 6 = 3.83. Matches                                    |
| Overall          | (4.10 + 3.833) / 2 = 3.97, contribution of behavior 1.92. Matches                                            |
| Goals            | Three indicators met scored 5.00, two below scored 2.00. Component 4.10 by their weights                     |
| Employee         | `/reviews/results` lists the own result, and the detail opens. `/review-cycles` answers "HR access required" |
| Manager          | Lists and opens the result of the team member                                                                |

Before the release, only the administrator read the result in the screens. The 404 of an employee before release is covered by tests, not seen live.

## Not verified

1. A cycle with a peer or upward stage, live.
2. The activation of a scheduled cycle by the timer on its day (tests only).
3. Remarks of an indicator and an extension of the accomplishment deadline, live. Finalization of a cycle with a weight of 0.
4. The audit rows, concurrent writers on real PostgreSQL, a second company, dark theme, zoom, screen reader.

## Open

The open risks of the earlier handoff stand: an HR administrator who is a participant reads the reviews about themselves, no rate limit, HR approval of the scoring policy, the Team Reviews tab, and no way to remove one assignment. Nothing is committed.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/handoffs/2026-11-27-review-module-live-checks.md, and the handoff of 2026-11-26 that it names.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
