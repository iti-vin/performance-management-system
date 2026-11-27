# Handoff: reviews phase 2, live demo and security review

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-reviews-phase-2b-web.md` (the plan of the demo) and `2026-11-26-sample-alignment-slice-3-and-cycle-details.md`.

## Objective

Prove phase 2 on the local PostgreSQL database through the web pages, then review its security (the gate of the phase).

## State

| Item                                                         | State                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| Seven writes of the demo, from the web pages                 | Done with the approval of the user, all accepted          |
| Check query of the database                                  | Written below. Not run: the user runs SQL                 |
| `security-auditor` over phase 2, and over the slice 3 routes | Done: one low finding, one question for the PRD owner     |
| Phase 2                                                      | Passes in the web. The database check of the user is open |

Demo record `77d5c007-269d-4fb2-8ab9-687f8c005a0f`, cycle `734c8be0-be9a-4f0a-b8f4-1548110ed534`.

## The demo

| Step | Account       | Write                                                                             | Seen after it                                                                |
| ---- | ------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | `user`        | Save the draft: values 85, 100, 90, 100, 95 and a remark                          | "Draft saved."; the values stayed after a reload                             |
| 2    | `user`        | Submit                                                                            | Submitted, no field, version 1 in the history                                |
| 3    | `manager`     | Return with a reason                                                              | Returned, the reason shown, no value of the report shown outside the history |
| 4    | `user`        | Resubmit: first value 92 and a correction reason                                  | Submitted, version 2 with the correction                                     |
| 5    | `manager`     | Verify (cannot be undone)                                                         | Verified, no decision button                                                 |
| 6    | `manager`     | Submit the manager review, with the answers of its saved draft (cannot be undone) | Submitted; the HR review went from Locked to Not Started                     |
| 7    | Administrator | Submit the HR review: 4, 4, Weekly, and a comment (cannot be undone)              | Submitted                                                                    |

After step 7 the cycle details show 3 of 3 submitted and 0 of 3 completed, and the cycle is Active. `completed` comes with finalization (phase 5). The demo cycle now has no open work.

## Check query (read only)

```sql
SELECT status, remarks, return_reason,
       submitted_at IS NOT NULL AS is_submitted, verified_at IS NOT NULL AS is_verified
FROM pms.accomplishments
WHERE accomplishment_id = '77d5c007-269d-4fb2-8ab9-687f8c005a0f';

SELECT actual_value
FROM pms.accomplishment_actuals
WHERE accomplishment_id = '77d5c007-269d-4fb2-8ab9-687f8c005a0f'
ORDER BY actual_value;

SELECT version, correction_reason
FROM pms.accomplishment_versions
WHERE accomplishment_id = '77d5c007-269d-4fb2-8ab9-687f8c005a0f'
ORDER BY version;

SELECT action, reason
FROM pms.audit_events
WHERE entity_type = 'accomplishment' AND entity_id = '77d5c007-269d-4fb2-8ab9-687f8c005a0f'
ORDER BY occurred_at;

SELECT s.perspective, a.state, r.version, r.status
FROM pms.assignments a
JOIN pms.cycle_stages s ON s.stage_id = a.stage_id
LEFT JOIN pms.assignment_responses r ON r.assignment_id = a.assignment_id
WHERE a.cycle_id = '734c8be0-be9a-4f0a-b8f4-1548110ed534'
ORDER BY s.sort_order, r.version;
```

| Query | Expected rows                                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1     | One: `verified`, `Demo remarks: phase 2 live check.`, null reason, true, true                                                |
| 2     | 90, 92, 95, 100, 100                                                                                                         |
| 3     | Version 1 with null; version 2 with `Demo correction: updated the first value.`                                              |
| 4     | `actuals_saved`, `submitted`, `returned` (with `Demo return reason: please check the first value.`), `submitted`, `verified` |
| 5     | `self`, `manager`, `hr`: each `submitted`, version 1, response `submitted`                                                   |

## Security review

Scope: `accomplishments.controller.ts` and `.service.ts`, `accomplishment-rules.ts`, `reviews.controller.ts`, `review-assessment.service.ts`, `review-answers.ts`, `review-cycles.controller.ts` with `getParticipants`, `viewer.ts`, `parsed-input.ts`, the request contracts in `evaluation.schema.ts` and `review-list.schema.ts`, and the web features `position-goals`, `review-cycles`, and `evaluations`. NestJS, TypeORM, PostgreSQL, Next.js, Zod.

### Finding 1: a NUL character in a text field ends in a 500

- Rating: Low. An authenticated account gets a generic error and writes a server log entry. No data is lost or shown.
- Lines: `packages/shared-types/src/dtos/evaluation.schema.ts` line 48 (`accomplishmentTextSchema`) and line 104 (`writtenAnswer`).
- Explanation: CWE-20. Both schemas accept `\u0000`. PostgreSQL refuses it in `text` and in `jsonb`, and the error filter answers 500. Read in the code and from the PostgreSQL rule; not sent to the database.
- Recommendation: refuse the character in both schemas, with a test first, and apply the same rule to the other free-text contracts.

### Checked, no finding

| Check                         | Result                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication on every route | `JwtAuthGuard` on each class; `AdminRoleGuard` also on review cycles                                                                                          |
| Role and company              | Read from the account on each call (`viewerOf`). Company scope comes from the cycle. No access answers 404                                                    |
| Who writes                    | Only the evaluator changes a review; only the employee reports; only the current manager decides, never on their own record                                   |
| Drafts                        | Another account sees no draft answer and no unsubmitted value                                                                                                 |
| Races                         | Writes lock the cycle, then the record or the assignments, in one transaction                                                                                 |
| Input                         | Strict or bounded Zod contracts: answers at most 500, texts at most 5000 or 2000, values zero or more, one per indicator; the list query refuses unknown keys |
| Filter options                | Built from the visible rows only                                                                                                                              |
| Browser                       | No raw HTML, `eval`, console output, or browser storage in the three features; the token stays in the httpOnly cookie                                         |
| Supply chain                  | No `package.json` or lockfile change in the working tree                                                                                                      |

Overall risk rating: Low.

### Not verified

No rate limit exists on these routes. The origin check of server actions is the one of Next.js and has no test here. A second company does not exist locally, so the company scope was read in code and specs, not shown live.

### Question for the PRD owner

An HR administrator who is also a participant reads the submitted reviews about themselves before any release. PRD 2.2 gives HR the organization scope, and AUTH-005 limits an employee to the own released result. The PRD does not say which rule wins.

### Already recorded, still open

The behavioral routes ignore the company (CWE-639, High for update, publish, and new version): see `2026-11-26-sample-alignment-slice-2.md`.

## Open

1. Run the check query and compare.
2. Fix finding 1, after the user agrees.
3. Cosmetic: after a submission, the record shows "Submitted. It waits for your manager." twice (the notice and the result of the action).
4. Phase 3 remainder (deadline extension, HR reopen) and later phases.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and the newest handoff in docs/handoffs/README.md.
Phase 2 passed in the web; ask me for the result of the check query.
Commit nothing until I ask. I run all SQL.
```
