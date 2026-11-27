# Review modules: PRD check and remaining plan

Date: 2026-11-27. Branch `main` at `9f86101`, nothing committed. Updated the same day: all other gaps are built (`docs/handoffs/2026-11-27-remaining-gaps.md`), and G5 needs its SQL script. G7 and G8 are done (`docs/handoffs/2026-11-27-completed-read-and-history.md`). Source: `docs/product-requirements-document.md`, sections 2, 4 to 9, and the recovery rules of section 10, against the code of the working tree.

## Scope

In scope: KPI Goal Templates (4), Behavioral Assessment Templates (5), Review Cycles (6), KPI Accomplishments and verification (7), Assessments (8), Finalization and results (9), and recovery of a cycle (Rec-001 to Rec-006).

Out of scope until the senior developer says otherwise: PIP and its referral, 202 Files and NTE, Dashboard, My Team, Reports outside results, Employees, operational goals, manager assignment screens (Mgr rules), and notifications (decision D7).

## How this check was made

| Status  | Meaning                                                                     |
| ------- | --------------------------------------------------------------------------- |
| Met     | Code exists and automated tests cover it. Most rows were not run live again |
| Partly  | A part of the requirement or of its output is missing                       |
| Missing | No code                                                                     |

The KPI and behavioral template rules marked Met rest on their existing tests and routes. They were not read again line by line in this check. The sample frontend was not compared again.

## Requirement by requirement

### 4. KPI Goal Templates

| ID                                                                        | Status | Note                                                                                                       |
| ------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Tpl-G-001 create, edit, preview, publish, version, archive                | Met    | Archive on the details page (G1), seen live. Update and publish lock the template row                      |
| Tpl-G-002 to Tpl-G-005 indicators, weights, matrix, scale, preview        | Met    | Read line by line. A publication now needs a unit and a target for each indicator, and a name is not blank |
| Tpl-G-006 frozen versions                                                 | Met    | Fixed: an id of the request could move an indicator of another version. Seen live on two test drafts       |
| Tpl-G-007 immutable history, publication actor and time (production gate) | Partly | Publisher and time kept for each version (G2). No retention or deletion policy                             |
| 4.7 audit of changes                                                      | Met    | One row for each change (G3). No screen shows template rows: not seen live                                 |
| 4.9 version history output                                                | Met    | Version history on the details page (G4), seen live                                                        |

### 5. Behavioral Assessment Templates

| ID                                                                               | Status | Note                                                                                                              |
| -------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Tpl-B-001 create, preview, publish, version, archive                             | Met    | Archive route and action (G1), seen live                                                                          |
| Tpl-B-002 to Tpl-B-004 ratings, required answers, choices, default and overrides | Met    | Read line by line. Fixed: section and question ids of the request are ignored; a title and a prompt are not blank |
| 5.7 audit of changes                                                             | Met    | (G3). No screen shows template rows: not seen live                                                                |
| 5.9 version history output                                                       | Met    | (G4), seen live                                                                                                   |

### 6. Review Cycles

| ID                                              | Status | Note                                                                                                                     |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| Cyc-001 wizard fields                           | Met    | Result visibility and the earlier-answers choice (D5), saved live                                                        |
| Cyc-002 review types                            | Met    |                                                                                                                          |
| Cyc-003 sequence, 50/50, peer and upward        | Met    | Peer run live to a release. Upward not run live: no employee has two direct reports                                      |
| Cyc-004 KPI mapping                             | Met    |                                                                                                                          |
| Cyc-005 step-linked readiness                   | Met    | With goals, the manager stage is due after the verification deadline (D6). A peer who reads the results is refused (D12) |
| Cyc-006 schedule and launch, no duplicates      | Met    | The timer activation was not seen live                                                                                   |
| Cyc-007 states                                  | Met    |                                                                                                                          |
| Cyc-008 invalid scheduled cycle stays Scheduled | Met    | Problems show on Cycle Details only (G6)                                                                                 |
| Cyc-009 transactional, idempotent, audited      | Met    | Local PostgreSQL: two launches at once and two submissions at once answered 200 and 409                                  |

### 7. KPI Accomplishments

| ID                                       | Status | Note                                                                                                 |
| ---------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| Acc-001 frozen indicators                | Met    |                                                                                                      |
| Acc-002 draft and submit rules           | Met    |                                                                                                      |
| Acc-003 and Acc-008 versions and history | Met    |                                                                                                      |
| Acc-004 and Acc-005 verify, return, gate | Met    |                                                                                                      |
| Acc-006 deadlines                        | Met    | Indicator remarks and the accomplishment deadline extension run live                                 |
| Acc-007 no change of target or mapping   | Met    |                                                                                                      |
| Access after completion                  | Met    | The employee and the current manager read the records of Active and Completed cycles (G7). Seen live |

### 8. Assignments and Assessments

| ID                                                         | Status | Note                                                                        |
| ---------------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| Rev-001 scoped list                                        | Met    | Others also list the reviews about them and about their team (D3, D5)       |
| Rev-002 to Rev-004 own answers, stage order, overdue       | Met    |                                                                             |
| Rev-005 reopen and resubmit                                | Met    |                                                                             |
| Rev-006 answers, feedback, actor, time, correction history | Met    | Earlier versions show on the review (G8). Seen live                         |
| Rev-007 a prior evaluator reads the exact assignment       | Met    | While the cycle is Active or Completed (G7). A prior manager is tested only |
| 8.9 correction history output                              | Met    | (G8)                                                                        |

### 9. Finalization and Results

| ID                                                | Status | Note                                                                      |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Res-001 to Res-002 gates and snapshots            | Met    | Seen live                                                                 |
| Res-003 release and scope                         | Met    | Employee and manager seen live. The refusal before release is tested only |
| Res-004 to Res-008 scoring, components, anonymity | Met    | Peer anonymity and a weight of 0 run live (`ZZ live peer`)                |
| Res-009 HR approval of the policy                 | Met    | Decided (D2): no separate approval                                        |
| 9.9 reports and export within scope               | Met    | CSV export (G9): content seen live, the saved file not confirmed          |
| 2.4 list behavior                                 | Met    | Search, filters, and pages (G9), seen live                                |

### 10. Recovery of a cycle

| ID                                                    | Status | Note                                            |
| ----------------------------------------------------- | ------ | ----------------------------------------------- |
| Rec-001 and Rec-002 extension                         | Met    | Seen live                                       |
| Rec-003 reopen, prior versions readable               | Met    | Reopen and an earlier version seen live (G8)    |
| Rec-004 and Rec-005 evidence unchanged, closed cycles | Met    |                                                 |
| Rec-006 visible actionable errors                     | Met    |                                                 |
| 10.2 and 10.9 recovery attention list                 | Met    | Attention list on Review Cycles (G6), seen live |

### 2. Common rules, for the review modules

| Rule                                                                                              | Status | Note                                                                            |
| ------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| COM-001 to COM-003, COM-005, COM-006                                                              | Met    |                                                                                 |
| COM-004 and the history tables (2.7, 4.7 to 9.7): history that an authorized user can reconstruct | Met    | History tab of a cycle (G10) seen live. Template audit rows (G3) have no screen |
| 2.4 keep filters and page on return                                                               | Met    | List state kept until a reload (G11), seen live                                 |
| AUTH-001 to AUTH-006                                                                              | Met    | One open question on HR as participant (D1)                                     |
| AUTH-007, COM-007                                                                                 | Open   | Organization policy, backup and restore: outside the application code           |

## Gaps and plan

Size: S about one slice, M two to three, L more. Every slice is test first, with the full checks and a handoff.

| Order | ID  | Work                                                                                                                                                                                                                | Size   | Database                                              | Depends on                                                 | Done when                                                                                                 |
| ----- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Done  | G7  | A participant keeps read access to their own completed work: reviews answered, own accomplishment, manager view of the team record                                                                                  | M      | None                                                  | Advisor review of the access rule                          | Completed and released items open read only; nothing else widens; a cancelled cycle stays as the PRD says |
| Done  | G8  | Prior versions of a response: route and "History" on the review, for the evaluator and HR                                                                                                                           | M      | None                                                  | Anonymity rule stays: no prior anonymous answers to others | HR reads version 1 after a resubmission                                                                   |
| Built | G3  | Audit rows for KPI and behavioral template create, update, publish, new version, archive                                                                                                                            | M      | None (`audit_events` exists)                          | Owner of the two modules reviews                           | Each change writes one row in its transaction                                                             |
| Built | G1  | Archive: KPI button; behavioral route and button. The KPI list filter leaves Archived out on purpose (`goal-template-listing.tsx`): offer it again, with a test                                                     | S      | None                                                  | Same owner                                                 | An archived template is not selectable, has no actions, and can be filtered                               |
| Built | G4  | Version history of templates: list and read-only view                                                                                                                                                               | M      | None                                                  |                                                            | Older versions open read only                                                                             |
| Built | G2  | Publication actor and time for each version                                                                                                                                                                         | S      | Script if the columns are added to the version tables | The user runs SQL                                          | A new publication keeps the earlier record                                                                |
| Built | G10 | History view of a cycle and of an assignment for HR                                                                                                                                                                 | M      | None                                                  | G3                                                         | HR reads actor, action, time, reason, before and after                                                    |
| Built | G9  | Results: search, department filter, pages, and export within the caller scope                                                                                                                                       | M      | None                                                  |                                                            | The export holds exactly the listed rows                                                                  |
| Built | G5  | Result visibility setting in the wizard, applied on release. Look first at the unrouted `release-settings.tsx`: its options cover what evaluators see of earlier stages and anonymous peers, not who reads a result | M      | Script: one or more columns on `cycles`               | D5; the user runs SQL                                      | The setting limits who reads a released result                                                            |
| Built | G11 | Keep filters and page on return in the filtered lists                                                                                                                                                               | S      | None                                                  |                                                            | Back shows the same list state                                                                            |
| Built | G6  | Recovery attention list: blocked scheduled cycles and overdue work                                                                                                                                                  | S to M | None                                                  |                                                            | HR sees every blocked cycle without opening each one                                                      |

## Decisions needed

| ID  | Question                                                                                                                                                                                              | Proposed default                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | May an HR administrator read reviews about themselves before release?                                                                                                                                 | Decided: yes, visible by default. History shows these rows too                                                                                                         |
| D2  | HR approval of weights, score meaning, target scoring, anonymity minimum (Res-009)                                                                                                                    | Decided: no HR approval. HR writes the scoring policy in the KPI templates                                                                                             |
| D3  | Team Reviews tab of the sample (an access rule)                                                                                                                                                       | Decided: build the Team Reviews tab for managers                                                                                                                       |
| D4  | May HR remove one assignment whose evaluator never submits? The PRD names no such action                                                                                                              | Decided: HR never reads an unsubmitted answer and cannot remove a review                                                                                               |
| D5  | After HR releases a score, who may read it? And may a reviewer read the answers of an earlier stage, or its status only? The PRD names the field "result visibility", not its values                  | Decided: involved people read each other by default, with a cycle setting. A later reviewer reads earlier answers; the employee and the manager read after the release |
| D6  | May the manager stage be due before the accomplishment deadline? The manager cannot submit until the report is submitted and verified, so that deadline cannot be met (late work stays open, Rev-004) | Decided: the manager verification deadline comes before the manager assessment deadline                                                                                |
| D7  | Are the notifications of assigned reviews part of the review modules? The bell is a placeholder                                                                                                       | In scope, no UI design yet: not built                                                                                                                                  |
| D8  | Are manager assignments (Mgr rules) part of this work? AUTH-004 and Mgr-005 depend on them                                                                                                            | In scope, no UI design yet: not built                                                                                                                                  |
| D9  | May a new manager read the completed KPI records of a team member from before their time? Built so (AUTH-001, the team of today)                                                                      | Open: the product manager verifies. The designer says it is not needed. No change now                                                                                  |
| D10 | How long may completed work be read? There is no retention policy (Tpl-G-007, COM-007)                                                                                                                | Decided: completed work is readable anytime                                                                                                                            |
| D11 | A completed review shows the department as "Not set" to everyone but HR and the subject. Is that right?                                                                                               | Decided: the current manager reads the department too                                                                                                                  |
| D12 | May the manager of the participant, the HR evaluator, or an HR administrator be an anonymous peer? Such a person reads the pooled result and learns the other answer                                  | Decided: the manager of the participant, the HR evaluator, and HR administrators cannot be peers                                                                       |

## Sample alignment still open

From `2026-11-26-sample-frontend-alignment.md` and its slices. On 27 November the template lists and details and the cycle list were compared again with the Classic layout of the sample (`2026-11-27-final-checks.md`).

| Item                                                                          | State                                                                                                                  |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Goals entry of an employee: the record of a chosen cycle, with a cycle choice | Built and seen live. An employee who also reads a team keeps the lists                                                 |
| Team Reviews tab                                                              | Built and seen live (D3)                                                                                               |
| Export Results button                                                         | Built (G9)                                                                                                             |
| Assessment Details: indicator table with actual results inside the review     | Chosen otherwise: the review links to the Goals record, so one screen owns the values. Reopen if the sample must match |

## Live checks still open

Each write needs the approval of the user.

1. The upward stage to a released result: it needs an employee with two or more direct reports.
2. The timer activating `ZZ live ready` on 28 November, with `ZZ live blocked` still Scheduled.
3. The audit rows of the templates, read with SQL by the user.
4. A screen reader, a second company, and browser zoom.
5. The database of the other developer: all migration scripts.

## Closing the module

1. G7 and G8 are done.
2. Decisions answered and built (see `2026-11-27-decisions.md`). D7 and D8 wait for a UI design, D9 for the product manager.
3. Build the rest in the order above.
4. Run the live checks.
5. Done for the new read rules: LOW, four findings in the decisions handoff.
6. Done: the five unrouted setup components are deleted. `release-settings.tsx` held the evaluator visibility option that D5 asks about: restore it from commit `9f86101` if it is wanted.
7. Commit and open the pull request when the user asks. Nothing is committed now.
