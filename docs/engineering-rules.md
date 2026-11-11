# Engineering Rules

**System:** HRDotNet Performance (PMS)  
**Basis:** PRD v2.0, supplied PostgreSQL database design and NestJS project structure  
**Purpose:** Mandatory implementation rules for predictable workflow behavior

## 1. Source-of-truth hierarchy

1. The PRD is the source of truth for product scope, actors, workflow rules and acceptance behavior.
2. `database-schema.md` records the supplied logical PostgreSQL design.
3. `api-contracts.md` defines the proposed HTTP boundary and must not be mistaken for already-approved endpoint specifications.
4. `coding-standards.md`, `security-policies.md` and `error-handling.md` define engineering implementation practices.
5. If a rule is ambiguous or requires HR/Product approval, do not silently invent a policy. Record the open decision and block the affected production behavior if necessary.

## 2. Scope boundaries

- Implement KPI Goal Templates, Behavioral Assessment Templates, review cycles, accomplishments, manager verification, evaluator assignments, scoring, finalization/release, manager assignments, 202 Files, NTE, PIP, operational goals, dashboards/reports and in-app notifications.
- Operational personal/assigned goals are separate from KPI scoring.
- PIP outcomes do not modify source KPI results and do not trigger disciplinary, compensation or employment actions.
- Payroll, compensation, recruiting, attendance, leave, forced ranking, native mobile apps, external evaluator portals, automated employment decisions and HRDotNet write-back are outside the current scope.

## 3. Authorization and scope rules

- Every read, write, list, count, export and detail lookup must enforce authenticated role and company scope on the server.
- Employee scope is self-only except exact assigned evaluator work and explicitly permitted records.
- Manager scope is the current performance-management team in the current company plus exact assignments owned by that manager.
- HR Administrator scope is the authorized organization/company scope.
- Being the subject of an assessment does not grant evaluator edit authority.
- An evaluator may not edit another evaluator's response.
- Employees can view only their own released result, own issued NTEs and own PIP information permitted by the workflow.
- Managers may read permitted team journals/NTEs but cannot create, issue, cancel or resolve NTEs.
- Never treat hidden UI controls, client-side role switching or a company selector as a security boundary.

## 4. Lifecycle and state-transition rules

- Model lifecycle states explicitly; validate allowed transitions in the service layer.
- Distinguish draft, submitted, returned, verified, completed, finalized, released and cancelled states where applicable.
- Require a reason for returns, corrections, cancellation, early NTE closure and other reasoned exceptions.
- A submitted record is not automatically verified.
- Finalization and result release are separate operations.
- A cancelled record remains retained and is not silently reused.
- A failed operation must not leave partially applied state.

## 5. Immutable evidence and versioning

- Published template versions are frozen for existing cycle snapshots.
- Cycle participant position and template mappings are frozen at scheduling/launch as specified.
- Corrections to accomplishments retain previous submitted values and create a new version record.
- Submitted evaluator responses are locked; authorized reopening requires a reason and impact confirmation, with downstream work returned to the appropriate in-progress sequence.
- Finalized evaluation snapshots retain scores, weights and supporting evidence and are immutable.
- PIP source indicator evidence is frozen and identified by `cycleId + indicatorId`.
- Audit history is append-only.

## 6. Transaction and idempotency rules

Use a database transaction for any operation that writes multiple related records or advances a workflow with downstream effects. At minimum:

- Cycle launch/activation and assignment creation.
- Finalization and result snapshot persistence.
- Result release state change.
- NTE issue and notification creation.
- PIP referral creation/update and source attachment.
- PIP weekly planning and assessment transitions.
- Effective-dated manager assignment application and any affected assignment updates.

Retryable operations must use an idempotency key or an equivalent durable deduplication mechanism. Repeated requests must not create duplicate participants, assignments, notifications, PIP sources or assessments.

## 7. Date and clock rules

- Use the company date semantics defined by the PRD: Asia/Manila for the current live mode.
- Store instants as `timestamptz`; store calendar dates as `date` where the schema specifies a date.
- Do not use the browser clock as the production source of truth.
- Production scheduling must run in an independent server-side worker and revalidate records when due.
- Changing demo date must not reverse already-applied work.
- PIP weeks are inclusive seven-day periods and may not overlap sibling weeks.
- NTE response remains open through the deadline day; the employee may respond after the deadline if the notice is still open.

## 8. Scoring and evaluation rules

- KPI actuals and targets are nonnegative; zero is valid.
- KPI indicator weights are positive and total 100% within a template version.
- Scores respect the configured 1–5 range.
- Direction (`higher_is_better` / `lower_is_better`) controls threshold interpretation.
- Scoring thresholds are inclusive, ordered and complete as configured; preview zero, below-target, exact-target and above-target cases.
- Reference-only matrices do not affect scores.
- Behavioral numeric scoring includes observed rating answers 1–5 only. Not Observed and optional unanswered questions are excluded; text and multiple-choice answers are nonnumeric.
- New simplified cycles use Goals Performance and Behavioral Performance at 50/50 as described in the PRD, but weights and scoring policy require HR approval before production.
- Absent/not-applicable components must not be silently converted to zero.
- Anonymous Peer/Upward aggregation must suppress values and narratives below the configured distinct-submitter threshold (2–10); identity exposure is prohibited.

## 9. Manager assignment rules

- No self-assignment.
- Employee and manager must be in the same company.
- Validate the projected reporting graph for loops across the complete batch.
- Pending assignments do not affect current scope before their effective date.
- Revalidate eligibility and graph at effective date.
- Apply a valid assignment once; mark invalid assignments blocked with a reason.
- In-progress/submitted evaluator work retains the original evaluator after manager reassignment.
- Newly eligible manager verification follows current manager scope.

## 10. PIP rules

- Automatic referral requires a completed and released evaluation with at least one individually verified measurable KPI below direction-specific target.
- Deduplicate automatic referral by employee/source evaluation; later failed sources may be added to an open plan and require referral review.
- Each failed source must be assigned to a measurable week or excluded with a reason.
- Weekly sections require inclusive seven-day non-overlapping dates.
- Employees submit progress; authorized manager/HR assesses it.
- `missed` assessment requires a reason; follow-up week requires a reason.
- Closure requires all weeks assessed, relevant dates reached, source coverage resolved and referrals reviewed.
- PIP does not alter source KPI evidence or create disciplinary outcomes.

## 11. NTE rules

- Draft NTEs are not employee-visible.
- Issuing locks notice content and creates an in-app notification.
- Opening creates a read receipt.
- Employee may submit one explanation while the notice remains open, including after the deadline.
- HR closes after response or deadline expiry under the PRD rule.
- Early closure requires a separate reason and explicit confirmation.
- Cancellation is distinct from closure and requires its own reason.
- Managers have team read access only; no NTE create/issue/cancel/resolve authority.

## 12. Operational goals

- Keep operational goals separate from KPI performance scoring.
- Validate owner/company/team scope, category and date order.
- Manual progress is constrained to 0–100.
- Milestone mode derives progress from completed milestones.
- Preserve stale-write detection using the goal version.
- Keep goal progress history.

## 13. Production readiness gates

Do not represent the prototype as production-ready until the following are addressed:

- Authenticated backend and server-side authorization.
- Company isolation on every query and mutation.
- Durable shared PostgreSQL persistence and versioned migrations.
- Transactions, idempotency and concurrent-write handling.
- Append-only audit storage and retention controls.
- Independent scheduler, retry policy, dead-letter handling and operational alerts.
- Reliable notification delivery and delivery audit.
- Backup/restore objectives and tested recovery.
- Approved privacy, retention, access and NTE/PIP policies.
- Approved HRDotNet source-of-truth and integration/write-back contract.
- Security, accessibility, compatibility, load and export testing.
