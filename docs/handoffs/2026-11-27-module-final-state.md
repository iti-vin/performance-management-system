# Handoff: state of the review modules after the live runs

Date of this state: 2026-11-27. Branch `main` at `9f86101`, nothing committed, no pull request (the user asked to wait). Read first: `2026-11-27-module-closeout.md`. This file corrects it: the peer cycle ran to a release, and the "Goals entry" of the sample is built.

## Verified after the last change

`pnpm test` (shared-types 155, backend 870 in 41 files, web 992 in 80 files), `pnpm --filter @pms/database test` (21), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass.

## Peer cycle, run live to a release

`ZZ live peer` (`9e1f2321-43f2-4494-b136-75a833a622f2`): behavioral only, self, manager, peer (two peers, minimum 2), and HR. All writes were approved by the user and made with the local test accounts.

| Step                    | Seen                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch                  | Self open, the rest locked                                                                                                                                                               |
| Submissions             | Each stage opens after the one before. HR opens only after both peers                                                                                                                    |
| Before the release      | The progress tab and the review of the other peer name "Anonymous peer" and show no answer. The employee lists only their own review. The employee and the manager get 404 on the result |
| Finalize                | Behavioral 4.00: all observed ratings pooled (Res-006). Goals "Not rated"                                                                                                                |
| Release (in the screen) | The boxes start from the choice of the wizard: employee off, manager on                                                                                                                  |
| After the release       | The employee gets 404 and does not list it. The manager and HR read it. Peers show pooled, with no name and no date                                                                      |

## Built in this part

| Item                                                                                                                                                                                                                                                                                                         | Red                                                                                      | Green                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History: a stage that a review opened was masked by the stage of the row, not of the cause. A manager who is also a peer showed as "Anonymous peer" on one of two like rows                                                                                                                                  | `cycle-history` 1 failed, 7 passed                                                       | 8                                                                                                                                                                                            |
| Template detail, version, and History routes answered 400 for the seed ids (`00000000-...`). They use `ParseGuidPipe` now                                                                                                                                                                                    | `seed-id-routes` 3 failed                                                                | 3. The History tab of the seed cycle loads                                                                                                                                                   |
| Goals entry of an employee: the record of one cycle with a Review Cycle choice that names each state. The record of the address opens, else the report of a running cycle that waits for the employee (returned, then draft). Unsaved values are asked about before a change. Managers and HR keep the lists | `goals-entry` 6 failed, 2 passed; then 5 failed, 6 passed for the default and the labels | 11. Seen live as the employee. Guards proven by temporary changes: finished cycles count (1 failed), own-only check dropped (1), every role opens a record (1), any address record opens (1) |

## Anonymity gap found in the live run, not fixed

| Issue                                                                                                                                                                                           | Rating | Proof and reference                                                                                                                                                                                                                                                                               | Proposed default                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A peer who can also read the result learns the answer of the other peer. The chooser offers the manager of the participant, the HR evaluator, and HR administrators, and readiness accepts them | MEDIUM | Live: in `ZZ live peer` the manager, one of two peers, reads the pooled peer rating 4.5 and both peer texts after the release. With their own answer known, the other follows. The same holds for an HR administrator who is a peer. Res-008: a respondent views only their own response. CWE-359 | Decision D12: readiness refuses, and the chooser leaves out, a peer who is the current manager of the participant, the HR evaluator of the cycle, or an HR administrator |

The history checks and the reader checks did not cover a reader who is also a respondent.

## Smoke read of every route

297 reads as the administrator, the manager, and the employee, over 12 cycles, 9 KPI templates, and 3 behavioral templates: no answer outside the expected one (200 for the allowed reads, 403 for the HR routes of others, 404 for the results of others). Before the id fix, five administrator reads answered 400.

## State of the modules

| Module                   | Built                                                                                                    | Seen live                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| KPI goal templates       | Create, publish, version, archive, audit, version history                                                | Archive of a behavioral template; version history of both                                  |
| Behavioral templates     | Same                                                                                                     | Same                                                                                       |
| Review cycles            | Wizard, readiness, schedule, launch, extension, cancellation, history, attention list, result visibility | Wizard save, launch, extension, attention list, history. Timer activation: due 28 November |
| KPI accomplishments      | Report, submit, verify, return, history, Goals entry                                                     | Yes                                                                                        |
| Assessments              | Own reviews, stage order, reopen, earlier versions, anonymity. **Anonymity gap: D12**                    | Peer cycle yes; upward not run                                                             |
| Finalization and results | Finalize, release, scope, export, visibility                                                             | Yes. The saved export file was not found; its content was checked                          |

## Open

Needs the senior developer or the organization: D12 (above), D1 (HR as participant, the open MEDIUM security finding), D2 (HR approval of the scoring policy, needed for production), D3 (Team Reviews tab), D4, D5, D6 (the manager stage due before the accomplishment deadline is still accepted), D7, D8, D9, D10 (retention, Tpl-G-007), the department shown on completed reviews, and PRD section 7. Their database needs the migration scripts before this code runs.

Open without a decision: the upward stage and a second company are not run; zoom, screen reader, and two writers at once are not checked; the console "unexpected response" entries did not recur in a fresh tab over Goals, Reviews, one review, and Results with no file edited (the likely cause is the reload of the development server during edits, not proven); template versions published before the audit rows show the name of today; visibility cannot change after a release. To check on or after 28 November: `ZZ live ready` is Active and `ZZ live blocked` is still Scheduled.

Not done in any check: the KPI and behavioral template rules marked Met before this work rest on their tests; they were not read line by line, and the sample frontend was not compared again.

## Files for the review of their owner

Both template controllers changed their id pipe. The Goals entry changed `goals-content.tsx`, `record-content.tsx`, and `accomplishment-record.tsx` (the owner of PRD section 7 is still an open question). The browser of the app is still signed in as the test employee.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-27-module-final-state.md.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
