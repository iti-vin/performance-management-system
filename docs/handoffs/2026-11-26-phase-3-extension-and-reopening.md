# Handoff: phase 3, deadline extension and reopening of a review

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-kpi-company-scope-and-slice-5-script.md`.

Correction to that handoff: the slice 5 SQL script ran on the local database of the user on 2026-11-26, with permission for that one script. Its check query answered three rows, each nullable. The database of the other developer still needs it. No backend code maps those three columns yet.

## State

| Item                                                                                            | State                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /review-cycles/:id/extension` (PRD Rec-001, Rec-002)                                      | Built, tests only                                                                                                                                                                        |
| `POST /review-cycles/:id/assignments/:assignmentId/reopening` (PRD Rev-005, Rec-003 to Rec-005) | Built, tests only                                                                                                                                                                        |
| Sequence rule: no submission while an earlier stage is unfinished                               | Built, tests only                                                                                                                                                                        |
| Cycle Details: Extend Deadlines, Reopen on submitted rows of Progress                           | Built, tests only                                                                                                                                                                        |
| Review page: reason of a reopening, waiting stage, Submit held                                  | Built, tests only                                                                                                                                                                        |
| Live reads, as administrator, local                                                             | Done: both new routes answer 401 without a token; Extend Deadlines and the Reopen dialog open (closed without sending); one review page loads, so the local database has `reopen_reason` |
| Live writes, both approved by the user                                                          | Done: see "Live writes"                                                                                                                                                                  |
| Real PostgreSQL lock order under two writers                                                    | Not run                                                                                                                                                                                  |
| Slice 5 screens, phases 5, 6, 4, 7, "Assessment Details", final security review                 | Not started                                                                                                                                                                              |

Verified after the last change: `pnpm test` (shared-types 137, backend 640 in 28 files, web 835 in 66 files), `pnpm --filter @pms/database test` (19), `pnpm lint`, `pnpm typecheck`, and `pnpm --filter @pms/backend exec tsc --noEmit -p tsconfig.json`: all pass.

## Red and green runs

| Part                            | Command                                             | Red                   | Green                                             |
| ------------------------------- | --------------------------------------------------- | --------------------- | ------------------------------------------------- |
| Extension contract              | `pnpm --filter @pms/shared-types test`              | 2 failed, 133 passed  | 135                                               |
| Extension backend               | `pnpm --filter @pms/backend test review-cycle`      | 26 failed, 357 passed | full backend 607                                  |
| Reopening contract              | `pnpm --filter @pms/shared-types test`              | 2 failed, 135 passed  | 137, after the detail fixture took `reopenReason` |
| Reopening backend               | `pnpm --filter @pms/backend test`                   | 26 failed, 611 passed | 637                                               |
| Web actions                     | `pnpm --filter @pms/web test review-cycle`          | 11 failed, 84 passed  | full web run                                      |
| Web screens                     | `pnpm --filter @pms/web test cycle-details`         | 10 failed, 45 passed  | full web run                                      |
| Review page                     | `pnpm --filter @pms/web test review-page`           | 2 failed, 23 passed   | full web run                                      |
| Double period in API error text | `pnpm --filter @pms/web test api-error-text`        | 1 failed, 4 passed    | 5                                                 |
| Waiting stage and the 403 rule  | `pnpm --filter @pms/backend test review-assessment` | 2 failed, 81 passed   | 83                                                |
| Held Submit button              | `pnpm --filter @pms/web test review-page`           | 1 failed, 25 passed   | 26                                                |

Tests that passed before their code, each proven by a temporary change that made it fail: the company filter of the reopening, the participant filter of the reopening, the 403 line (an account with no employee record), and the "not offered for a closed cycle" screen tests.

## Live writes

Run from the web screens as administrator on the local database.

| Write                                                                                                                  | Seen after it                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "ZZ slice 4 live check": HR stage deadline 2026-12-18 to 2026-12-22, reason "ZZ live check ng extension"               | The review list shows the HR review due Dec 22. Self (Dec 4) and manager (Dec 11) did not move, and no state changed                                                        |
| "ZZ demo three roles": reopen the HR review (`0a1c04f8-94f0-400b-a0f0-ea585323fa52`), reason "ZZ live check ng reopen" | Progress shows it In Progress, 2 submitted. The review page shows "Reopened by HR" with the reason and the old rating in an editable draft. Self and manager stay Submitted |

That HR review stays In Progress until its evaluator submits it again. Not seen live: version 1 as read by a person who is not the evaluator, and the audit rows. The user can read both:

```sql
SELECT version, status, reopen_reason, submitted_at
FROM pms.assignment_responses
WHERE assignment_id = '0a1c04f8-94f0-400b-a0f0-ea585323fa52'
ORDER BY version;

SELECT action, reason, before_json, after_json, occurred_at
FROM pms.audit_events
WHERE entity_id IN ('0a1c04f8-94f0-400b-a0f0-ea585323fa52', 'f67833ad-5445-42a9-b3c8-55d26b204024')
  AND action IN ('reopened', 'extended')
ORDER BY occurred_at;
```

Expected: version 1 submitted with no reason, version 2 draft with the reason, then one `extended` and one `reopened` row.

## Rules as built

| Rule                                  | Behavior                                                                                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate of both routes                   | The cycle is active, with no `finalizedAt` and no `releasedAt`. Otherwise 409                                                                                                                                        |
| Extension                             | Reason required. No date earlier, stage order holds, at least one date changes: otherwise 422 with the field. Moved stages carry their assignments. State and answers stay. One audit row with the old and new dates |
| Reopening                             | Only a submitted review of that cycle in that company. It becomes In Progress with a draft copy (next version) that keeps the reason. The old version does not change                                                |
| Later reviews of the same participant | Submitted: opens again with its own copy. Not started: locked. In progress: stays                                                                                                                                    |
| Submission                            | 409 while an earlier stage is unfinished. A draft still saves. The detail answers `waitingFor`, and the page holds Submit                                                                                            |
| Reading                               | The evaluator sees the latest version. Others see the latest submitted version                                                                                                                                       |
| KPI accomplishments                   | Not changed (Rec-004)                                                                                                                                                                                                |

## Decisions and reasons

| Decision                                                                     | Reason                                                                |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| No schema change                                                             | `assignment_responses.reopen_reason` and `audit_events` already exist |
| The impact confirmation is the dialog, with no flag in the request           | A flag that the client always sends checks nothing                    |
| The extension takes only changed days, each as the end of that day in Manila | Same rule as the wizard                                               |
| `reopen` checks the administrator role in the service too                    | Another controller injects that service                               |

## Changes that other work can see

| File                              | Change                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `assignment-response.entity.ts`   | Maps `reopen_reason`. Every response read selects it, so a database without the column breaks the review pages. The other developer checks this column |
| `create-review-cycle.dto.ts`      | `IsInstant` and `GUID` are exported                                                                                                                    |
| `cycle-readiness.ts`              | `stageOrderProblem` is shared with the extension                                                                                                       |
| `review-detail.schema.ts`         | New required field `reopenReason`                                                                                                                      |
| `web/src/utils/api-error-text.ts` | No second period after a field message that already ends a sentence                                                                                    |

## Open

1. The two check queries above. A resubmission of the reopened HR review is a new write: ask first.
2. A reopened review past its deadline shows Overdue at once. HR extends the stage if needed.
3. Slice 5 decisions to record before its screens: the accomplishment deadline is shown and marks late work, and blocks nothing (Acc-006); it is on or before the verification deadline; per-indicator remarks also go into `actuals_json`; the description is in wizard step 1; remove `cycleResponseSchema` in `review-cycle.schema.ts`.
4. Then phase 5 (Res-009 open), phase 6, phase 4, phase 7 (own schema script), "Assessment Details", and the final `security-auditor` pass.
5. Unverified: dark theme, zoom, screen reader, a second company, and the check queries of earlier demos.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-26-phase-3-extension-and-reopening.md.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
Then build the slice 5 screens test first, with the advisor.
```
