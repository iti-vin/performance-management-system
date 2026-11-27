# Sample frontend against our app: tables and words

Date: 2026-11-26. Sample: `https://pms-iota-beryl.vercel.app/` (a browser prototype with a role preview), read as Manager, HR Administrator, and Employee. Our side: the code on the working tree of `main` at `9f86101`. Not read on the sample: the template builders, wizard steps 3 to 5, the cycle tabs after Overview, and every module outside Reviews and Goals.

## State

The tables below describe the code before slice 1. Slice 1 closed every row marked "Web" for words, buttons, step names, and the order and names of columns that need no new data. Still open: rows that need the API or a schema change, tabs and filters, and the layout rows (rating buttons, completion panel, goal indicator table, progress bar, the Goals list of an employee). See `docs/handoffs/2026-11-26-sample-alignment-slice-1.md`.

Slice 2 closed the rows that needed the API: position, department, "Assigned to you", page size, KPI template, question count, employee ID, and manager. Not closed from those rows: the template card of one review. See `docs/handoffs/2026-11-26-sample-alignment-slice-2.md`.

Slice 3 closed the tabs and filters of All Reviews, Review Cycles, Goals, and Behavioral Assessment Templates, and the row "Cycle name" (Cycle Details with Overview, Participants, Progress, Results, and Cancel Cycle). Not closed from those rows: the Team Reviews tab (a change of an access rule, PRD 8.3). The employee entry of Goals stays a list. The progress bar of the register is slice 4. See `docs/handoffs/2026-11-26-sample-alignment-slice-3-and-cycle-details.md`.

Slice 4 closed the layout rows: the review heading, template card, numbered sections, rating buttons, completion panel, the goal record header and indicator table, and the progress bar. Not closed: "Remarks" for each indicator and the accomplishment deadline (slice 5), and the employee entry of Goals. See `docs/handoffs/2026-11-26-sample-alignment-slice-4.md`.

Found while reading for slice 4, not built: the sample has a second review screen, "Assessment Details", for a sequential cycle with goals. It shows three stage cards (number, name, evaluator, due date, status), a "Goals Performance" card with "Open Goals", then the behavioral template, a "Written Feedback" box, and "Save Draft" and "Submit Assessment".

## Menu (HR)

| Sample                          | Ours                           |
| ------------------------------- | ------------------------------ |
| KPI Goal Templates              | KPI Goal Template              |
| Behavioral Assessment Templates | Behavioral Assessment Template |

## Dialog for unsaved changes

| Part    | Sample                                                                                                            | Ours                    |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Body    | "Your unsaved changes will be discarded." and "Save your draft before leaving if you want to keep these changes." | The first sentence only |
| Buttons | Keep editing, Discard changes                                                                                     | Cancel, Leave           |

## All Reviews

| Part              | Sample                                                                                                          | Ours                                                                 | Needs                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------- |
| Title             | Reviews                                                                                                         | All Reviews                                                          | Web                              |
| Description       | View, complete, and manage employee performance evaluations.                                                    | Review assignments, with their stage, deadline, and status.          | Web                              |
| Tabs              | All Reviews, My Reviews, Team Reviews (manager only), Completed                                                 | None                                                                 | API filter and web               |
| Columns, in order | Employee, Review Cycle, Review Type, Reviewer, Due Date, Status                                                 | Employee, Evaluator, Cycle, Stage, Deadline, Status                  | Web                              |
| Employee cell     | Initials, name, position                                                                                        | Name                                                                 | API: position of the participant |
| Reviewer cell     | Name, and "Assigned to you"                                                                                     | Name                                                                 | API: a flag for the caller       |
| Status            | "Overdue" shows as the status                                                                                   | Status, with Overdue under the deadline                              | Web                              |
| Filters           | Search ("Search employee or evaluator..."), Review Cycle, Review Type, Department, Status (with Overdue), Clear | Search, Cycle, Cycle state, Stage, Status; cycle filters for HR only | Department and Overdue: API      |
| Page sizes        | 10 first                                                                                                        | 20 first                                                             | Shared contract                  |

## One review

| Part          | Sample                                                            | Ours                                                | Needs           |
| ------------- | ----------------------------------------------------------------- | --------------------------------------------------- | --------------- |
| Heading       | Review Details, with "name · position"                            | Review                                              | API: position   |
| Way back      | Back to Reviews                                                   | Back to reviews                                     | Web             |
| Summary       | Employee, Department, Review Cycle, Review Type, Due Date, Status | Employee, Evaluator, Cycle, Stage, Deadline, Status | API: department |
| Template card | Template name, version, description                               | None                                                | API             |
| Sections      | Numbered, with the question count                                 | Title                                               | Web             |
| Rating        | Buttons 1 to 5 with words, and Not Observed                       | A list to choose from                               | Web             |
| Side panel    | Review completion: required answered, a bar, the buttons          | Buttons under the form                              | Web             |
| Buttons       | Save as Draft, Submit Review                                      | Save draft, Submit review                           | Web             |

## Goals

| Part             | Sample                                                                                                                                                       | Ours                                                     | Needs                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Description      | Manager: "View your team's performance goals and verify submitted accomplishments." Employee: "View your performance goals and update your accomplishments." | One text for all                                         | Web                                                                           |
| Employee entry   | The record of the chosen cycle, with a Review Cycle choice                                                                                                   | A list of reports                                        | Web                                                                           |
| Manager columns  | Employee (with position), Position, Review Cycle, KPI Goal Template, Accomplishment Status                                                                   | Employee, Cycle, Status, Period ends, Verify by          | API: position and template name                                               |
| Manager filters  | Review Cycle, Search employees, status                                                                                                                       | None                                                     | Web (the list is whole)                                                       |
| Record header    | Name, "position · template name · version", status                                                                                                           | Definition list                                          | API                                                                           |
| Dates            | Evaluation Period, Accomplishment Deadline, Verification Deadline                                                                                            | Evaluation period, Verify by                             | No column for the accomplishment deadline                                     |
| Indicators       | A table: Performance Indicator, Measurement Unit, Target, Actual Result, Status, Remarks                                                                     | One card for each indicator                              | Web; per-indicator remarks need a schema change (one remark per report today) |
| Indicator status | Pending verification, with "Below target" or "Target met"                                                                                                    | None                                                     | Web rule                                                                      |
| Buttons          | Save as Draft, Submit Accomplishments; Return for Correction, Verify Accomplishments                                                                         | Save draft, Submit report; Return for correction, Verify | Web                                                                           |

## Review Cycles (HR)

| Part                 | Sample                                                                                     | Ours                                                                   | Needs                          |
| -------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------ |
| Create button        | + Create Cycle                                                                             | Create cycle                                                           | Web                            |
| Tabs                 | All Cycles, Draft, Active, Completed                                                       | None                                                                   | Web                            |
| Filters              | Search cycles, Cycle status, Cycle review type, Review period                              | None                                                                   | Web (the list is whole)        |
| Columns              | Cycle Name, Review Type, Review Period, Participants, Progress, Deadline, Status           | The same, in the same order                                            | None                           |
| Progress cell        | Count, submitted, bar, percent                                                             | Count and submitted                                                    | Web                            |
| Cycle name           | Opens Cycle Details (Overview, Participants, Progress, Results, Cancel Cycle)              | Opens only a draft, in the wizard                                      | Phase 3 of the plan            |
| Wizard steps         | Cycle Details, Select Participants, Evaluation Setup, Assessment Workflow, Review & Launch | Cycle details, Select participants, Templates, Stages, Review and save | Web                            |
| Details fields       | Cycle Name, Review Type, Description                                                       | No Description                                                         | Schema change                  |
| Participants columns | Select, Employee, Employee ID, Department, Position, Manager                               | Select, Employee, Department, Position                                 | API: employee code and manager |

## KPI Goal Templates (HR)

| Part          | Sample                                                                      | Ours                                                      | Needs |
| ------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- | ----- |
| Description   | Define measurable, role-specific performance indicators.                    | Position-based KPI indicators, targets, and weights.      | Web   |
| Create button | Create KPI Goal Template                                                    | To compare                                                | Web   |
| Columns       | Template Name, Applicable Position / Role, Indicators, Status, Last Updated | Template name, Position, Status, Indicators, Last updated | Web   |

## Behavioral Assessment Templates (HR)

| Part             | Sample                                                                                               | Ours                                                               | Needs                   |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------- |
| Description      | Create and manage reusable forms for employee performance evaluations.                               | Reusable forms of sections and questions for employee evaluations. | Web                     |
| Tabs and filters | All Templates, Draft, Published; Search, Review Type, Status, Clear                                  | None                                                               | Web (the list is whole) |
| Columns          | Template Name (with version and category), Description, Review Type, Questions, Last Updated, Status | Template, Category, Review type, Status, Last updated              | Questions: API          |

## Where the sample and our data or rules differ

| Topic                                                  | Fact                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| Remarks of one indicator                               | `pms.accomplishments` holds one remark for each report       |
| Accomplishment deadline                                | `pms.cycles` has the verification deadline only              |
| Cycle description                                      | `pms.cycles` has no column                                   |
| Dashboard, My Team, PIP, Reports, 202 Files, Employees | Placeholder pages in our app; not part of the review modules |
