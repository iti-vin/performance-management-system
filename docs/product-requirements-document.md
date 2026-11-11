# HRDotNet Performance

**System Requirements Specification**

**Performance Management Module Group and Required Workflows**

26 October 2026

## Document Control

| Document Attribute | Value                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Document Title     | HRDotNet Performance System Requirements Specification                                      |
| System             | HRDotNet Performance                                                                        |
| Version            | 2.0                                                                                         |
| Document Status    | Comprehensive current-system baseline; production gates and policy decisions are identified |
| Content Basis      | Current local prototype, current working requirements, and observed implementation behavior |
| Prepared For       | Product, Engineering, QA, HR Operations, Security and Privacy                               |
| Prepared Date      | 26 October 2026                                                                             |

## Revision History

| Version | Date            | Description                                                                                                                                                         |
| ------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.0     | 26 October 2026 | Recreated as a comprehensive end-to-end SRS covering current screens, rules, exceptions, operational goals, PIP, NTE, evaluation workflows and QA acceptance cases. |

## Table of Contents

| Section | Title                                                     |
| ------- | --------------------------------------------------------- |
| 1       | Introduction                                              |
| 2       | Common HRDotNet Performance System Requirements           |
| 3       | Performance Module Overview                               |
| 4       | KPI Goal Templates                                        |
| 5       | Behavioral Assessment Templates                           |
| 6       | Review Cycle Management                                   |
| 7       | KPI Accomplishments and Manager Verification              |
| 8       | Evaluator Assignments and Assessments                     |
| 9       | Finalization, Scoring and Result Release                  |
| 10      | Workflow Recovery and Effective-Dated Manager Assignments |
| 11      | 202 Files, Journal Entries and NTE Files                  |
| 12      | Performance Improvement Plan                              |
| 13      | Dashboard, Reports and Notifications                      |
| 14      | Employee Directory and My Team Workspace                  |
| 15      | Personal and Assigned Operational Goals and Milestones    |
| 16      | Domain Model, Data Integrity and Interfaces               |
| 17      | Nonfunctional Requirements and Production Gates           |
| 18      | End-to-End QA Acceptance Scenarios                        |
| 19      | Implementation Map and Production Handoff                 |

## 1. Introduction

### 1.1 Purpose

This document defines implementation-oriented and testable system requirements for HRDotNet Performance. It describes how HR configures templates and review cycles, employees report KPI results, managers verify those results, evaluators complete staged reviews, HR finalizes and releases results, and the system handles journals, NTEs, PIPs, reports, notifications and workflow exceptions. It gives Engineering a functional baseline and gives QA observable acceptance conditions for end-to-end verification.

### 1.2 Scope

- KPI Goal Templates, including flexible indicator matrices and scoring controls.
- Behavioral Assessment Templates and typed questions.
- Review-cycle setup, participant mapping, launch, scheduling and cancellation.
- KPI accomplishment reporting, manager verification and correction history.
- Evaluator assignments, staged assessment, scoring, finalization and separate result release.
- 202 Files: Journal Entries and NTE Files; employee NTE response; manager read-only team access.
- Performance Improvement Plan (PIP), including automatic and manual enrollment, weekly planning, employee progress and staff assessment.
- Personal and assigned operational goals, milestone progress, goal search and status workflows.
- Effective-dated performance-manager assignments, company/demo clock, dashboards, reports, exports and in-app notifications.
- Role scope, audit behavior, validation, recovery, persistence and production deployment requirements.

### 1.3 Explicit Exclusions

Payroll, compensation, recruiting, attendance, leave, forced ranking, native mobile applications, external evaluator portals, automated employment decisions, disciplinary decisions, and write-back to HRDotNet are outside the current system. Operational personal and assigned goals are included separately and do not participate in KPI scoring. PIP outcomes do not change source KPI results and do not trigger disciplinary, compensation or employment action.

### 1.4 System Context and Business Objective

The system is a browser-based static prototype with sample identities and browser-local persistence. It demonstrates role-scoped performance workflows; it is not a deployed multi-user service. A production system requires an authenticated backend, server-side authorization, durable shared storage, reliable scheduling, audit retention and approved integration contracts.
Requirement status is explicit throughout this specification: Current means demonstrated in the working prototype; Production gate means required before real employee data or deadlines can be relied upon; Policy decision means HR or Product must approve the rule before production use.

### 1.5 Requirement Language

Shall identifies a mandatory requirement. Should identifies a recommended behavior. May identifies an allowed option. Current, Production gate and Policy decision qualify whether the behavior exists today, requires production engineering, or requires policy approval. The current UI is not evidence of an approved HR policy or a security boundary.

## 2. Common HRDotNet Performance System Requirements

### 2.1 Common Functional Requirements

| ID      | Function / Requirement                                                                                                      | Acceptance Criteria                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| COM-001 | The system shall identify the active user role and company context for all workflow screens.                                | Role, company, ownership and scope filters are applied consistently across lists, details, counts and exports. |
| COM-002 | The system shall distinguish draft, submitted, returned, verified, completed, cancelled and released work where applicable. | Status is rendered as text; permitted actions follow lifecycle state.                                          |
| COM-003 | The system shall preserve entered valid data when field or business-rule validation fails.                                  | Invalid values are identified; prior state and unaffected valid form values remain available.                  |
| COM-004 | The system shall retain relevant history for submitted, verified, assessed, finalized and corrected records.                | Actor, action, timestamp, reason and before/after values are retained where the workflow records them.         |
| COM-005 | The system shall support visible empty, loading, overdue, locked, completed and actionable exception states.                | User can determine why work is unavailable and what action is available next.                                  |
| COM-006 | Production shall enforce authorization, company isolation and lifecycle rules at the server/API layer.                      | Unauthorized reads and mutations are rejected even when requests bypass UI controls.                           |
| COM-007 | Production shall use durable shared persistence, versioned migrations, transactions and backup/restore controls.            | Concurrent writes and failed operations do not create partial or duplicate business records.                   |

### 2.2 Role, Company and Permission Rules

| Role             | Data scope                                                                            | Allowed workflow actions                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Employee         | Self only; assigned evaluator response; own released result; own issued NTE and PIP.  | Report KPI actuals, complete own assignments, respond to NTE, acknowledge/progress PIP.                                           |
| Manager          | Current performance-management team in current company, plus exact assignments owned. | Verify KPI actuals, complete own assessments, read permitted journals/NTEs, configure and assess permitted team PIPs.             |
| HR Administrator | Authorized organization/company scope.                                                | Configure templates/cycles, assign performance managers, administer NTE/PIP, recover workflows, finalize/release results, report. |

- AUTH-001 [Current]: Employee data access is restricted in the interface by self ownership; manager access is restricted by current team scope; HR actions are restricted to HR role.
- AUTH-002 [Current]: Subject participation does not imply evaluator authority. A manager may not edit another evaluator's response.
- AUTH-003 [Current]: Company context participates in employee, cycle, NTE, PIP and manager-assignment scoping.
- AUTH-004 [Current]: An in-progress or submitted response retains its original evaluator after manager reassignment. A newly eligible manager may verify accomplishments according to current manager scope.
- AUTH-005 [Current]: An employee can read only their own released result and own issued NTEs; the employee cannot view manager/HR journals or create/resolve notices.
- AUTH-006 [Production gate]: Enforce these checks in APIs and data queries. Hiding buttons or using browser JavaScript conditions is not security enforcement.
- AUTH-007 [Production gate]: Establish company membership, acting roles, delegated access, admin audit, session expiration and break-glass access policy.

### 2.3 Shared Workspace Controls and Navigation

| Shared control / screen | Current behavior and rule                                                                                                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role navigation         | Employee: Dashboard, Goals, Reviews, 202 Files (own issued NTEs), PIP. Manager: Dashboard, My Team, Goals, Reviews, 202 Files, PIP, Reports. HR: Dashboard, Reviews (All Reviews, KPI Goal Templates, Behavioral Assessment Templates, Cycles), 202 Files, PIP, Reports, Employees. |
| Search / page search    | Accessible page search opens matching workspace navigation; it does not grant record access. Returning from details should preserve list filters/page where implemented.                                                                                                            |
| Company selector        | Current UI displays Mayon Consolidated Inc. and the prototype has no connected sister-company directory. Company choice is a local scope demonstration, not tenant security.                                                                                                        |
| Notification menu       | Shows actionable assigned-review and PIP items, plus issued NTE notice to the employee. Menu links to the source screen; it is not external email/SMS/push.                                                                                                                         |
| Settings                | Review notification preference is browser-local. HR can use the labeled workflow date mode and inspect pending/blocked manager changes and due actions.                                                                                                                             |
| Profile / preview       | Shows current preview identity and sample organization fields. End preview returns to Employee preview and is not sign-out or authenticated session termination.                                                                                                                    |
| Shared list controls    | Search, status/category/owner/date filters, clear filters, counts, empty states and numbered pagination where present. Counts and detail actions use the same authorized dataset.                                                                                                   |

### 2.4 Common List, Search and Navigation Behavior

- Search and filters shall not widen the user data scope.
- Search, row counts, pagination, detail routes and exports shall operate on the same authorized result set.
- Returning from a detail view should preserve applicable filters, page and sort state.
- Linked references shall open only when the user has permission; otherwise a non-sensitive reference label may be shown.
- Status shall be communicated in text and shall not depend on color alone.
- Date filters and custom ranges shall validate date order.

### 2.5 Common State and Correction Controls

| State class         | General control                                                          | Permitted next action / effect                  |
| ------------------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| Draft               | Editable by creator and authorized users                                 | Save, submit or file where enabled              |
| Submitted / Filed   | Locked or editable according to workflow; awaiting decision              | Verify, return, approve or reject as configured |
| Returned            | Editable by responsible submitter within the permitted correction window | Correct and resubmit with history retained      |
| Verified / Approved | Locked except explicit recovery path                                     | Proceed to downstream workflow                  |
| Finalized           | Workflow and result evidence locked                                      | Separate release action, if configured          |
| Released            | Visible to authorized result viewers                                     | Read-only                                       |
| Cancelled           | Record retained; no new work                                             | Terminal except documented administrative path  |

### 2.6 Data Types, Formats and Limits

| Data type / function   | Representation                                  | Validation / behavior                                                                                                           |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Identifier             | Stable system identifier                        | Unique within its entity; retained in all source and downstream links.                                                          |
| Company date           | Calendar date; Asia/Manila in current live mode | Demo date is explicit and validated; changing it does not reverse applied work.                                                 |
| KPI actual / target    | Nonnegative numeric value                       | Reject missing required, negative and non-finite values; zero is valid.                                                         |
| Score / weight         | Configured numeric value / percentage           | Scores respect the configured range; indicator weights are positive and total 100%; new simplified cycle components total 100%. |
| Assessment answer      | Question-type-specific value                    | Required answer matches Rating, Short Answer, Paragraph or Multiple Choice type.                                                |
| Reason / feedback      | Text                                            | Required for returns, corrections, cancellation, early closure and other explicitly reasoned exceptions.                        |
| Date interval          | Inclusive calendar start/end                    | Validate real calendar dates, order, week length and overlap rules.                                                             |
| Persistence/API limits | Not specified by prototype                      | Production implementation shall set documented limits; do not infer limits from UI control length.                              |

### 2.7 History and Audit Trail Data Model

Business history shall preserve enough evidence to reconstruct state changes and decisions. Current browser-local history is mutable and is not tamper-resistant; production shall provide a durable append-only audit store with access and retention controls.

| History event                      | Required data                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| Record create / draft save         | Entity ID, actor, company, date/time and initial state.                                         |
| Field or configuration change      | Field/key, before/after values, actor, timestamp and applicable reason.                         |
| Submission / verification / return | Actor, timestamp, submitted values, decision, reason and version reference.                     |
| Assignment / stage transition      | Subject, evaluator, stage, previous/new owner or state, triggering rule and timestamp.          |
| Finalization / release             | Result evidence reference, score components, weights, actor/time and release scope.             |
| NTE / PIP exception                | Notice/plan ID, action, reason, actor, timestamp and employee-visible effect.                   |
| Scheduled action                   | Job/action key, input record, validation result, applied/blocked status, retry/idempotency key. |

### 2.8 Notifications and Error Handling

- Current in-app notifications expose assigned reviews, NTE notices and actionable PIP tasks; review notification preference is local to the browser.
- Production notification delivery needs reliable queueing, templates, retries, status visibility, preference handling and delivery audit.
- Validation errors shall identify the owning record, field or workflow step and preserve valid user input.
- Technical failures shall use a correlation ID in production and must not expose internal stack traces, secrets or restricted employee data.
- Business operations with multiple writes shall be atomic or recoverable and idempotent.

## 3. Performance Module Overview

### 3.1 End-to-End Process

## 1. HR maintains and publishes KPI Goal Templates and Behavioral Assessment Templates.

## 2. HR configures a review cycle, participants, compatible frozen templates, evaluator stages, deadlines and visibility, then launches or schedules the cycle.

## 3. Employees report actuals against frozen KPI indicators.

## 4. The eligible manager verifies each accomplishment or returns it with a reason.

## 5. Assigned evaluators complete behavioral assessments in configured stage order.

## 6. HR finalizes the completed cycle and performs a separate Release Results action.

## 7. A completed, released evaluation with at least one individually verified measurable KPI below target may create or update a PIP referral.

## 8. Managers/HR plan weekly PIP focus; employees submit progress; manager/HR assess each week; authorized staff close or cancel the plan.

## 9. HR issues NTEs through 202 Files; employees can view and respond to their own issued notices; managers have permitted team read access.

### 3.2 Relationship and Cardinality Rules

| Relationship                              | Rule / control                                                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Template to cycle                         | A cycle uses frozen versioned KPI and behavioral template snapshots. Live template changes do not rewrite an existing cycle.              |
| Cycle to participant                      | A participant is identified by cycle and employee within company scope; position/template mapping is frozen at scheduling or launch.      |
| Cycle participant to accomplishment       | One cycle-specific accomplishment record per participant; corrections create/reuse version history according to the implemented workflow. |
| Cycle participant to evaluator assignment | Assignment is scoped by cycle, subject, evaluator and stage. A response belongs to one exact assignment.                                  |
| Evaluation to PIP source indicator        | A failed source indicator is identified by cycleId + indicatorId; reused indicator IDs across cycles remain separate sources.             |
| PIP to weeks                              | A plan contains non-overlapping weekly sections; failed source indicators require a section or reasoned exclusion.                        |
| Employee to NTE                           | An issued notice belongs to one employee and has one response submission; draft is not employee-visible.                                  |
| Employee to manager assignment            | Future effective-dated assignments do not change current scope until validated and applied on their effective date.                       |

### 3.3 Transaction Effect Matrix

| Transaction / state               | Result or downstream effect                                                           | System boundary                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Template publish                  | Future cycles may select a published version; existing cycle snapshots remain frozen. | Template/version data                                              |
| Cycle launch / activation         | Creates cycle-specific assignments and work records according to configuration.       | Must be idempotent; no duplicate assignments                       |
| Accomplishment verification       | Accepts report as verified evidence; target performance remains separately scored.    | No direct result release                                           |
| Finalize                          | Persists locked scores, weights and evidence snapshots.                               | Does not release results                                           |
| Release Results                   | Makes finalized result visible to authorized roles.                                   | Scope is role/company/employee controlled                          |
| Issue NTE                         | Locks notice content and creates in-app employee notification.                        | No automatic disciplinary outcome                                  |
| PIP referral                      | Creates or updates an Awaiting Planning plan with frozen source KPI evidence.         | Does not change the source KPI result                              |
| Scheduled assignment/cycle action | Applies due work after live validation.                                               | Current worker is browser-local; production requires server worker |

### 3.4 Workflow Gate and Responsible Role Matrix

| Action / owner                                     | Required gate                                                                                                    | Result / next owner                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Publish template / HR                              | Position, indicators/questions, weights, scores and options pass validation.                                     | Version becomes eligible for future cycle setup.                                           |
| Launch or schedule cycle / HR                      | Participants, compatible frozen templates, component policy, stages, evaluators and dates are complete.          | Assignments/work records are created now or on due activation.                             |
| Submit KPI actuals / Employee                      | Evaluation period has ended; every required actual is valid.                                                     | Record locks for verification.                                                             |
| Verify / return accomplishments / eligible Manager | Active unreleased cycle, current permitted scope and verification window; return requires reason.                | Verified evidence enables assessment and scoring; return gives employee a correction path. |
| Submit assessment / assigned Evaluator             | Assignment belongs to evaluator, required answers valid and all prior stages complete.                           | Assignment becomes Submitted; next stage may open.                                         |
| Finalize / HR                                      | All required assessments submitted/completed and applicable accomplishments verified.                            | Result snapshot locks; still unreleased.                                                   |
| Release results / HR                               | Cycle result is finalized; visibility configuration and access scope pass.                                       | Authorized employee/manager/HR can view the released snapshot.                             |
| Automatic PIP referral / System                    | Completed and released KPI result contains at least one individually verified measurable below-target indicator. | Plan is created/updated Awaiting Planning; HR/Manager plans weekly response.               |
| Issue NTE / HR                                     | Employee, category, subject, body and deadline are valid and reviewed.                                           | Notice locks; employee receives in-app notice and can respond while open.                  |
| Activate / close PIP / HR or Manager               | Every failed source is covered/excluded, weeks valid; closure waits for assessment/date/referral gates.          | Employee is notified; final outcomes derive from assessed weekly evidence.                 |

## 4. KPI Goal Templates

| Specification Area | Definition                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose            | Define position-based KPI indicators, targets, weights, direction and scoring criteria, including configurable reference matrices or scoring scales. |
| Primary actors     | HR Administrator; employees and managers consume frozen cycle snapshots.                                                                             |
| Dependencies       | Position catalog, company context, indicator definitions and cycle snapshotting.                                                                     |

### 4.1 Scope and Functional Summary

Define position-based KPI indicators, targets, weights, direction and scoring criteria, including configurable reference matrices or scoring scales.

### 4.2 Listing and Navigation

Listing / entry point: HR template list with position, version, publication/archive state and actions.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 4.3 Status Workflow

| Status    | Visibility / ownership | Editability                                    | Permitted next action / effect               |
| --------- | ---------------------- | ---------------------------------------------- | -------------------------------------------- |
| Draft     | Creator/HR             | Editable                                       | Save, preview, publish                       |
| Published | HR                     | Version is frozen for existing cycle snapshots | Create a new version or archive under policy |
| Archived  | HR                     | Historical use retained                        | Not selectable for new cycles                |

### 4.4 User Journey / Processing Workflow

## 1. HR creates a KPI Goal Template and assigns its applicable position.

## 2. HR adds indicators with stable identity, unit, target, Higher/Lower direction, weight and scores.

## 3. For each indicator, HR configures a flexible matrix or numeric threshold scale; chooses reference-only or scoring-enabled use.

## 4. System validates boundaries, weight totals, score ranges and matrix/scale consistency.

## 5. HR previews zero, below-target, exact-target and above-target outcomes, then publishes a version.

### 4.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group            | Type / format                                            | Required                 | Validation / behavior                                                                                                                |
| ------------------------ | -------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Template version         | ID + version                                             | Yes                      | Position, status and version must be stable; published version is immutable for existing cycle snapshots.                            |
| Indicator                | ID, text, numeric target, unit, direction, weight, score | Yes                      | Target is nonnegative; direction is Higher/Lower; weight is positive; weights total 100%; scores remain within configured 1-5 range. |
| Indicator matrix / scale | Configurable rows/columns or threshold ranges            | Optional / as configured | Reference-only matrix does not score; scoring mode requires complete direction-specific boundaries and saved score mapping.          |

### 4.6 Business Rules, Preconditions and Data Effects

- Published/used versions do not mutate existing frozen cycle snapshots.
- Scoring matrix toggle explicitly distinguishes reference criteria from criteria that determine scores.
- Zero targets are valid; boundary tests include zero and exact inclusive thresholds.

### 4.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event           | Data that shall be recorded                                                                              | Example history entry                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| KPI Goal Templates created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception    | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 4.8 Permissions and Security

HR Administrator; employees and managers consume frozen cycle snapshots. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 4.9 Outputs and Reports

Published position-compatible templates, version history, preview of scoring outcomes.

### 4.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Tpl-G-001

| Current | HR can create, edit, preview, publish, version and archive KPI Goal Templates assigned to a position. | Given valid in-scope data, the stated action succeeds and displays the resulting state; invalid, unauthorized, duplicate and boundary actions are rejected without partial writes. |
| ------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### Tpl-G-002

| Current | Each indicator stores a stable identity, name, description, unit, nonnegative target, Higher/Lower direction, weight, target-met score and below-target score. | Create higher- and lower-is-better indicators; verify target 0, positive target, required unit, weights and frozen indicator identity. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |

### Tpl-G-003

| Current | Indicator weights must be positive and total 100 percent; scores must be in the configured 1–5 range. | Publish with weights totaling 100% and scores 1–5; reject zero/negative weights, out-of-range scores and any other total. |
| ------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |

### Tpl-G-004

| Current | Each indicator may have either a flexible reference matrix (custom rows and columns) or a numeric threshold scale. The creator can toggle “Use for scoring”; disabled matrices are reference-only. | Toggle Use for scoring off/on; confirm off leaves score unchanged and on selects the matching matrix/scale score. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |

### Tpl-G-005

| Current | Scoring scales validate the direction-specific inclusive boundaries, minimum/maximum thresholds, increasing ranges, final unbounded range where required, score range and valid zero target. Preview covers zero, below target, exact target and above target. | Exercise zero, just-below, exact and just-above target for each direction; threshold ranges are inclusive, ordered and complete. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |

### Tpl-G-006

| Current | A published/used template version cannot alter existing frozen cycle snapshots; edits apply to a new version and future cycles. | Edit/publish a later template version after a cycle snapshot; existing participant target/matrix/version remains byte-for-byte equivalent. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |

### Tpl-G-007

| Production gate | Store immutable version history and publication actor/time in durable storage; define archival retention and template deletion policy. | Given valid in-scope data, the stated action succeeds and displays the resulting state; invalid, unauthorized, duplicate and boundary actions are rejected without partial writes. |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### 4.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

## 5. Behavioral Assessment Templates

| Specification Area | Definition                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Purpose            | Define sectioned evaluator questionnaires and typed responses for behavioral performance assessment. |
| Primary actors     | HR Administrator; assigned evaluators; subjects view permitted released results.                     |
| Dependencies       | Question type definitions, rating labels, cycle workflow and evaluator assignments.                  |

### 5.1 Scope and Functional Summary

Define sectioned evaluator questionnaires and typed responses for behavioral performance assessment.

### 5.2 Listing and Navigation

Listing / entry point: HR template list with status, version and section/question summary.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 5.3 Status Workflow

| Status    | Visibility / ownership | Editability                             | Permitted next action / effect      |
| --------- | ---------------------- | --------------------------------------- | ----------------------------------- |
| Draft     | HR                     | Editable                                | Save, preview, publish              |
| Published | HR                     | Frozen for new selected cycle snapshots | Create next version or archive      |
| Archived  | HR                     | Read-only historical reference          | Unavailable for new cycle selection |

### 5.4 User Journey / Processing Workflow

## 1. HR creates sections and adds Rating Scale, Short Answer, Paragraph and Multiple Choice questions.

## 2. HR configures requiredness and whether Not Observed is available for rating questions.

## 3. System validates question-specific values and unique choice options.

## 4. HR previews a response and publishes a version.

## 5. A cycle selects a default template and compatible position overrides; each participant retains a fixed snapshot.

### 5.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group           | Type / format                          | Required            | Validation / behavior                                                      |
| ----------------------- | -------------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| Template version        | ID + version                           | Yes                 | Section/question configuration is frozen by cycle.                         |
| Question                | ID, prompt, type, required flag        | Yes                 | Response type must match question type; required questions need an answer. |
| Rating answer           | Integer 1-5 or configured Not Observed | As configured       | Only observed numeric 1-5 answers contribute to behavioral scoring.        |
| Multiple-choice options | Distinct option set                    | For Multiple Choice | At least one valid option; duplicates are rejected.                        |

### 5.6 Business Rules, Preconditions and Data Effects

- Narrative and multiple-choice answers do not contribute numeric rating.
- Not Observed and unanswered optional items are excluded from numeric scoring.
- Template changes after selection do not alter cycle snapshots.

### 5.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event                        | Data that shall be recorded                                                                              | Example history entry                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Behavioral Assessment Templates created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception                 | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action              | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 5.8 Permissions and Security

HR Administrator; assigned evaluators; subjects view permitted released results. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 5.9 Outputs and Reports

Published questionnaire versions, response schema, preview.

### 5.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Tpl-B-001

| Current | HR can create, preview, publish, version and archive sectioned templates with Rating Scale, Short Answer, Paragraph and Multiple Choice question types. | Given valid in-scope data, the stated action succeeds and displays the resulting state; invalid, unauthorized, duplicate and boundary actions are rejected without partial writes. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### Tpl-B-002

| Current | Rating questions use integer values 1–5 with the labels Never, Rarely, Sometimes, Often and Always. “Not Observed” is available where configured and is excluded from numeric scoring. | Submit each rating 1–5 and configured Not Observed; include only observed numeric ratings in the mean. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |

### Tpl-B-003

| Current | Required questions must have a valid answer matching their type. Multiple-choice options must be present and distinct. Text and multiple-choice answers do not contribute a numeric rating. | Attempt blank required answers, invalid question types and duplicate/missing choices; block invalid publication/submission and retain drafts. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |

### Tpl-B-004

| Current | A cycle may select a default behavioral template and compatible position overrides. The selected snapshot remains fixed for each participant even if their position or live template changes later. | Given valid in-scope data, the stated action succeeds and displays the resulting state; invalid, unauthorized, duplicate and boundary actions are rejected without partial writes. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### 5.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

## 6. Review Cycle Management

| Specification Area | Definition                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose            | Create, validate, schedule, launch and manage review cycles with participants, component selection, frozen templates, stages, evaluators, deadlines and visibility. |
| Primary actors     | HR Administrator; employees, managers and evaluators as participants.                                                                                               |
| Dependencies       | Employee directory, company/position scope, templates, manager assignments, clock/scheduler.                                                                        |

### 6.1 Scope and Functional Summary

Create, validate, schedule, launch and manage review cycles with participants, component selection, frozen templates, stages, evaluators, deadlines and visibility.

### 6.2 Listing and Navigation

Listing / entry point: HR All Reviews/Cycles list; filters and details remain within company/role scope.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 6.3 Status Workflow

| Status    | Visibility / ownership        | Editability                                     | Permitted next action / effect                                 |
| --------- | ----------------------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| Draft     | HR                            | Configurable                                    | Edit, validate, schedule or launch                             |
| Scheduled | HR                            | Frozen configuration; waiting for due date      | Activate when due after revalidation; repair/cancel if invalid |
| Active    | HR and permitted participants | Permitted work can proceed                      | Complete/finalize after gates                                  |
| Completed | Authorized roles              | Finalized/locked                                | Result release is separate                                     |
| Cancelled | HR                            | Record retained; no new work or released result | Terminal                                                       |

### 6.4 User Journey / Processing Workflow

## 1. HR creates cycle details, review type and evaluation period.

## 2. HR selects participants and maps each participant to an eligible position-specific KPI template.

## 3. HR selects component weights, behavioral templates, ordered assessment stages, evaluators and deadlines.

## 4. Readiness checks participants, templates, stage/evaluator completeness, company scope, valid dates and unexpired work windows.

## 5. HR launches immediately or schedules activation; activation creates assignments from frozen records.

## 6. HR monitors cycle status and applies supported recovery or cancellation.

### 6.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group           | Type / format                                             | Required    | Validation / behavior                                                                    |
| ----------------------- | --------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| Cycle                   | ID, company, state, evaluation period, deadlines          | Yes         | Date order and company scope validated; state is controlled.                             |
| Participant snapshot    | Employee ID, position, template mapping                   | Yes         | Every participant resolves to eligible compatible frozen template(s).                    |
| Workflow config         | Component set/weights, stage order, evaluators, deadlines | As selected | Assignments and stage dependencies are complete; component weights follow configuration. |
| Cycle result visibility | Role/employee visibility settings                         | Yes         | Finalization and release remain separate actions.                                        |

### 6.6 Business Rules, Preconditions and Data Effects

- New simplified cycles use Goals Performance and Behavioral Performance at 50/50.
- Supported review types: Standard Performance Review, 360 Feedback, Probationary Review and Project-Based Review.
- Invalid/expired scheduled cycles remain Scheduled and visible for HR repair; they do not silently substitute a live template.
- Production cycle creation/activation must be transactional, idempotent and audited.

### 6.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event                | Data that shall be recorded                                                                              | Example history entry                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Review Cycle Management created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception         | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action      | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 6.8 Permissions and Security

HR Administrator; employees, managers and evaluators as participants. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 6.9 Outputs and Reports

Cycle list/detail, readiness errors, assignment generation result and progress summary.

### 6.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Cyc-001

| Current | HR selects a review type, name, evaluation period, assessment start, participants, component selection, applicable KPI and behavioral templates, evaluator stages, evaluator assignments, deadlines and result visibility. | Exercise each wizard step with valid data and one missing/invalid value; block launch and preserve the editable draft until corrected. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |

### Cyc-002

| Current | Supported review types include Standard Performance Review, 360° Feedback, Probationary Review and Project-Based Review. | Exercise each wizard step with valid data and one missing/invalid value; block launch and preserve the editable draft until corrected. |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |

### Cyc-003

| Current | New simplified cycles use Goals Performance and Behavioral Performance at 50/50 weighting. The standard sequence is Self, Manager, HR; eligible optional peer/upward perspectives are supported by the workflow model. | Exercise each wizard step with valid data and one missing/invalid value; block launch and preserve the editable draft until corrected. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |

### Cyc-004

| Current | For each participant, the selected KPI Goal Template must match their position or HR must choose an eligible match. Missing/invalid mappings block readiness. | Exercise each wizard step with valid data and one missing/invalid value; block launch and preserve the editable draft until corrected. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |

### Cyc-005

| Current | Cycle readiness validates participant scope, required templates, stage/evaluator completeness, authorized reviewer assignment, valid date order and unexpired work windows. Validation points to the owning wizard step. | For every invalid field, show a step-linked readiness error; launch remains unavailable until all participant/template/stage/date gates pass. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |

### Cyc-006

| Current | Scheduling freezes configuration and participant performance records; scheduled cycles create assessment assignments when due. Launch creates cycle-specific assignments and work records according to configured workflow. | Launch and scheduled activation create one frozen participant snapshot and one set of assignments; retry creates no duplicates. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |

### Cyc-007

| Current | Draft, Scheduled, Active, Completed and Cancelled remain distinct cycle states. Drafts are configurable; Scheduled waits for its date; Active accepts permitted work; Completed is finalized/locked; Cancelled retains records but accepts no new work or released results. | Exercise each wizard step with valid data and one missing/invalid value; block launch and preserve the editable draft until corrected. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |

### Cyc-008

| Current | A scheduled cycle whose dates/template snapshots are invalid or whose entire window expired remains Scheduled and is surfaced to HR for recovery. It is not silently activated or assigned a substitute live template. | Break a saved schedule snapshot or let its window expire; retain Scheduled, surface a repair message and create no partial assignments. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |

### Cyc-009

| Production gate | Cycle creation and activation must be transactional, idempotent and audited so retry does not create duplicate assignments or partial participant records. | Exercise each wizard step with valid data and one missing/invalid value; block launch and preserve the editable draft until corrected. |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |

### 6.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

## 7. KPI Accomplishments and Manager Verification

| Specification Area | Definition                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose            | Collect employee actuals against frozen KPI indicators, preserve submission history and allow eligible managers to verify or return reported evidence. |
| Primary actors     | Employee; eligible current manager; HR for schedule recovery.                                                                                          |
| Dependencies       | Active cycle, participant snapshot, KPI template, evaluation period, manager scope and verification deadline.                                          |

### 7.1 Scope and Functional Summary

Collect employee actuals against frozen KPI indicators, preserve submission history and allow eligible managers to verify or return reported evidence.

### 7.2 Listing and Navigation

Listing / entry point: Employee Goals view; manager verification queue scoped to current team/company.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 7.3 Status Workflow

| Status    | Visibility / ownership                       | Editability                                                   | Permitted next action / effect              |
| --------- | -------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------- |
| Draft     | Employee                                     | Editable                                                      | Save or submit when period ends             |
| Submitted | Employee read-only; manager decision pending | Locked pending verification                                   | Verify or return with reason                |
| Returned  | Employee                                     | Editable through verification deadline                        | Correct and resubmit                        |
| Verified  | Authorized roles                             | Evidence accepted; actual remains distinct from target result | Used by scoring and Manager assessment gate |

### 7.4 User Journey / Processing Workflow

## 1. Employee opens an eligible active cycle and views its frozen indicators, unit, direction, target and matrix criteria.

## 2. Employee may save draft actuals and optional remarks.

## 3. After evaluation period end, employee submits all required actuals.

## 4. Eligible manager verifies or returns the record with a reason.

## 5. Employee corrects returned values before the verification deadline and resubmits; prior version is retained.

## 6. Verified actuals feed KPI scoring and may be considered by automatic PIP referral after finalization/release.

### 7.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group       | Type / format                                                        | Required       | Validation / behavior                                                                                                        |
| ------------------- | -------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Accomplishment      | Cycle ID, employee ID, actuals, remarks, status, verification        | Yes            | Every required actual is nonnegative numeric; draft may be incomplete; final submit requires complete values and period end. |
| Frozen KPI evidence | Indicator ID, name, target, unit, direction, weight, matrix criteria | Read-only      | Employee cannot edit target, weight, template or position mapping.                                                           |
| Correction version  | Version, actor, timestamp, correction reason                         | When corrected | Prior known submission is retained; history is not fabricated for legacy values that were overwritten before versioning.     |

### 7.6 Business Rules, Preconditions and Data Effects

- Verification confirms the report as evidence; it does not mean the target was met.
- Manager verification occurs only in active unreleased cycle and configured verification window.
- Manager assessment submission is blocked while required KPI accomplishments remain unverified.
- Returned records remain editable through the verification deadline; HR must extend the active schedule after that window.

### 7.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event                                     | Data that shall be recorded                                                                              | Example history entry                                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| KPI Accomplishments and Manager Verification created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception                              | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action                           | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 7.8 Permissions and Security

Employee; eligible current manager; HR for schedule recovery. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 7.9 Outputs and Reports

Employee actual report, manager verification queue, version/history view.

### 7.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Acc-001

| Current | Employee selects an eligible cycle and sees only their frozen indicator definitions, scoring matrix, unit, direction and target. | Exercise draft, submit, verify, return, correction, resubmission and deadline boundaries; invalid actions preserve prior evidence. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |

### Acc-002

| Current | Employee may save a draft before the evaluation period ends. Final submission requires the evaluation period to have ended and every required actual to be a nonnegative number. Remarks are optional. | Allow draft before period end; reject final submission before period end or with missing/negative/non-finite actual; allow valid zero after end. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |

### Acc-003

| Current | Submission locks values pending manager verification. Each saved submission version records actuals, remarks, actor, timestamp and correction reason when applicable. | Submit, return, correct and resubmit; compare both versions, actor, time, actuals, remarks and required reason in history. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |

### Acc-004

| Current | The eligible manager verifies or returns a submitted record with a reason. Verification accepts the report as evidence; it does not assert that the actual met target. | Return without reason is blocked; verify accepts below-target evidence without marking it target-met. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |

### Acc-005

| Current | Manager verification is allowed within an active unreleased cycle and configured verification window. An assigned Manager assessment cannot be submitted if Goals Performance applies and accomplishments are not verified. | Try manager verification outside scope, outside active dates, or before KPI verification gate; reject and preserve the record. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |

### Acc-006

| Current | Returned records are editable through the verification deadline even if the original accomplishment deadline passed; after the verification window, HR must extend the active schedule first. | Return after submission deadline but before verification deadline; permit correction. After verification deadline, require HR schedule extension. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |

### Acc-007

| Current | Employee cannot change target, indicator weight, template mapping or position assignment through the accomplishment screen. | Exercise draft, submit, verify, return, correction, resubmission and deadline boundaries; invalid actions preserve prior evidence. |
| ------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |

### Acc-008

| Current | The prior known submission is retained in history when a correction is resubmitted. Older legacy records preserve only versions that existed; overwritten historical versions are not fabricated. | Exercise draft, submit, verify, return, correction, resubmission and deadline boundaries; invalid actions preserve prior evidence. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |

### 7.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

## 8. Evaluator Assignments and Assessments

| Specification Area | Definition                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Purpose            | Assign responses to evaluators and enforce role-scoped, stage-sequenced completion of behavioral assessments. |
| Primary actors     | Assigned evaluator; HR administrator; subject/manager for permitted views.                                    |
| Dependencies       | Cycle stage config, evaluator assignment, behavioral template snapshot, deadlines and cycle state.            |

### 8.1 Scope and Functional Summary

Assign responses to evaluators and enforce role-scoped, stage-sequenced completion of behavioral assessments.

### 8.2 Listing and Navigation

Listing / entry point: Review queue scoped by role, company, subject, exact evaluator assignment and stage.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 8.3 Status Workflow

| Status      | Visibility / ownership       | Editability                            | Permitted next action / effect                     |
| ----------- | ---------------------------- | -------------------------------------- | -------------------------------------------------- |
| Locked      | Evaluator                    | Not editable                           | Wait for preceding stages                          |
| Not Started | Assigned evaluator           | Editable when stage opens              | Start/save draft                                   |
| In Progress | Assigned evaluator           | Editable                               | Save draft or submit                               |
| Submitted   | Assigned evaluator read-only | Locked except authorized HR correction | Complete downstream stage                          |
| Completed   | Authorized roles             | Read-only                              | Cycle finalization when all required work complete |

### 8.4 User Journey / Processing Workflow

## 1. System creates an assignment for each subject/evaluator/stage.

## 2. Evaluator opens only their assignment after preceding configured stages are complete.

## 3. Evaluator saves draft responses and submits required answers matching question types.

## 4. System locks submitted response and opens later stage only when all prior-stage assignments are Submitted or Completed.

## 5. HR may reopen a submitted response with reason and impact confirmation; affected downstream work is marked In Progress and resubmitted in sequence.

### 8.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group      | Type / format                                                    | Required             | Validation / behavior                                                                              |
| ------------------ | ---------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| Assignment         | Assignment ID, cycle, subject, evaluator, stage, state, deadline | Yes                  | One response per assignment; only assigned evaluator can mutate it.                                |
| Response           | Answers, submitted values, feedback, actor/timestamp             | Yes at submit        | Required answers and question-type values validate; text/multiple-choice do not score numerically. |
| Stage dependency   | Ordered stage and preceding assignment status                    | Yes                  | Deadline expiry never bypasses a locked stage.                                                     |
| Correction version | Reason, actor, timestamp, prior answer snapshot                  | On reopen/correction | Prior response evidence remains readable to authorized users.                                      |

### 8.6 Business Rules, Preconditions and Data Effects

- Overdue work remains submittable while cycle is Active and stage unlocked.
- Subject participation does not imply evaluator permission.
- Prior evaluator access after manager change is limited to exact assignment history they owned.

### 8.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event                              | Data that shall be recorded                                                                              | Example history entry                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Evaluator Assignments and Assessments created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception                       | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action                    | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 8.8 Permissions and Security

Assigned evaluator; HR administrator; subject/manager for permitted views. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 8.9 Outputs and Reports

Assignment queue, assessment response, completion status and correction history.

### 8.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Rev-001

| Current | Review listing is scoped to role, company, subject and assigned evaluator; search and filters must not widen access. | Exercise assignment ownership, question validation, stage dependencies, overdue state and HR correction; only assigned evaluator can mutate response. |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |

### Rev-002

| Current | An evaluator can save drafts and submit answers only for their assignment. Responses validate required answers and question-type data. | Exercise assignment ownership, question validation, stage dependencies, overdue state and HR correction; only assigned evaluator can mutate response. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |

### Rev-003

| Current | A stage is available only when all assignments in each preceding configured stage are Submitted or Completed. Deadline expiry does not bypass a stage dependency. | Complete all but one assignment in an earlier stage; verify next stage remains locked until the last predecessor is submitted. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |

### Rev-004

| Current | An available overdue assessment remains submittable while its cycle is Active and the stage is unlocked. Overdue is not a separate permission state. | After due time, keep cycle Active and stage unlocked; allow submission while showing overdue status. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |

### Rev-005

| Current | Submitted responses are read-only except an authorized HR correction flow. A reopened response and affected downstream responses must be resubmitted in sequence. | Attempt to edit submitted response as evaluator; deny. HR reopen requires reason/confirmation and downstream responses resubmit. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |

### Rev-006

| Current | Assessment responses preserve answers, submitted values, feedback, actor/timestamp and correction history. | Exercise assignment ownership, question validation, stage dependencies, overdue state and HR correction; only assigned evaluator can mutate response. |
| ------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |

### Rev-007

| Current | A retained prior evaluator may view only the evidence/history of the exact assignment they own after a manager change; the prior evaluator gains no general team/journal access or verification authority. | After reassignment, prior evaluator can open only owned assignment history; deny all other team or verification access. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |

### 8.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

## 9. Finalization, Scoring and Result Release

| Specification Area | Definition                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose            | Calculate evaluation scores from frozen evidence, lock complete results and make them visible only through an explicit release action. |
| Primary actors     | HR finalizer/releaser; employee and manager result viewers within scope.                                                               |
| Dependencies       | Completed cycle, verified KPI actuals, required submitted/completed assignments, scoring configuration and snapshots.                  |

### 9.1 Scope and Functional Summary

Calculate evaluation scores from frozen evidence, lock complete results and make them visible only through an explicit release action.

### 9.2 Listing and Navigation

Listing / entry point: HR result/finalization view; employee and manager views expose only released, permitted results.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 9.3 Status Workflow

| Status      | Visibility / ownership        | Editability                                                    | Permitted next action / effect |
| ----------- | ----------------------------- | -------------------------------------------------------------- | ------------------------------ |
| In Progress | HR/participants               | Workflow active                                                | Complete required work         |
| Finalized   | HR                            | Result and evidence locked, not yet visible as released result | Release Results                |
| Released    | Permitted employee/manager/HR | Read-only                                                      | View released result           |
| Cancelled   | HR                            | No new work/released results                                   | Retained record                |

### 9.4 User Journey / Processing Workflow

## 1. HR verifies all required assignments and accomplishments meet completion gates.

## 2. System computes goal and behavioral components from cycle-frozen scoring rules.

## 3. HR finalizes; result snapshot stores evidence, scores, weights and relevant configuration.

## 4. HR separately releases results.

## 5. Employee sees own released result; manager sees permitted team results; HR sees authorized organization scope.

## 6. A released result with a verified KPI below direction-specific target may create a PIP referral.

### 9.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group           | Type / format                                                                                   | Required              | Validation / behavior                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------ |
| Evaluation snapshot     | Cycle, employee, score components, weights, evidence, finalizedAt/releasedAt                    | System generated      | Finalization locks snapshot; release is separate.                              |
| Goal score evidence     | Verified actual, target, direction, indicator weight, target/below-target score or matrix scale | When Goals applies    | Score derives from frozen target/direction and saved scoring mapping.          |
| Behavior score evidence | Eligible observed rating answers and respondent perspective                                     | When Behavior applies | Average observed 1-5 responses; Not Observed/optional unanswered excluded.     |
| Anonymous group result  | Perspective, distinct submitted count, pooled eligible responses                                | When configured       | Suppress below threshold values and narratives; no reviewer identity exposure. |

### 9.6 Business Rules, Preconditions and Data Effects

- Overall for new simplified cycles = Goals Performance × 0.50 + Behavioral Performance × 0.50.
- Absent/not-applicable components are not silently converted to zero.
- Anonymous Peer/Upward aggregation is visible only after the configured minimum of distinct submitted evaluators (2-10).
- Weights, score-to-rating meaning, target scoring and anonymity threshold require HR policy approval before production.

### 9.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event                                 | Data that shall be recorded                                                                              | Example history entry                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Finalization, Scoring and Result Release created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception                          | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action                       | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 9.8 Permissions and Security

HR finalizer/releaser; employee and manager result viewers within scope. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 9.9 Outputs and Reports

Finalized result view, released result, manager/HR report and export within data scope.

### 9.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Res-001

| Current | HR can finalize only after required assignments are Submitted or Completed and required accomplishments are verified. | Leave one required assignment unsubmitted or one accomplishment unverified; finalization is blocked with the missing record named. |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |

### Res-002

| Current | Finalization locks workflow and persists result evidence, component scores, weights and relevant configuration snapshots. It does not release results. | Finalize valid cycle; verify snapshots lock and result remains unreleased. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |

### Res-003

| Current | HR performs a separate explicit Release Results action. Authorized employees see own results; managers see permitted team results; HR views authorized organization scope. | Release a finalized result; confirm Employee self-only, Manager current team, HR authorized organization scope. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |

### Res-004

| Current | For goal scoring, each verified actual is compared with the frozen target and direction. Template target-met/below-target scores are weighted by indicator weight; scoring-enabled numeric matrices use their saved scale mapping. | Test direction-specific target logic and scoring-enabled matrix; calculate weighted indicator result from frozen actual/criteria. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |

### Res-005

| Current | New simplified cycles use a 50/50 component mix. Overall = Goals Performance × 0.50 + Behavioral Performance × 0.50. Historical cycles retain their saved weights and result snapshots. | Exercise scoring boundaries, finalization, release and result scope; locked snapshots and anonymity rules remain enforced. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |

### Res-006

| Current | Behavioral numeric scoring averages eligible observed 1–5 answers from submitted/completed responses. Not Observed and unanswered optional items are excluded; narrative and multiple choice do not score. | Include numeric ratings, Not Observed, optional blanks, text and multiple choice; only eligible observed 1–5 values contribute. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |

### Res-007

| Current | A component that is absent/not applicable is not silently converted to zero. The saved result reflects configured component availability and scoring policy. | Exercise scoring boundaries, finalization, release and result scope; locked snapshots and anonymity rules remain enforced. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |

### Res-008

| Current | Anonymous Peer/Upward results are included only after the configured minimum count of distinct submitted evaluators (2–10). Eligible responses are pooled per perspective; below-threshold values and narratives are withheld. Individual respondents can view only their own response. | Set anonymous threshold to minimum, test one below and exact threshold; withhold under-threshold scores/narratives and identities. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |

### Res-009

| Policy decision | HR must formally approve weights, score-to-rating meaning, target scoring and anonymity threshold before production use. | Exercise scoring boundaries, finalization, release and result scope; locked snapshots and anonymity rules remain enforced. |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |

### 9.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

## 10. Workflow Recovery and Effective-Dated Manager Assignments

| Specification Area | Definition                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose            | Resolve recoverable active-work exceptions and safely apply future performance-manager assignments and scheduled cycle actions.            |
| Primary actors     | HR Administrator; manager and employee scopes update only after valid application.                                                         |
| Dependencies       | Active unreleased cycle, deadlines, assignment graph, company clock, browser-local scheduler (prototype) or server scheduler (production). |

### 10.1 Scope and Functional Summary

Resolve recoverable active-work exceptions and safely apply future performance-manager assignments and scheduled cycle actions.

### 10.2 Listing and Navigation

Listing / entry point: HR recovery attention list, manager assignment queue, settings and active cycle detail.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 10.3 Status Workflow

| Status             | Visibility / ownership | Editability                                | Permitted next action / effect                    |
| ------------------ | ---------------------- | ------------------------------------------ | ------------------------------------------------- |
| Pending            | HR                     | Future-effective; current access unchanged | Due-date revalidation                             |
| Applied            | HR/system              | Applied once                               | New manager scope affects eligible unstarted work |
| Blocked            | HR                     | No scope change                            | Resolve or cancel                                 |
| Cancelled          | HR                     | No scope change                            | Terminal                                          |
| Recovery available | HR                     | Active unreleased cycle only               | Extend or reopen with reason and confirmation     |

### 10.4 User Journey / Processing Workflow

## 1. HR selects employee, manager, company and effective date.

## 2. System validates employee/manager eligibility, same-company scope, self-assignment and projected reporting graph.

## 3. Before effective date, assignment stays Pending. On due date, system revalidates live eligibility and graph; invalid assignments become Blocked.

## 4. Valid assignment applies once; not-started Manager responses/future cycle reviewers update; In Progress/Submitted retain original evaluator.

## 5. HR may extend active, unreleased cycle dates or reopen submitted assessments with reason and impact confirmation.

## 6. Browser scheduler checks on startup/focus/visibility/every 30 seconds and defers writes while forms/dialogs are dirty.

### 10.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group      | Type / format                                                      | Required      | Validation / behavior                                                                                       |
| ------------------ | ------------------------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------- |
| Manager assignment | Employee, manager, company, effective date, status, history        | Yes           | No self-assignment, same-company mismatch or reporting loop; future assignments do not alter current scope. |
| Schedule extension | Before/after deadlines, reason, actor/time                         | When extended | Active unreleased cycle only; no deadline shortened; date order valid; at least one date changes.           |
| Assessment reopen  | Assignment ID, reason, impact confirmation, old/new response state | When reopened | Affected downstream responses require resubmission; KPI evidence remains unchanged.                         |
| Scheduled action   | Action key, due date, status, validation, retry info               | System        | Idempotent; invalid/expired cycle stays visible; partial generation rolls back.                             |

### 10.6 Business Rules, Preconditions and Data Effects

- Completed/released cycles cannot use active-cycle recovery tools.
- Due manager assignments validate chronologically, including same-day and future batches.
- Current clock uses Asia/Manila; demo date is explicit and does not reverse already-applied actions.
- Production requires a server-backed independent worker, retry policy, monitoring and alerting.

### 10.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event                                                  | Data that shall be recorded                                                                              | Example history entry                                                                    |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Workflow Recovery and Effective-Dated Manager Assignments created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception                                           | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action                                        | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 10.8 Permissions and Security

HR Administrator; manager and employee scopes update only after valid application. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 10.9 Outputs and Reports

Actionable recovery queue, assignment history, scheduled/blocked/cancelled status and cycle attention state.

### 10.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Rec-001

| Current | HR may extend dates for active, unreleased cycles only. A reason is required, no existing deadline may be shortened, date ordering remains valid, and at least one date must change. | Try no reason, shortening a date, invalid order, unchanged schedule and eligible extension; only valid extension commits. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |

### Rec-002

| Current | Extension updates cycle and assignment deadlines without discarding answers. Before/after dates, reason, actor and timestamp are retained in history. | Exercise active/unreleased eligible recovery and completed/released rejection; history records reason, actor and before/after state. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |

### Rec-003

| Current | HR may reopen a submitted assessment with a reason and explicit impact confirmation. Selected and downstream started/submitted responses are marked In Progress and must be resubmitted; prior versions remain readable to authorized users. | Reopen an earlier response in multi-stage flow; archive previous and downstream work and require sequential resubmission. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |

### Rec-004

| Current | Reopening assessment does not change verified accomplishment evidence or actuals. It is not a general override of scoring or workflow. | Exercise active/unreleased eligible recovery and completed/released rejection; history records reason, actor and before/after state. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |

### Rec-005

| Current | Completed/released cycles cannot be recovered through active-cycle deadline or assessment correction tools. Cancellation remains distinct and preserves existing records. | Exercise active/unreleased eligible recovery and completed/released rejection; history records reason, actor and before/after state. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |

### Rec-006

| Current                 | Failures such as missing frozen templates, missing evaluators, invalid date order, missing required answers and expired windows produce a visible actionable error and leave the underlying workflow unchanged. | Exercise active/unreleased eligible recovery and completed/released rejection; history records reason, actor and before/after state. |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Requirement ID / Status | Requirement                                                                                                                                                                                                     | Acceptance Criteria                                                                                                                  |

### Mgr-001

| Current | HR assigns existing eligible employees individually or in batches to an eligible manager and company with an effective date on or after the current company date. | Exercise single and batch future assignment, due-date revalidation, graph changes, block/cancel and current/frozen assignment behavior. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |

### Mgr-002

| Current | Submission validates employee and manager eligibility, same-company scope, no self-assignment and no reporting loop in the projected schedule. Multiple future assignments are validated chronologically, including same-day batches. | Attempt self, cross-company, ineligible and cyclic reporting assignments plus a valid same-day batch; reject invalid batch atomically. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |

### Mgr-003

| Current | A future assignment remains Pending; it does not change current manager/team scope or reviewer access before its effective date. | Before effective date, current manager/team/permissions remain unchanged; due date applies valid change once. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |

### Mgr-004

| Current | On due date, the scheduler revalidates live manager eligibility, employee/company scope and reporting graph. Invalid entries become Blocked; current scope is retained and HR can cancel/resolve them. | Invalidate manager/company/graph before effective date; assignment becomes Blocked and previous manager remains current. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |

### Mgr-005

| Current | Due valid changes apply once. Not-started Manager responses/future cycle reviewers are updated; In Progress and Submitted responses retain their existing evaluator. | Exercise single and batch future assignment, due-date revalidation, graph changes, block/cancel and current/frozen assignment behavior. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |

### Mgr-006

| Current | HR Settings, employee directory and assignment form expose scheduled/blocked/cancelled status and cancellation where allowed. Assignment history records before/after, reason, actor and time. | Exercise single and batch future assignment, due-date revalidation, graph changes, block/cancel and current/frozen assignment behavior. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |

### Mgr-007

| Production gate         | Replace the client-side queue with a transactional, server-backed assignment history and scheduler that is independent of browser availability. | Exercise single and batch future assignment, due-date revalidation, graph changes, block/cancel and current/frozen assignment behavior. |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement ID / Status | Requirement                                                                                                                                     | Acceptance Criteria                                                                                                                     |

### Clk-001

| Current | Live workflow date uses Asia/Manila, independent of the computer's local timezone. | Compare timestamps around Manila midnight on hosts in other timezones; workflow date changes only at Asia/Manila midnight. |
| ------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |

### Clk-002

| Current | HR can select explicit Demo Date mode with a valid calendar date after confirmation. A change does not reverse cycles opened or assignments already applied. | Reject invalid calendar demo date; confirm valid change; previously applied transfer/cycle action is not reversed. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |

### Clk-003

| Current | The browser-local scheduler evaluates due manager assignments before scheduled cycle activation, and validates frozen configuration before generating assignments. | Exercise live/demo date, invalid date, due processing, focus/startup catch-up and dirty-form deferral. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |

### Clk-004

| Current | Checks run on app initialization, focus return, visible-document transition and every 30 seconds while a session is open. Missed due work is caught up on the next check. | Exercise live/demo date, invalid date, due processing, focus/startup catch-up and dirty-form deferral. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |

### Clk-005

| Current | Dirty forms and open dialogs defer workflow mutations to avoid losing user work. HR can run due actions manually. | Make a form dirty/open a modal during a due event; no mutation or data loss occurs until safe processing resumes. |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |

### Clk-006

| Current | Invalid/expired cycle schedules and generation failures remain visible for HR correction. Partial assignment generation is rolled back when the client operation fails. | Exercise live/demo date, invalid date, due processing, focus/startup catch-up and dirty-form deferral. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |

### Clk-007

| Production gate | No due action executes with all browsers closed. Production must use a server scheduler, atomic task state, retry policy, monitoring and alerting. | Exercise live/demo date, invalid date, due processing, focus/startup catch-up and dirty-form deferral. |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |

### 10.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

1. 202 Files, Journal Entries and NTE Files
   | Specification Area | Definition |
   | --- | --- |
   | Purpose | Provide separate employee-record Journal Entries and NTE Files workflows, with HR-only issue/resolution and employee self-service response. |
   | Primary actors | HR Administrator; Manager read-only within team; Employee view/respond to own issued NTE. |
   | Dependencies | Employee/company directory, role/team scope, in-app notification state and retention policy. |

### 11.1 Scope and Functional Summary

Provide separate employee-record Journal Entries and NTE Files workflows, with HR-only issue/resolution and employee self-service response.

### 11.2 Listing and Navigation

Listing / entry point: 202 Files has Journal Entries and NTE Files tabs. NTE file opens an employee masterlist; selected employee shows active and past notices.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 11.3 Status Workflow

| Status        | Visibility / ownership          | Editability                                          | Permitted next action / effect              |
| ------------- | ------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| NTE Draft     | HR                              | Editable; hidden from employee/manager               | Save, review, issue or cancel with reason   |
| Issued / Open | Employee + permitted HR/manager | Notice content locked; one response may be submitted | Employee respond; HR close/exception/cancel |
| Responded     | Employee read-only; HR          | Response locked                                      | HR close                                    |
| Closed        | Authorized viewers              | Read-only                                            | Terminal                                    |
| Cancelled     | HR                              | Read-only; reason retained                           | Terminal                                    |

### 11.4 User Journey / Processing Workflow

## 1. HR or manager opens the Journal Entries tab to view permitted employee records; HR creates journal context with date/type/title/description and optional cycle.

## 2. HR selects NTE Files and chooses an employee from the masterlist.

## 3. HR creates a draft containing category, subject, body, explanation deadline, and optional incident date/reference.

## 4. HR reviews and issues the NTE; issue locks content and creates an in-app notification. Opening creates a read receipt.

## 5. Employee views own active/past issued NTE and submits one explanation while notice remains open, even after deadline.

## 6. HR closes after response or deadline; early closure requires separate reason and confirmation; cancellation is separate and reasoned.

### 11.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group      | Type / format                                                               | Required     | Validation / behavior                                                                       |
| ------------------ | --------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| Journal entry      | Date, type, title, description, author, company, optional cycle             | Yes          | Provides context only; does not automatically create a rating.                              |
| NTE                | Notice ID, employee, category, subject, body, deadline, status, explanation | Yes at issue | HR-only create/issue/resolve; draft hidden; employee may submit one explanation while open. |
| Incident reference | Date and external reference                                                 | Optional     | May be recorded without changing response/closure rules.                                    |
| Read receipt       | Notice ID, employee, openedAt                                               | On open      | Created when employee opens an issued notice.                                               |

### 11.6 Business Rules, Preconditions and Data Effects

- Managers can view only issued NTEs for permitted current team employees and cannot create, issue, cancel or resolve notices.
- Response remains available through deadline day; late response is allowed while notice is open.
- NTE outcomes do not automatically trigger disciplinary action.
- Production requires durable document storage, privacy/retention controls and delivery audit.

### 11.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event                                 | Data that shall be recorded                                                                              | Example history entry                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 202 Files, Journal Entries and NTE Files created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception                          | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action                       | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 11.8 Permissions and Security

HR Administrator; Manager read-only within team; Employee view/respond to own issued NTE. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 11.9 Outputs and Reports

Journal listing/detail; employee masterlist; employee notice history; notice detail, explanation and read receipt.

### 11.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Doc-001

| Current | 202 Files presents separate Journal Entries and NTE Files tabs. HR and managers see only permitted records; Employee sees their own issued NTEs only. | Exercise HR draft/issue/close/cancel, employee read/response and Manager team-only read; no unauthorized mutation succeeds. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |

### Doc-002

| Current | Journals capture date, type, title, description, author, optional related cycle and event history. Journal entries inform context but never generate ratings automatically. | Exercise HR draft/issue/close/cancel, employee read/response and Manager team-only read; no unauthorized mutation succeeds. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |

### Doc-003

| Current | HR-only NTE creation supports employee, category, subject, body, explanation deadline and optional incident date/reference. HR may save, review and edit a draft before explicit issuance. | Draft validates required employee/category/subject/body/deadline; invalid data cannot be issued. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |

### Doc-004

| Current | Issuance locks notice content and creates an in-app employee notification. Opening creates a read receipt. | Issue an NTE; content becomes locked and one employee notification appears; opening stores read receipt. |
| ------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |

### Doc-005

| Current | The employee can submit one explanation while an issued notice remains open, including after the deadline. Submission changes status to Responded and locks the response. | Submit exactly one response while notice remains open, including after deadline; response becomes read-only. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |

### Doc-006

| Current | HR normally closes after employee response or after the deadline expires. The response window remains open through the deadline day. Earlier closure requires a separate reason, explicit confirmation and visible exception history. | Attempt ordinary close before response/deadline; block. Early exception requires separate reason/confirmation and audit event. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |

### Doc-007

| Current | Cancellation is distinct from closure and requires its own reason. Unissued cancelled drafts remain hidden from employee and manager views. | Exercise HR draft/issue/close/cancel, employee read/response and Manager team-only read; no unauthorized mutation succeeds. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |

### Doc-008

| Current | Managers can read issued NTEs only for permitted team employees; managers cannot create, issue, cancel or resolve them. No automated disciplinary outcome occurs. | Manager sees issued notices of current permitted teammates but cannot create, edit, issue, close or cancel. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |

### Doc-009

| Production gate | Add durable document storage, privacy/retention policy, attachment scanning if attachments are introduced, and delivery audit; current content is browser-local. | Exercise HR draft/issue/close/cancel, employee read/response and Manager team-only read; no unauthorized mutation succeeds. |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |

### 11.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

## 12. Performance Improvement Plan

| Specification Area | Definition                                                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose            | Enroll employees after verified KPI failures or manual HR/Manager referral, plan weekly measurable improvement, collect employee progress and record staff assessment and closure. |
| Primary actors     | All roles can view according to scope; HR and permitted Managers configure/enroll/assess/review/close; employee acknowledges and submits own progress.                             |
| Dependencies       | Completed and released KPI result for automatic referral; employee/company/manager scope; source indicator snapshots and company date.                                             |

### 12.1 Scope and Functional Summary

Enroll employees after verified KPI failures or manual HR/Manager referral, plan weekly measurable improvement, collect employee progress and record staff assessment and closure.

### 12.2 Listing and Navigation

Listing / entry point: PIP is visible in role navigation; employee sees own plans, manager sees permitted team plans, HR sees authorized organization scope.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 12.3 Status Workflow

| Status            | Visibility / ownership   | Editability                                 | Permitted next action / effect            |
| ----------------- | ------------------------ | ------------------------------------------- | ----------------------------------------- |
| Awaiting Planning | HR/Manager/Employee view | Referral exists; sections not yet activated | Resolve source coverage and plan criteria |
| Draft             | HR/Manager               | Planning editable                           | Add weeks/exclusions; validate            |
| Active            | Employee + HR/Manager    | Week progress and assessment open by date   | Submit, return, assess, follow-up         |
| Completed         | Authorized roles         | Read-only                                   | Successful; may include exclusions        |
| Not Met           | Authorized roles         | Read-only                                   | Final assessed outcome unmet              |
| Cancelled         | Authorized roles         | Read-only; reason retained                  | Terminal                                  |

### 12.4 User Journey / Processing Workflow

## 1. System evaluates a completed, released KPI result; any individually verified measurable indicator below direction-specific target creates an automatic referral.

## 2. System deduplicates by employee/source evaluation; later failed sources join an open plan and set referral review required.

## 3. Manager/HR reviews failed indicator sources and either assigns each to a measurable weekly section or records a reasoned exclusion.

## 4. Manager/HR defines weekly focus, goal, target, unit, actions/deliverables, support and inclusive seven-day dates; sections do not overlap.

## 5. Employee views plan, acknowledges if configured, saves progress during its week and submits final progress on/after week end.

## 6. Manager/HR records verified actual and remarks; outcome is derived. Late missed update assessment requires reason, actual and remarks.

## 7. Manager/HR may create a same-source follow-up week with reason. Plan can close only after all weeks are assessed, reached, coverage is resolved and referrals reviewed.

### 12.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group             | Type / format                                                                                           | Required                             | Validation / behavior                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Plan                      | Plan ID, employee, company, origin, state, source evaluation(s), exclusions, history                    | System/manual enrollment             | Automatic referral uses source results; manual enrollment requires title and reason; dedupe by employee/source evaluation. |
| Source indicator evidence | Cycle ID + indicator ID, verified actual, target, direction, unit, matrix criteria, score, failure rule | For automatic referral               | Frozen evidence is immutable and distinct across cycles even if indicator ID reused.                                       |
| Weekly section            | Week ID, source indicator, dates, focus, goal, target, unit, actions, support                           | Required to activate unless excluded | Seven inclusive days; nonoverlapping; every failed source covered or excluded with reason.                                 |
| Progress / assessment     | Employee update, actual, remarks, outcome, actor/time                                                   | Per week                             | Future weeks locked; final submit on/after week end; missing is not zero; missed-update assessment requires reason.        |
| Follow-up                 | Parent week/source indicator, later start date, reason                                                  | Optional                             | Same indicator/source; starts after original week; latest leaf outcome determines final chain result.                      |

### 12.6 Business Rules, Preconditions and Data Effects

- Automatic PIP referral only from a completed, released KPI result with at least one individually verified measurable below-target indicator; pending sibling does not suppress that verified failure.
- Behavioral-only, incomplete, unreleased, null/blank or unverified evidence does not trigger automatic referral.
- Adding a later failed source reopens coverage/referral review; uncovered source indicators block activation, referral review and closure.
- A source indicator can be covered by a weekly focus or Manager/HR reasoned exclusion; employee sees both; exclusions cannot overlap a planned focus.
- Closed plans are read-only; cancellation requires reason; PIP does not modify original KPI outcome or initiate employment/disciplinary action.

### 12.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event                     | Data that shall be recorded                                                                              | Example history entry                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Performance Improvement Plan created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception              | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action           | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 12.8 Permissions and Security

All roles can view according to scope; HR and permitted Managers configure/enroll/assess/review/close; employee acknowledges and submits own progress. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 12.9 Outputs and Reports

PIP plan list/detail, source-failure coverage, weekly schedule, employee progress, staff assessment, referral review and closure result.

### 12.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Pip-001

| Current | PIP is visible to all roles. Employee sees own plans and can acknowledge/submit progress; only HR and permitted Managers can configure, enroll, assess, return, extend, review referrals and close/cancel plans. | Exercise automatic/manual enrollment, source coverage, week dates, employee update, staff assessment, follow-up, closure and cancel. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |

### Pip-002

| Current | Automatic referral occurs from a completed, released KPI result when at least one individually verified, measurable indicator is below target according to Higher/Lower direction. A pending sibling indicator does not suppress a verified failure. Behavioral-only, incomplete, unreleased, null/blank or unverified evidence does not trigger referral. | Test released completed KPI with any verified below-target measure, pending sibling, unverified/bare/behavior-only evidence; refer only qualifying failures. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |

### Pip-003

| Current | Automatic plan begins Awaiting Planning. Manager/HR can also enroll manually with title and reason, and optionally link a completed KPI result. | Exercise automatic/manual enrollment, source coverage, week dates, employee update, staff assessment, follow-up, closure and cancel. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |

### Pip-004

| Current | Same employee/source evaluation is not referred twice. A later failed evaluation joins an existing open plan and sets referral review required without rewriting existing criteria. | Retry source synchronization and add second evaluation; do not duplicate first referral; preserve old criteria and require referral review. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |

### Pip-005

| Current | Source actuals, targets, direction, unit, matrix criteria, score and failure rule are frozen in plan evidence. Source identity is (cycleId, indicatorId) so reused indicator IDs across evaluations remain distinct. | Use same indicator ID from two cycles with different target/name; both cycle-qualified source identities remain selectable. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |

### Pip-006

| Current | Manager/HR declares measurable weekly sections, usually one indicator per week. Each contains focus, goal, target, unit, direction, actions/deliverables, support and a seven-day inclusive start/end. Sections cannot overlap; plan activation requires every required focus to be covered or explicitly excluded. | Plan each failed source in a seven-day non-overlapping week or exclusion; block activation for gaps, overlap or invalid week length. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |

### Pip-007

| Current | Each failed source indicator must have a weekly section or a Manager/HR exclusion reason. Employee sees both. An exclusion cannot overlap a planned focus; source and reason are validated; history records who/when and reason. | Exercise automatic/manual enrollment, source coverage, week dates, employee update, staff assessment, follow-up, closure and cancel. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |

### Pip-008

| Current | Adding a failed source evaluation reopens coverage/referral review. Coverage gaps block activation, referral review and closure. A previously excluded indicator must be restored before adding it as a weekly focus. | Add a new failure to active plan; coverage and review reopen and plan cannot close until resolved. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |

### Pip-009

| Current | Employee may save a draft progress update during its week. Final submission and manager assessment are permitted on or after inclusive week end. Future weeks are locked; late submissions remain available while plan is active. Submitted updates are read-only unless returned with reason. | Future week is locked; draft can be saved during current week; final submit opens on/after inclusive end date; returned update can be corrected. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |

### Pip-010

| Current | Staff assessment records a verified actual and remarks; outcome is derived against declared target. A missed submission can be assessed after week end only with explicit missed-update reason, actual and remarks; missing is never assumed zero. | Assess submitted update against target; missed update requires reason, verified actual and remarks; never substitute zero. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |

### Pip-011

| Current | A follow-up must start after the original week, retain the same indicator/source, and have a reason. Final outcome follows the latest leaf outcome of each linked follow-up chain; any unmet final leaf results in Not Met. | Attempt wrong-source, same/earlier-start or reasonless follow-up; reject. Valid chain outcome uses latest leaf assessment. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |

### Pip-012

| Current | Closure requires all weeks assessed, every week end date reached, coverage resolved, no unreviewed referral, and closure note. Successful plan with exclusions becomes Completed with Exclusions. Cancellation requires reason. Closed plans are read-only. | Attempt closure with each individual gate missing; report blockers. Valid closure records note/outcome and becomes read-only. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |

### Pip-013

| Current | PIP does not alter source KPI results and does not initiate employment or disciplinary outcomes. | Complete/cancel PIP and confirm original KPI score and employment/disciplinary status do not change. |
| ------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |

### Pip-014

| Production gate | Decide reminder/escalation policy and evidence retention. Add durable employee notice delivery and transactional writes for referrals, exclusions, assessments and closure. | Exercise automatic/manual enrollment, source coverage, week dates, employee update, staff assessment, follow-up, closure and cancel. |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |

### 12.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

## 13. Dashboard, Reports and Notifications

| Specification Area | Definition                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Purpose            | Expose role-scoped workload/status summaries, released-result reporting, exports and in-app workflow notifications. |
| Primary actors     | Employee, Manager and HR Administrator within role/company scope.                                                   |
| Dependencies       | Role-scoped workflow records, finalized/released results and notification preferences.                              |

### 13.1 Scope and Functional Summary

Expose role-scoped workload/status summaries, released-result reporting, exports and in-app workflow notifications.

### 13.2 Listing and Navigation

Listing / entry point: Role dashboards, manager/HR reports and notification center.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 13.3 Status Workflow

Dashboard/report lifecycle is derived from the underlying workflow records. Report views are read-only; notification read state does not change the underlying assignment, NTE or PIP lifecycle.

### 13.4 User Journey / Processing Workflow

## 1. User opens role dashboard and applies permitted review period, cycle, department or date-range filters.

## 2. Dashboard metrics distinguish available, locked, completed, overdue, draft, submitted, returned and verified work as applicable.

## 3. Manager/HR reports query eligible released results; user opens permitted detail or exports visible fields.

## 4. Notification center shows assigned reviews, NTE notices and actionable PIP tasks; user preference controls review notifications locally.

### 13.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group    | Type / format                                       | Required     | Validation / behavior                                                                   |
| ---------------- | --------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| Dashboard filter | Review period, cycle, department, custom date range | Optional     | Role and company scope remain enforced; From Date must not exceed To Date.              |
| Report row       | Released result and allowed dimensions              | As visible   | Only permitted data and fields are shown; empty dataset yields explicit empty state.    |
| Notification     | Assignment/NTE/PIP action, state, read state        | As generated | Browser-local current state; production delivery requires reliable, auditable delivery. |

### 13.6 Business Rules, Preconditions and Data Effects

- Dashboard metrics are role scoped; Department is available for broad HR views.
- Reports and exports use the same user scope and confidentiality/anonymity protections as on-screen data.
- External email, SMS and push are not implemented in current prototype.

### 13.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event                             | Data that shall be recorded                                                                              | Example history entry                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Dashboard, Reports and Notifications created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception                      | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action                   | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 13.8 Permissions and Security

Employee, Manager and HR Administrator within role/company scope. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 13.9 Outputs and Reports

Role dashboard, cycle/period/department/review-type report, permitted export and notification list.

### 13.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Ui-001

| Current | Dashboard metrics are role scoped. Filters include review period and cycle; Department is available for broad HR views. Custom ranges validate date order. | Filter by period/cycle/department and invalid custom dates; only scoped records/metrics appear. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |

### Ui-002

| Current | Dashboard distinguishes available, locked, completed, overdue, draft, submitted, returned and verified work as applicable. Links open the related record when supported. | Exercise role dashboard filters and action links with no-data, overdue, locked and completed records. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |

### Rep-001

| Current | Manager/HR reports use eligible released results and allow cycle, period, department and review type filters. Empty data produces an empty state. | Exercise cycle/period/department/type filters and exports using restricted and anonymous result sets. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |

### Rep-002

| Current | Exports respect the user's visible scope and available fields; anonymous and confidential data protections apply. | Compare screen and CSV under employee, manager, HR and anonymous-threshold cases; exported rows/fields match authorized view. |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |

### Ntf-001

| Current | In-app notifications expose assigned reviews, NTE notices and actionable PIP tasks. User may enable/disable review notifications in local settings. | Enable/disable local review notification; verify current review menu follows preference and PIP/NTE actions remain correctly linked. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |

### Ntf-002

| Production gate | External email, SMS, push and escalation are not implemented; delivery must be reliable and auditable before production deadlines depend on notification. | Exercise in-app action creation, opening, local preference and role scope. |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |

### 13.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

## 14. Employee Directory and My Team Workspace

| Specification Area | Definition                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose            | Provide scoped employee lookup, team visibility, profile context, and HR control of effective-dated performance-manager assignments. |
| Primary actors     | HR Administrator for organization/company records; Manager for current team; Employee has no directory browsing.                     |
| Dependencies       | HRDotNet sample employee records, company context, current reporting graph, scheduler and evaluator assignments.                     |

### 14.1 Scope and Functional Summary

Provide scoped employee lookup, team visibility, profile context, and HR control of effective-dated performance-manager assignments.

### 14.2 Listing and Navigation

Listing / entry point: HR Employees page and Manager My Team page, with search, department/position/goal status filters, row counts and pagination.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 14.3 Status Workflow

| Status    | Visibility / ownership                       | Editability                           | Permitted next action / effect          |
| --------- | -------------------------------------------- | ------------------------------------- | --------------------------------------- |
| Pending   | HR / current manager scope remains unchanged | Editable/cancellable by HR as allowed | Revalidate and apply on effective date  |
| Applied   | New manager and scope are current            | Read-only assignment history          | Create a later effective change         |
| Blocked   | Prior manager/scope remains current          | HR can inspect and cancel/resolve     | Repair eligibility/graph and reschedule |
| Cancelled | Prior manager/scope remains current          | Read-only history                     | Terminal                                |

### 14.4 User Journey / Processing Workflow

## 1. HR searches the HRDotNet employee directory or Manager opens My Team; rows remain limited to current role and company scope.

## 2. Authorized user opens an employee detail and follows only links permitted by current record-level access.

## 3. HR opens Assign Manager, selects employee(s), company, manager and effective date, then enters a reason where required.

## 4. System validates employee/manager eligibility, company match, self-assignment, date and projected reporting graph across the complete batch.

## 5. Before due date, assignment remains Pending; on/after effective date, scheduler revalidates and either applies once or marks Blocked.

## 6. Valid manager change updates team verification scope and eligible Not Started assignments; In Progress/Submitted evaluator ownership remains unchanged.

### 14.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group        | Type / format                                                      | Required         | Validation / behavior                                                                      |
| -------------------- | ------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------ |
| Employee             | ID, name, position, department, company, current manager           | Directory record | Stable HRDotNet identity; filters do not widen role/company scope.                         |
| Manager assignment   | Employee, manager, company, effective date, status                 | HR action        | Existing eligible employees; no self/cross-company assignment or projected loop.           |
| Assignment event     | Before/after manager, reason, actor, timestamp, apply/block result | Every transition | Retain pending, applied, blocked and cancelled history.                                    |
| Employee detail link | Employee ID + destination record                                   | As permitted     | Validate exact role, ownership, team, company and confidentiality at open and action time. |

### 14.6 Business Rules, Preconditions and Data Effects

- HR sees the authorized directory; Manager sees current team; Employee does not browse the directory.
- Future manager changes do not alter team scope or evaluator assignment before the effective date.
- Due actions are revalidated chronologically; failed validation blocks the new assignment without changing current scope.
- Manager transfer updates Not Started eligible Manager assignments only; started/submitted work remains with its assigned evaluator.
- The prior evaluator retains access only to the exact owned assignment/history and gains no general team, journal, NTE or verification authority.
- Current company/demo dates drive due processing; browser-local execution is not a production scheduler.

### 14.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event                                 | Data that shall be recorded                                                                              | Example history entry                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Employee Directory and My Team Workspace created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception                          | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action                       | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 14.8 Permissions and Security

HR Administrator for organization/company records; Manager for current team; Employee has no directory browsing. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 14.9 Outputs and Reports

Employee/team directory, scoped employee detail, manager-assignment list/details/history, pending and blocked status.

### 14.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Dir-001

| Current | HR opens Employees for the HRDotNet-backed sample directory and manager assignment controls. Managers open My Team for employees in their current performance-management scope. Employee directory access is not available to the Employee role. | Open Employees/My Team as HR, Manager and Employee; show HR directory, current Manager team and no Employee directory. Test cross-company and non-team identifiers. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### Dir-002

| Current | Search matches employee name, employee ID, position/role and manager where shown. HR and manager filters constrain department and position; manager views may filter team records by operational-goal status. Pagination and count labels apply to the filtered authorized set. | Search name, ID, position and manager; combine department/position/goal-status filters and pagination; count and rows reflect only the authorized filtered set. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### Dir-003

| Current | Selecting an employee opens permitted profile/detail context with the employee’s organization fields, assigned goals, review/evaluation summaries, NTE and PIP references when role scope permits. Unauthorized linked records remain unavailable. | Open permitted employee detail and linked goal/review/NTE/PIP; denied links reveal no restricted detail and stale scope blocks the open. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |

### Dir-004

| Current | HR may create an individual or batch performance-manager assignment for existing eligible employees, selecting company, manager and effective date. Future assignments remain Pending until the company date. | Schedule individual and batch manager assignment for an eligible employee; verify effective date, company, previous manager and Pending state. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |

### Dir-005

| Current | HR assignment validation rejects missing/ineligible employee or manager, self-assignment, cross-company scope, effective dates before the current company date, and projected manager-reporting cycles. A batch is validated against the projected graph in chronological order, including same-day changes. | Attempt missing/ineligible manager, self, cross-company, date before today and reporting cycle; reject batch atomically and identify reason. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |

### Dir-006

| Current | Due assignments are revalidated at application time. Valid assignments apply once; invalid assignments become Blocked without changing current team scope. HR may cancel eligible Pending/Blocked assignments, with reason and history retained. | Change eligibility/graph before effective date; due action becomes Blocked with current manager unchanged; HR cancellation retains reason/history. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |

### Dir-007

| Current | Upon manager change, the current manager gains the permitted team verification scope. Not Started future Manager assignments may be reassigned; In Progress or Submitted evaluator responses retain their original evaluator. A prior evaluator can view only the exact assignment history they own. | After manager change, verify current-manager team scope and Not Started transfer; started/submitted response stays with previous evaluator and exact-history-only access. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### Dir-008

| Current | Assignment details and history display effective date, previous/new manager, company, status, reason, actor and timestamp. Settings and employee-directory surfaces expose pending, blocked and cancelled assignment state. | Inspect Pending, Applied, Blocked and Cancelled history; verify actor, reason, date, before/after manager and outcome. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |

### Dir-009

| Production gate | Directory synchronization, employee deletion/rehire, leave/termination, acting-manager delegation and manager transfer conflict behavior require explicit integration and access policies. | For production, verify directory sync, rehire/termination and acting-manager policy at the server/service boundary before operational use. |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |

### 14.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

## 15. Personal and Assigned Operational Goals and Milestones

| Specification Area | Definition                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose            | Create and monitor operational goals owned by an employee, with manual or milestone-derived progress, separately from cycle KPI actuals and evaluation scoring. |
| Primary actors     | Employee for own goals/progress; Manager for current team goals; HR for authorized organization goals.                                                          |
| Dependencies       | Employee/company scope, category values, optional cycle association, workflow date, progress and milestone records.                                             |

### 15.1 Scope and Functional Summary

Create and monitor operational goals owned by an employee, with manual or milestone-derived progress, separately from cycle KPI actuals and evaluation scoring.

### 15.2 Listing and Navigation

Listing / entry point: Goals page. Employee switches between My Goals and Assigned Goals; Manager/HR see scoped goals. Dashboard has a separate legacy goal-creation entry point.

- Lists, detail views, search, filters, counts and exports shall be limited to the caller role, company and record ownership.
- Opening a predecessor or downstream reference shall not disclose restricted detail. The system shall preserve relevant list context when returning from a record.

### 15.3 Status Workflow

| Status           | Visibility / ownership    | Editability                                                                     | Permitted next action / effect                                |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Active           | Owner and permitted staff | Editable according to role and status                                           | Update progress or configuration                              |
| Pending Approval | Owner and permitted staff | Current legacy/dashboard route can create this state                            | Approval behavior is not consistent across goal-entry screens |
| Completed        | Owner and permitted staff | Structured self editor is locked; milestone-mode progress guard remains enabled | Read-only or permitted milestone progress action              |

### 15.4 User Journey / Processing Workflow

## 1. Employee opens Goals and selects My Goals or Assigned Goals; Manager/HR opens the scoped goal list.

## 2. Authorized creator opens Create Goal, selects a permitted owner, enters name, category, optional description/cycle, due date and optional named milestones.

## 3. System validates owner, company/team scope, category, date order, optional cycle and each milestone title/date.

## 4. Creator saves; a structured Goals-page-created goal begins at zero progress. The older Dashboard route has its own start date/progress/approval controls, documented as a current discrepancy.

## 5. Owner or permitted Manager/HR updates manual progress or completes milestones. Milestone mode calculates percent from completed named milestones and shows Pending, Overdue, Completed or Completed (Late).

## 6. Authorized user opens details, edits permitted fields, tracks changes and returns to the filtered goal list.

### 15.5 Field Data Dictionary and Validation

This table defines conceptual fields and validation requirements. It is not a database schema or API contract; production types, identifiers and length limits remain an engineering decision unless specified.

| Field / group  | Type / format                                                                                                               | Required                                          | Validation / behavior                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Goal           | ID, name, description, owner, creator, assignee, category, optional cycle, start/due dates, progress, tracking mode, status | Name/category/due required in structured form     | Owner lookup must resolve to permitted employee; category is Quality, Delivery, Growth or Collaboration; due cannot precede start. |
| Progress       | Percent and optional comment                                                                                                | On progress update                                | Finite numeric 0–100 inclusive; preserve stale record detection.                                                                   |
| Milestone      | ID, title, optional due date, done flag, completedAt                                                                        | Title required                                    | Date without title invalid; only named milestones contribute to calculated progress.                                               |
| Approval state | Pending Approval / Active / Completed                                                                                       | Only legacy create route exposes request approval | Dashboard and Goals-page forms currently differ; approval rule requires product decision.                                          |

### 15.6 Business Rules, Preconditions and Data Effects

- Operational goals are not KPI Goal Template indicators, accomplishment actuals, performance result evidence or automatic PIP source indicators.
- Employees may create their own goal; Managers/HR may create/assign within permitted scope; manager assignment requires a selected authorized owner.
- Structured form categories are Quality, Delivery, Growth and Collaboration; optional cycle association must be in the employee’s allowed cycle set.
- Manual progress stays user-entered. Milestone progress is rounded completed named milestones divided by all named milestones; completion may set goal status Completed.
- Switching progress modes with existing nonzero progress requires confirmation and displays the replacement value; removing all milestones returns to manual mode and retains current progress.
- Employee edits to completed goals are restricted; manager/HR edits and employee progress actions follow the current scope guards.
- Dashboard and Goals-page creation controls differ in approval, start-date, manual-progress and milestone input behavior; QA records this divergence until a canonical experience is approved.
- Milestone status currently uses a client date helper; confirm its timezone alignment with the Asia/Manila workflow clock before production.

### 15.7 History and Audit Requirements

The following events shall be reconstructable by an authorized user. The examples describe the event content and are not preloaded production records.

| Actual transaction / event                                               | Data that shall be recorded                                                                              | Example history entry                                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Personal and Assigned Operational Goals and Milestones created / changed | Record ID, company/subject, actor, action, timestamp and before/after state or values.                   | {timestamp} \| {recordId} created or updated by {actor}; state {oldState} to {newState}. |
| Submission / decision / exception                                        | Submitted values or evidence, decision/outcome, reason, actor and timestamp.                             | {timestamp} \| {actor} submitted/decided {action}; reason: {reason if required}.         |
| Downstream effect / scheduled action                                     | Source and target record IDs, applied/blocked status, triggering rule and idempotency key in production. | {timestamp} \| System applied or blocked {action} for {recordId}; source {sourceId}.     |

### 15.8 Permissions and Security

Employee for own goals/progress; Manager for current team goals; HR for authorized organization goals. All read and write paths must also follow the common AUTH requirements. Production authorization is enforced on the server/API and must not rely on hidden buttons or client-side role switching.

### 15.9 Outputs and Reports

My Goals, Assigned Goals, scoped employee goal listing, goal detail, progress updates and milestone status.

### 15.10 Detailed Functional Requirements and Acceptance Criteria

| Requirement ID / Status | Requirement | Acceptance Criteria |
| ----------------------- | ----------- | ------------------- |

### Goal-001

| Current | The system supports operational goals with owner, creator/assignee, category, optional description, optional review-cycle association, due date, progress and optional milestones. Goals remain distinct from a cycle KPI accomplishment record. | Create operational goal and separately submit KPI accomplishment; confirm records, score calculation and PIP eligibility do not cross over. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |

### Goal-002

| Current | Employees may create personal goals for themselves. Managers and HR may create or assign goals to an employee within their permitted company/team scope. Owner selection must resolve to an eligible employee record. | Employee can create self goal; Manager/HR can assign to a permitted lookup owner; reject unauthorized team/company owner. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |

### Goal-003

| Current | The structured editor requires a goal name, category and due date; categories are Quality, Delivery, Growth and Collaboration. Description is optional. An optional cycle must be eligible for that owner and must not be Cancelled or Completed for new goal associations. | Submit missing name/category/deadline and disallowed cycle; valid categories and eligible optional cycle are accepted. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |

### Goal-004

| Current | When editing a goal with a start date, due date must be on or after start date. Progress is numeric from 0 through 100 inclusive. Names, descriptions, milestone titles, and progress comments are constrained by the current UI limits; production APIs must enforce documented limits independently. | Test due-before-start and progress -1, 0, 100, 101, blank and nonnumeric; invalid values preserve saved goal. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |

### Goal-005

| Current | A goal may use manual progress or milestone-derived progress. When milestones are used, progress is rounded from completed named milestones divided by all named milestones. Completing all milestones sets status Completed; lower progress sets Active unless the record is Pending Approval. | With 3/4 milestones complete verify rounded 75%; complete all and verify Completed; manual progress remains user-entered. |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |

### Goal-006

| Current | Milestones have a required title and optional due date. A due date without a title is rejected. Completion records the completion date; an incomplete past-due milestone is Overdue and a completed after-due milestone is Completed (Late). | Test missing milestone title, title with no date, named optional-date milestone, overdue and completed-late status. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |

### Goal-007

| Current | Switching from manual to milestone tracking can replace the saved percentage with the calculated value and requires explicit confirmation when existing progress is nonzero. Removing all milestones switches to manual tracking and retains the last progress value after confirmation. | With nonzero manual progress add first milestone; cancel/confirm; remove all milestones and verify retained percent on return to manual. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |

### Goal-008

| Current | Employees may update their own eligible goal progress and complete configured milestones. Managers/HR may update permitted team/organization goals and manage goal configuration. Completed personal goals are read-only in the structured editor; milestone-mode progress access follows the current guard implementation. | As Employee, Manager and HR try configure/progress on own, team, assigned and completed goals; allow only documented scope/status actions. |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |

### Goal-009

| Current | Goal detail and list views expose owner, category, deadline, progress, status, creator and milestone state. Search, category, owner, assignee, status and due-date filters, pagination and empty states are provided as applicable to role. | Combine name/category/owner/assignee/status/due filters with pagination and empty state; verify counts and milestone expansion remain aligned. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |

### Goal-010

| Current implementation discrepancy | The dashboard goal-creation form supports start date, manual progress, free-text milestone entry and a “Request manager approval” option. The structured Goals-page form supports an owner lookup, optional cycle and discrete milestone rows, but initializes new goals at zero progress and does not expose the same approval control. Both routes write operational goal records. Product/Engineering shall choose and document one canonical create/edit flow and approval policy before production release. | Open create form from Dashboard and Goals; compare start/progress/approval/milestone/cycle fields and report mismatch until canonical workflow is approved. |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |

### Goal-011

| Production gate | Goal ownership, assignment, progress, milestone and approval transitions shall be enforced server-side, versioned and auditable. Define whether progress corrections, due-date changes and completed-goal reopening are allowed. | At production boundary, verify server authorization and immutable goal/milestone/progress history; confirm completed-goal reopening policy is approved. |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |

### 15.11 User Messages, Error, Exception and Concurrency Handling

| Trigger                                           | Message type           | Required user feedback                                                                      | Required system behavior                                                                                                               |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Save, submit, issue or launch                     | Success / confirmation | Name the record and resulting state; explain irreversible effects before confirm.           | Revalidate scope, lifecycle and prerequisites; retain valid input/history.                                                             |
| Validation, access, conflict or technical failure | Actionable error       | Identify the field/action and correction; use a non-disclosing message for restricted data. | Reject without partial mutation or silent overwrite; preserve valid input; retry idempotently and provide a production correlation ID. |

## 16. Domain Model, Data Integrity and Interfaces

### 16.1 Conceptual Data Dictionary

Entity keys and invariants below are conceptual, based on current workflow state. They do not define physical tables, API payloads or persistence technology.

| Entity                    | Key fields                                                                                         | Critical invariant                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Employee                  | employeeId, companyId, department, position, current manager                                       | Source identity is stable; HR changes performance manager in a separate assignment record                 |
| ManagerAssignment         | employeeId, managerId, companyId, effectiveDate, status, history                                   | Future assignment does not change current scope; blocked assignment never partially applies               |
| OperationalGoal           | goalId, ownerId, creatorId, category, dates, cycleId, progress, trackingMode, status               | Separate from KPI accomplishment and evaluation result; owner/team scope applies                          |
| GoalMilestone             | milestoneId, goalId, title, dueDate, completedAt, status                                           | Named milestones determine milestone-mode progress; optional due date drives overdue/late state           |
| GoalProgressUpdate        | goalId, actorId, date, progress, comment, milestone snapshot                                       | Progress changes retain current implementation history where captured; production history must be durable |
| GoalTemplateVersion       | templateId, version, position, status, indicators                                                  | Published version immutable for existing cycle snapshots                                                  |
| GoalIndicator             | indicatorId, name, unit, target, direction, weight, scores, matrix/scale                           | Stable per-template indicator; score mapping is validated and frozen                                      |
| BehavioralTemplateVersion | templateId, version, sections/questions                                                            | Question type and required response are validated; cycle snapshot is immutable                            |
| Cycle                     | cycleId, companyId, state, evaluationPeriod, deadlines, components, stageOrder, template snapshots | Finalized cycle is immutable; generation is idempotent                                                    |
| Participant               | cycleId, employeeId, frozen position/template mapping                                              | Participant belongs to current company/scope; launch uses frozen selection                                |
| Accomplishment            | cycleId, employeeId, actuals, remarks, status, verification                                        | Verification is cycle-specific; submitted values change only through correction flow                      |
| Assignment                | assignmentId, cycleId, subjectId, evaluatorId, stage, state, deadline                              | One response per assignment; sequential gate evaluated from preceding stages                              |
| ResponseVersion           | assignmentId, answers, status, reason, actor, timestamp                                            | Reopen preserves the former response and marks required downstream work for resubmission                  |
| EvaluationSnapshot        | cycleId, employeeId, score components, weights, evidence, releasedAt                               | Finalized evidence/score immutable; release is a separate transition                                      |
| JournalEntry              | employeeId, authorId, companyId, date, type, title, description, cycleId                           | Visibility follows manager/HR scope; journal does not score automatically                                 |
| NTE                       | noticeId, employeeId, category, subject, body, deadline, status, explanation, history              | HR-only issue/resolve; employee may answer once; closure/exception/cancel are distinct                    |
| PIPPlan                   | planId, employeeId, companyId, state, origin, sources, exclusions, weeks, history                  | All failed source indicator references unique by cycle + indicator                                        |
| PIPWeek                   | weekId, planId, sourceCycleId, indicatorId, dates, target, update, assessment                      | 7 inclusive dates; no overlap; final assessment only after end                                            |
| AuditEvent                | eventId, entityType/id, action, actor, timestamp, reason/details                                   | Current client history is mutable browser data and is not tamper-resistant                                |

### 16.2 State Transition Controls

| Record            | State transitions                                                                                         | Guard                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Cycle             | Draft → Scheduled → Active → Completed; Draft/Scheduled/Active → Cancelled                                | Readiness, due date and completion gates; Completed is terminal                           |
| Accomplishment    | Draft → Submitted → Verified; Submitted → Returned → Submitted                                            | Complete actuals; eligible manager; current deadline window; return reason                |
| Assignment        | Locked → Not Started → In Progress → Submitted → Completed                                                | Previous stages submitted; assigned evaluator; required answers; cycle state              |
| NTE               | Draft → Issued → Responded/Closed; Draft/Issued → Cancelled                                               | HR permission; employee response window; reasoned exception/cancellation                  |
| PIP               | Awaiting Planning/Draft → Active → Completed/Completed with Exclusions/Not Met; open → Cancelled          | Coverage, date gates, assessed weeks, referral review and reasons                         |
| ManagerAssignment | Pending → Applied, Blocked or Cancelled                                                                   | Due date and revalidated employee, manager, company and graph                             |
| OperationalGoal   | Active ↔ Active; Active → Completed; Pending Approval → Active/Completed according to current editor path | Progress 0–100; goal owner/scope; due/start order; current editor routes differ           |
| GoalMilestone     | Pending → Completed; Pending → Overdue by date; completed-after-due → Completed (Late)                    | Milestone title required; completion state contributes to goal progress in milestone mode |

### 16.3 Persistence and Integration Boundary

| Area                      | Current behavior                                                 | Production requirement                                                                                 |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Runtime                   | Static HTML/CSS and ordered JavaScript modules.                  | Maintained build, deployment pipeline and server application selected by Engineering.                  |
| Persistence               | Browser storage scoped to one browser profile and origin.        | Durable shared database, migrations, backup/restore, retention, concurrency and integrity controls.    |
| Identity / authorization  | Fictional preview users and client-side role/company scope.      | Identity provider, authenticated sessions, server-side authorization and tenant isolation.             |
| Scheduling                | Browser-local checks while a session is open.                    | Independent server worker/queue, retry, idempotency, monitoring and alerting.                          |
| HRDotNet integration      | Sample employee data and simulated manager mapping; no live API. | Approved source-of-truth fields, mapping, sync/write-back contract, authorization and conflict policy. |
| Notifications / documents | Browser-local notifications and NTE/PIP content.                 | Reliable notification delivery, durable document data, privacy/retention rules and delivery audit.     |

### 16.4 Validation Rules, Error Handling and Idempotency

- VAL-001: Validate date strings as real calendar dates, not just `YYYY-MM-DD` shaped text; validate ordering before save and again at activation.
- VAL-002: Reject non-finite, negative or missing required KPI actual/target values. Preserve zero as a valid number.
- VAL-003: Validate matrix/scale values, unique options, indicator weights, score boundaries, date ranges, component percentages and evaluator references before publication/launch.
- VAL-004: Validate every mutation against role, subject, company, lifecycle and current scope at action time; do not trust stale selections or hidden form values.
- VAL-005: On mutation failure, preserve prior valid state and user input; show actionable field-level or record-level feedback. Do not present success if persistence failed.
- VAL-006: Record a reason for returns, schedule extensions, early NTE closure, cancellations, PIP exclusions, missed-update assessments, referral review and PIP closure where specified.
- VAL-007: Due processing and user retries must be idempotent; re-running must not duplicate assignments, referrals, notifications, history entries or manager transfers.
- VAL-008: Scheduler must defer writes during a dirty form or open modal. Returning focus must process missed actions without discarding draft form data.
- VAL-009: Scheduled cycle generation must rollback partial assignment data on failure and surface HR recovery information.
- VAL-010: Employee-visible errors must not disclose restricted records; technical logs must avoid unnecessary employee response content.
- VAL-011: Validate goal owner through the authorized employee lookup; reject free-text identity, disallowed company/team owner, invalid category, malformed due date, due date before start date, and progress outside 0–100.
- VAL-012: Validate milestone titles and dates; preserve existing goal state if any row is invalid. Do not calculate progress from unnamed milestones.
- VAL-013: Before applying goal edits or progress, compare the current record with the version/snapshot opened by the user; reject stale changes with a refresh/reopen message rather than silently overwrite.
- VAL-014: Validate manager assignment eligibility both when scheduled and on the effective date; never apply a blocked transfer or partially apply its batch.
- VAL-015: NTE issue, early close, cancellation, PIP exclusion, missed-update assessment, referral review and plan closure validate required reason and confirmation before any state write.
- VAL-016: Re-run finalization, result release, PIP referral synchronization and due workflow processing idempotently; retain one source-linked result/notification per eligible event.

### 16.5 Exception and Rejection Catalog

| Workflow / trigger                                                                                 | Expected user-visible result                                                                    | State and evidence effect                                                          |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Template: empty/invalid position or indicator                                                      | Identify the exact missing/invalid template or indicator field.                                 | Do not publish or overwrite existing published version.                            |
| KPI scale: overlapping, unordered, incomplete, wrong-direction boundary                            | Name the threshold row and required correction; preview the affected actual values.             | Do not publish or mutate an already selected cycle snapshot.                       |
| Behavior question: unsupported type, no choices, duplicate choices, missing required prompt        | Show question-level validation in the builder/preview.                                          | Draft remains editable; no invalid response schema is frozen.                      |
| Cycle: no/duplicate participants, missing component/template, invalid weights/stage/evaluator/date | Show step-linked readiness errors naming participant, field, stage or schedule.                 | Launch/schedule creates no partial participant/assignment set.                     |
| Cycle activation: missing original snapshot/evaluator or expired dates                             | Keep cycle Scheduled and show HR repair/cancel attention.                                       | Do not use a live substitute template or partially generate assignments.           |
| Accomplishment: nonnumeric, negative, blank required actual, early submission                      | Show indicator-level correction; preserve other valid draft values.                             | No Submitted state or scoring evidence until valid submission.                     |
| Accomplishment verification: wrong role/team/cycle, returned without reason, outside window        | Show non-disclosing access or reason/date validation.                                           | Do not verify/return; HR extension required after correction deadline.             |
| Assessment: wrong evaluator, required answer missing, locked prior stage                           | Show assignment-specific guidance without exposing another evaluator response.                  | No submission marker; later stages stay locked.                                    |
| Finalization: missing response or unverified accomplishment                                        | List the blocking participant/stage/record.                                                     | No partial final snapshot; cycle remains Active.                                   |
| Result: release before finalization or unauthorized reader                                         | Show unavailable/forbidden result state without score leakage.                                  | No release mutation or unauthorized snapshot read.                                 |
| Recovery: shortening, no reason, invalid date order, completed/released cycle                      | Explain the failed recovery constraint.                                                         | Entire operation is rejected; prior deadlines/answers/results remain unchanged.    |
| Manager assignment: self/cross-company/cycle/ineligible manager/future graph conflict              | Identify the employee and why proposed transfer is blocked.                                     | Batch remains unapplied; current manager/team access remains intact.               |
| Scheduler: dirty form/modal, invalid/expired due record, generation error                          | Defer mutation or show HR recovery attention.                                                   | Retain form values; catch up on next safe tick; retry is idempotent.               |
| Journal/NTE: employee opens journal or draft/other employee NTE                                    | Show no record or permission error without disclosure.                                          | No read receipt or mutation for unauthorized target.                               |
| NTE: issue missing required field, early close, duplicate response, cancellation without reason    | Show field/window/state-specific error; early-close path requires separate confirmation/reason. | Notice/response remains in prior state; closure and cancellation remain separate.  |
| PIP: unsupported source, duplicate referral, unresolved coverage, overlap or invalid week          | Show source indicator and planning/date defect.                                                 | Keep plan Awaiting Planning/Draft; do not discard prior weeks or duplicate source. |
| PIP: future-week progress, early final submit/assessment, missing missed-update evidence           | Explain available date/action; require actual and reason for missed week.                       | No submission/assessment/outcome mutation.                                         |
| PIP: unresolved referral, unassessed week, week not ended, no closure note                         | Show each closure gate.                                                                         | Keep Active; history/result unchanged.                                             |
| Operational goal: invalid owner/category/date/progress/milestone                                   | Show field-specific error; do not accept free-text employee identity.                           | Preserve previous goal/progress; no phantom milestone contribution.                |
| Operational goal: stale concurrent edit or mode switch without confirmation                        | Request reopen or confirmation and show changed/calculated progress.                            | Reject stale write; cancel leaves original progress/milestones unchanged.          |
| Search/filter/export: unauthorized company/role data or anonymous sub-threshold group              | Return only scoped rows; show empty/insufficient-data state when appropriate.                   | Counts, pagination, detail and export do not reveal excluded rows/identities.      |
| Browser storage/API/runtime failure                                                                | Show save failure and avoid success notification; production message uses a correlation ID.     | Rollback partial writes where possible; do not create duplicates on retry.         |

## 17. Nonfunctional Requirements and Production Gates

| Category       | Current status                                      | Production acceptance requirement                                                                                       |
| -------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Security       | Client-side simulation only.                        | Authenticated service, server authorization, company/tenant isolation, secure sessions, threat model and security test. |
| Privacy        | Sample data; UI-level confidentiality rules.        | Approved purpose, data minimization, retention/deletion, access log and privacy review.                                 |
| Availability   | Static browser preview; no service-level objective. | Define availability target, backup/restore objectives, incident response and dependency monitoring.                     |
| Data integrity | Browser persistence.                                | Transactional writes, concurrent update handling, migrations/rollback and integrity checks.                             |
| Scheduling     | Runs only while browser sessions are active.        | Independent worker, retry/idempotency, clock source, dead-letter queue and operational alerts.                          |
| Auditability   | Browser-local event lists.                          | Server-side append-only audit with actor/time/reason and retention controls.                                            |
| Accessibility  | Partial interface patterns.                         | Verify keyboard-only use, labels, focus, contrast and assistive technology across workflows.                            |
| Compatibility  | Modern browser prototype.                           | Define supported browsers/resolutions; test responsive layouts and exported documents.                                  |
| Performance    | No service-level measurements.                      | Define user/record volume and verify load, query and export behavior.                                                   |
| Integration    | No connected HRDotNet API.                          | Confirm source-of-truth ownership, mapping, sync frequency, conflict rules and write-back permission.                   |
| Localization   | Company date currently uses Asia/Manila.            | Define language, numeric/date formats and timezone policy for each supported company.                                   |

### 17.1 Production Decisions Requiring Approval

- Approve KPI and behavioral weights, score-to-rating meaning, target-scoring meaning and anonymous response threshold.
- Approve NTE response/closure/retention policy and access logging.
- Approve PIP inclusion/exclusion authority, weekly assessment rubric, reminder/escalation path, extension limits, appeals and records retention.
- Select authentication/server architecture and enforce company isolation for every data operation.
- Define durable persistence, versioned migrations, audit model, backups and recovery objectives.
- Replace browser clock with server scheduler and reliable notification delivery.
- Define HRDotNet source-of-truth fields and integration/write-back permissions.
- Complete security, privacy, accessibility, responsive, performance and disaster-recovery acceptance.

## 18. End-to-End QA Acceptance Scenarios

Each scenario specifies setup/action and an observable expected result. Scenarios complement requirement-level and unit tests. Production qualification must add API authorization, concurrency, accessibility, migration, security and deployment coverage.

| ID      | Setup and action                                                                                                                    | Expected result                                                                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2E-001 | HR publishes a valid KPI template and attempts publication with weights not equal to 100%                                           | Invalid publication is blocked with actionable validation; valid version becomes selectable                                                                           |
| E2E-002 | HR sets a flexible matrix reference-only, publishes, then enables scoring and previews boundary values                              | Reference-only mode does not affect scores; scoring mode uses saved criteria at each boundary                                                                         |
| E2E-003 | HR builds a cycle with an unmapped participant position                                                                             | Evaluation Setup/readiness identifies participant and blocks launch                                                                                                   |
| E2E-004 | HR schedules cycle with valid frozen templates; change current template/employee position before due date                           | At activation, cycle uses original frozen snapshots and does not substitute current template                                                                          |
| E2E-005 | A scheduled cycle has malformed deadline or missing original template                                                               | It remains Scheduled, no partial assignments are created, and HR sees repair/cancel path                                                                              |
| E2E-006 | Employee submits incomplete accomplishments, then complete data before/after evaluation period end                                  | Incomplete submit is rejected with draft retained; final submit opens only after period end                                                                           |
| E2E-007 | Manager returns an accomplishment with reason after original submission deadline                                                    | Reason is preserved; employee can correct through verification deadline; prior submission remains available                                                           |
| E2E-008 | Manager starts assessment before KPI accomplishment is verified                                                                     | Assessment submission is blocked; verify path is available to eligible current manager                                                                                |
| E2E-009 | Evaluator opens a later stage before all earlier assigned responses are submitted                                                   | Assignment remains locked even if its due date passed                                                                                                                 |
| E2E-010 | HR reopens a submitted stage response after later-stage submissions                                                                 | Selected and affected downstream responses return to In Progress, earlier unaffected response remains complete, evidence versions remain readable                     |
| E2E-011 | HR finalizes and then separately releases a cycle                                                                                   | Finalized results remain hidden until release; after release only permitted roles can view them                                                                       |
| E2E-012 | Anonymous group is below and then at its threshold                                                                                  | Below-threshold score/narrative withheld; threshold-satisfying aggregate included without reviewer identities                                                         |
| E2E-013 | HR schedules manager change for a future date                                                                                       | Current manager/team/review access remain unchanged before date; valid change applies once on date                                                                    |
| E2E-014 | Manager eligibility, company or projected graph changes before assignment effective date                                            | Assignment becomes Blocked; current manager and access remain; HR sees why and can cancel                                                                             |
| E2E-015 | Advance HR demo clock past a scheduled cycle window and then open Settings                                                          | Cycle does not silently activate; attention identifies expired window and recovery/cancel route                                                                       |
| E2E-016 | Keep a form dirty while a due action occurs                                                                                         | User content remains; due write waits until safe and then runs on return/focus or manual action                                                                       |
| E2E-017 | Released KPI evaluation contains one verified failed indicator and a Pending sibling                                                | Automatic PIP referral includes the verified failure and excludes the unverified sibling from the measurable focus set                                                |
| E2E-018 | PIP has two failed indicators; manager plans one and tries activation                                                               | Activation is blocked listing uncovered indicator; HR/Manager can add a week or record reasoned exclusion                                                             |
| E2E-019 | Employee opens PIP with exclusion and tries to alter it                                                                             | Employee can see source, exclusion and reason but cannot change coverage decision                                                                                     |
| E2E-020 | PIP week starts today and employee attempts draft then final submit                                                                 | Draft saves; final submit remains unavailable until inclusive end date; opens on end date                                                                             |
| E2E-021 | Manager attempts PIP assessment before week end or assesses a missed submission without reason                                      | Early assessment blocked; missed case requires explicit reason, verified actual and remarks                                                                           |
| E2E-022 | Failed KPI referral is added after PIP planning                                                                                     | Existing plan criteria remain unchanged; coverage/review reopens; closing is blocked until reviewed                                                                   |
| E2E-023 | Staff closes successful PIP with exclusions and then attempts to edit                                                               | State is Completed with Exclusions; record becomes read-only                                                                                                          |
| E2E-024 | HR drafts, issues NTE, employee reads/responds, HR closes after response deadline                                                   | Draft stays hidden; issued employee receives notice; read receipt/explanation recorded; premature close guarded                                                       |
| E2E-025 | HR attempts early NTE closure and NTE cancellation                                                                                  | Early closure requires explicit reason/confirmation; cancellation uses separate reason/status/history                                                                 |
| E2E-026 | Manager attempts to issue or resolve NTE for team member                                                                            | Action denied; manager can only view issued records within current team scope                                                                                         |
| E2E-027 | Employee/Manager/HR searches or filters cross-company data                                                                          | Result set, counts, exports and detail route remain within role/company scope                                                                                         |
| E2E-028 | Re-run scheduler and PIP synchronization after success                                                                              | No duplicate manager application, cycle assignments, source referrals or employee notification                                                                        |
| E2E-029 | HR creates a Behavioral Assessment Template with each supported question type and duplicate choice values                           | Duplicate choices or missing required prompt are blocked; valid Rating, Short Answer, Paragraph and Multiple Choice items preview and publish correctly               |
| E2E-030 | Evaluator leaves a required rating/text/choice blank or submits a value of the wrong type                                           | Submission is blocked, answer draft remains, and field-specific guidance is displayed                                                                                 |
| E2E-031 | Evaluator selects Not Observed for an enabled rating question                                                                       | Response is valid and the item is excluded from the numeric mean                                                                                                      |
| E2E-032 | HR creates a cycle with no participants, duplicate participants, no stages, invalid component weights or a missing Manager verifier | Readiness names each failing step and blocks launch without creating assignments                                                                                      |
| E2E-033 | HR adds optional Peer/Upward stages and changes order or removes them                                                               | Stage identifiers remain unique, deadlines remain valid, and required Self/Manager/HR controls are preserved according to supported rules                             |
| E2E-034 | A cycle has several evaluators in one stage and only one prior response remains incomplete                                          | The next stage remains locked until every predecessor assignment is Submitted or Completed                                                                            |
| E2E-035 | An available assessment is past due but its cycle is still Active and prior stages are complete                                     | Evaluator can submit; the UI identifies Overdue without treating it as a separate lock                                                                                |
| E2E-036 | Employee reports a lower-is-better measure at zero, at the inclusive maximum, and one unit beyond it                                | Scores follow the saved inclusive scale boundaries and never invert because of generated defaults                                                                     |
| E2E-037 | Goal actual is zero, negative, blank, text, NaN or infinite                                                                         | Zero is accepted when required; invalid, negative, missing or non-finite values are rejected without losing other draft fields                                        |
| E2E-038 | HR configures scores/weights that are out of range, nonpositive or not totaling 100 percent                                         | Template publication is blocked and identifies indicator/weight/score errors; existing published version remains intact                                               |
| E2E-039 | Manager A is replaced while a Manager response is Not Started, In Progress or Submitted                                             | Not Started future work updates to the eligible current manager; started/submitted work remains with original evaluator, who has only exact-assignment history access |
| E2E-040 | HR reopens the earliest submitted response in a multi-stage sequence                                                                | Prior response and later started/submitted responses are versioned; later stages are locked until resubmission; unstarted work remains Not Started                    |
| E2E-041 | HR extends one deadline while trying to shorten another or place verification after the Manager deadline                            | Entire save is rejected, reason is retained in the form, and cycle/assignment deadlines remain unchanged                                                              |
| E2E-042 | HR attempts to reopen, extend, or mutate a finalized/released evaluation                                                            | Action is unavailable or rejected; frozen score and result snapshots remain unchanged                                                                                 |
| E2E-043 | HR finalizes with one required assignment missing or an accomplishment unverified                                                   | Finalization is blocked with the exact participant/stage/verification gate; no partial result snapshot is created                                                     |
| E2E-044 | HR releases before finalization or employee/manager opens a result before release                                                   | Release is blocked until finalization; unreleased result detail remains hidden outside authorized HR workflow                                                         |
| E2E-045 | Behavioral result contains only Not Observed, optional unanswered, text or Multiple Choice items                                    | Non-numeric responses do not become zero ratings; applicable-component and missing-score policy is shown explicitly                                                   |
| E2E-046 | A configured component is disabled or not applicable                                                                                | Overall score uses the saved cycle policy and never silently treats the absent component as zero                                                                      |
| E2E-047 | Peer or Upward anonymous counts are one below, at, and above threshold                                                              | Below-threshold scores and comments remain withheld; at/above threshold aggregates pool eligible submitted responses without exposing identities                      |
| E2E-048 | Employee opens Reviews with an assignment for another subject or tries a stale record URL                                           | Detail read/edit is denied without exposing response answers or changing the prior form state                                                                         |
| E2E-049 | HR opens Journal Entries and records date, type, title, description and optional cycle                                              | Entry appears only to authorized scope, retains its author/history and has no automatic effect on KPI/behavior score                                                  |
| E2E-050 | Employee opens 202 Files and attempts the Journal Entries tab or another employee’s NTE                                             | Employee sees only own issued NTEs; journal/team records and cross-employee notices remain inaccessible                                                               |
| E2E-051 | HR saves an NTE draft, edits it, then issues it                                                                                     | Draft is hidden from employee/manager; issue locks category/subject/body/deadline and creates the employee in-app notification                                        |
| E2E-052 | Employee opens an issued NTE before/after the deadline day and submits one explanation while open                                   | Read receipt is recorded; response remains available through deadline day and, if still open, after it; response then locks                                           |
| E2E-053 | HR closes an NTE before the employee response deadline with no response                                                             | Ordinary close is blocked; exceptional early close requires separate reason and confirmation; employee cannot respond after a valid early close                       |
| E2E-054 | HR cancels a draft or issued NTE                                                                                                    | Cancellation is distinct from closure, requires reason, preserves history, and cancelled draft remains hidden from employee/manager listings                          |
| E2E-055 | Manager reads a teammate NTE then attempts to edit, issue, close or cancel it                                                       | Team read is permitted only in current company/team scope; all HR-only mutations are denied                                                                           |
| E2E-056 | A released KPI result contains no verified below-target indicator, only behavioral failure, or an unverified/blank indicator        | No automatic PIP referral is created                                                                                                                                  |
| E2E-057 | Two source evaluations reuse the same indicator ID with different names/targets                                                     | PIP source list and focus selector preserve both cycle-qualified identities and their distinct frozen criteria                                                        |
| E2E-058 | HR/Manager attempts manual PIP enrollment for an out-of-scope employee or omits required title/reason                               | Enrollment is rejected with no plan created; permitted enrollment creates Awaiting Planning and records source/reason                                                 |
| E2E-059 | An active PIP receives a later failed source evaluation with a new indicator                                                        | Existing weekly criteria remain unchanged; new source appears as an open referral requiring a new week or reasoned exclusion before review/closure                    |
| E2E-060 | HR/Manager excludes a failed indicator, then restores it and tries to plan it without removing the exclusion                        | Coverage validator blocks activation until exclusion is restored, reason history remains, and the weekly focus is cycle-qualified                                     |
| E2E-061 | A PIP includes multiple seven-day weeks with overlapping dates or a start date before the company workflow date                     | Draft can be saved only where supported; activation rejects invalid length, overlap or past start and preserves the draft for correction                              |
| E2E-062 | Employee tries to submit progress in a future PIP week or submit a final update before inclusive week end                           | Future progress is unavailable; draft progress may save during the week, final submission becomes available only on/after week end                                    |
| E2E-063 | Employee submits late progress for an open past week or manager assesses a missed update                                            | Late employee submission remains available while plan active; missed assessment requires explicit reason, actual and remarks and never infers zero                    |
| E2E-064 | Manager returns a submitted PIP update, then employee corrects and resubmits                                                        | Return reason is visible, old submission remains in history, employee can edit only returned update and staff reassess after permitted date                           |
| E2E-065 | Manager/HR adds follow-up after a failed week with an incorrect source, overlapping dates or no reason                              | Follow-up is rejected; valid follow-up uses same source indicator, later start, and required extension reason without replacing old assessment                        |
| E2E-066 | Staff tries to close a PIP before week-end, with pending assessment, unresolved source coverage or unreviewed referral              | Closure is blocked with each outstanding gate; valid closure records note and derives outcome from latest linked follow-up leaves                                     |
| E2E-067 | Employee attempts to configure, exclude, assess, close or cancel a PIP                                                              | Employee can view their plan, acknowledge and submit permitted progress only; staff-only controls and mutations are denied                                            |
| E2E-068 | Manager attempts to configure/assess a PIP for a non-team or cross-company employee                                                 | Plan remains undisclosed and unchanged; HR and only permitted Manager can perform staff actions                                                                       |
| E2E-069 | Employee creates a personal operational goal with valid name/category/due date and no cycle                                         | Goal appears under My Goals, not KPI accomplishments, and does not create an evaluation score or PIP referral                                                         |
| E2E-070 | Manager/HR assigns an operational goal to an employee, then attempts an out-of-scope or unresolved owner                            | Only a permitted selected employee is accepted; out-of-scope or free-text owner is rejected                                                                           |
| E2E-071 | Goal progress is manually changed to -1, 101, blank or nonnumeric                                                                   | Invalid progress is rejected; valid progress at 0 or 100 is accepted and status reflects applicable completion rules                                                  |
| E2E-072 | User enters a milestone due date without title, duplicates/removes a milestone, or expands a goal with no milestones                | Invalid nameless-dated row is rejected; milestone list updates without phantom progress and empty state is explicit                                                   |
| E2E-073 | User adds first milestone to a goal with nonzero manual progress, then switches back to manual tracking                             | Confirmation previews the calculated replacement; cancel leaves goal unchanged; confirmed change records the transition; removing all milestones retains progress     |
| E2E-074 | Employee tries to edit a completed personal goal or change a manager-assigned goal’s configuration                                  | Completed/self and non-owner scope guards apply; employee progress actions are restricted to permitted fields and current status                                      |
| E2E-075 | Dashboard Create Goal and Goals-page Create Goal are both opened                                                                    | Both paths are documented; QA records the current field/approval differences and no requirement assumes that they are equivalent until the canonical flow is selected |
| E2E-076 | A user applies search/filter, opens a row and returns, changes filter, paginates, then exports                                      | Search, counts, pagination and export use the same authorized set; relevant filter/page context is restored or clearly reset                                          |
| E2E-077 | User switches company/role preview, navigates to a stale selected detail, or changes scope mid-form                                 | Scope is revalidated at action time; stale/out-of-scope detail is denied and no data is written                                                                       |
| E2E-078 | User saves Settings review-notification preference, then opens the profile and ends role preview                                    | Preference follows current local behavior; ending preview returns to Employee preview and is not represented as sign-out                                              |
| E2E-079 | User selects invalid custom dashboard date range, cycle filter, or a date outside the selected reporting interval                   | Invalid range is rejected; metrics and charts remain within role/company/cycle scope and empty-state text appears when no rows match                                  |
| E2E-080 | HR downloads available report/export while anonymous data is below threshold or a role lacks access                                 | Export contains only fields and records visible to that role and applies the same anonymity threshold as the screen                                                   |
| E2E-081 | User saves a goal form, assessment, NTE, PIP or manager assignment while the underlying record changed                              | Stale snapshot/version detects conflict; no silent overwrite occurs and the user is asked to reopen/review current values                                             |
| E2E-082 | Production client attempts API access without login or with forged role/company/employee identifiers                                | Server rejects unauthorized reads/writes even if the client UI is bypassed; no browser role preview substitutes for authentication                                    |
| E2E-083 | All browser sessions are closed when a deadline, manager change, or scheduled activation becomes due                                | Current prototype does not execute until a browser check runs; production acceptance requires server scheduler and notification delivery independent of open browsers |

### 18.1 Automated Checks in the Working Tree

| Check script                         | Primary coverage                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| work/check-connected-cycle.cjs       | Cycle configuration, stage response flow and result release gates                                        |
| work/check-evaluation-gap-fixes.cjs  | Reassignment, frozen templates, correction history and exact prior-evaluator access                      |
| work/check-workflow-recovery.cjs     | Deadline extension, correction, stage sequence, completion recovery                                      |
| work/check-effective-assignments.cjs | Future effective manager queue, graph/scope revalidation and cancellation                                |
| work/check-workflow-clock.cjs        | Manila/demo date, due processing, invalid/expired schedule recovery, dirty-state deferral                |
| work/check-indicator-matrix.cjs      | Flexible indicator matrices/scales and scoring toggle                                                    |
| work/check-pip-workflow.cjs          | PIP referrals, role checks, weekly workflow, outcomes and indicator-level evidence                       |
| work/check-pip-policy.cjs            | Coverage/exclusion policy and inclusive week timing                                                      |
| work/check-pip-source-focus.cjs      | Source-specific indicator identity and focus binding                                                     |
| work/check-pip-ui.cjs                | PIP screen role visibility, date gates and coverage UI                                                   |
| work/check-nte-files.cjs             | Journal/NTE permissions, issue/read/respond/close/exception lifecycle                                    |
| work/check-evaluation-package.cjs    | Entry-point compile, standalone preview and packaged module parity                                       |
| Remaining work/check-*.cjs scripts   | Dashboards, role behavior, navigation, goal permissions, templates, listing and presentation regressions |

## 19. Implementation Map and Production Handoff

### 19.1 Current Implementation Map

The static entry point is performance/dist/index.html. Ordered modules extend earlier behavior; verification must exercise the bundled entry point as well as isolated module checks.

| Module                                   | Principal responsibility                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| app.js, shell.js, views.js               | Browser state, role/company context, shared shell, navigation, common UI helpers                          |
| reviews.js, revisions.js                 | Review listings, performance-manager assignments, assessment and recovery helpers                         |
| cycle-workflow.js, evaluations.js        | Cycle configuration/lifecycle, readiness, stage assignments and assessment workflow                       |
| indicator-matrix.js, position-goals.js   | Flexible indicator matrix/score configuration, employee accomplishment reporting and verification         |
| evaluation-results.js                    | Scoring, finalized result snapshots, release and result views                                             |
| nte-files.js                             | 202 Files journal and NTE workflows                                                                       |
| pip-workflow.js, pip-ui.js               | PIP domain rules, coverage, weekly outcomes, forms and screens                                            |
| workflow-clock.js, workflow-scheduler.js | Company/demo date, settings, due processor, cycle recovery attention and catch-up                         |
| dashboard.js, tables.js                  | Dashboard, operational goal/team listings, employee search, pagination and report surfaces                |
| shell.js, views.js, revisions.js         | Profile and settings controls, dual goal-entry surfaces, employee/team pages and manager-assignment forms |

### 19.2 Production Handoff Checklist

- Approve policy decisions identified in Sections 9, 17 and module-specific requirements.
- Choose identity, authorization, tenant isolation, data ownership and server architecture.
- Implement durable persistence, transactional workflow writes, concurrency control, migrations, backup and restore.
- Replace browser-local scheduling and notifications with reliable server services.
- Define privacy, NTE/PIP retention, access logging and audit policy.
- Define HRDotNet integration source of truth and conflict/write-back rules.
- Complete technical, functional, role-scope, accessibility, security and operational QA.
- Assign acceptance owners, release criteria, support/escalation responsibilities and operational service targets.

### 19.3 Requirement Status and Interpretation

This specification describes the local working system as inspected on 26 October 2026. Current means demonstrated in the prototype and subject to verification; it does not mean production-ready or an approved corporate policy. Production gate identifies capabilities required before real employee data or deadlines can be relied upon. Policy decision identifies a rule that HR or Product must approve. Differences between this document and implementation should be recorded as requirements drift; no unstated rule should be applied to an employment decision.
