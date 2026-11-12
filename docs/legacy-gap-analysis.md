# Legacy vs pms-fe: Component Gap Analysis

Source: `pms-be-main/frontend/legacy` (vanilla JS, 21 JS files). Target: `pms-fe` (Next.js, shadcn, Atomic layout).
Method: function inventory and modal/page titles per legacy file, compared to `src/components` and `src/features`. Static review only; no legacy file was run.

## 1. What pms-fe already has

- shadcn `ui/`: accordion, alert, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, checkbox, dialog, empty, field, input, popover, progress, radio-group, select, sheet, sidebar, skeleton, spinner, switch, table, tabs, textarea, toast, toggle, tooltip.
- Shared: `StatusBadge`, `MetricCard`, `PageHeader`, `SearchField`, `FormSelect`, `ListingToolbar`, `ListingPagination`, `ConfirmationDialog`, `DataTable`, `ListingPageTemplate`, `WorkspacePlaceholderTemplate`.
- Layout: workspace layout, account menu, clock, role-based navigation (employee, manager, hr).
- Feature components built (UI only, no data): review-cycles (details form, stepper, participants, goal mapping, goal readiness, evaluation workflow, release settings, launch summary, table), review-templates (KPI and behavioral editors), position-goals (KPI reporting form, verification panel), evaluations (evaluator scoring form), auth.
- Routes that are placeholders only: dashboard, goals, my-team, employees, reviews, 202-files, pip, reports, both template pages. `review-cycles` page shows "service not connected".

## 2. Missing shared components (build once, reuse across features)

| Priority | Component                                              | Layer    | Legacy source                                                        | Used by                                     |
| -------- | ------------------------------------------------------ | -------- | -------------------------------------------------------------------- | ------------------------------------------- |
| P0       | `RowActionsMenu` (ellipsis dropdown)                   | molecule | `pmsRowActions`, `pmsOpenRowMenu` (reviews.js)                       | every table                                 |
| P0       | `ListingTabs` (tab + count)                            | molecule | `pmsListingTabs` (tables.js)                                         | goals, reviews, cycles, templates, 202, PIP |
| P0       | `DateField` / date picker field                        | molecule | cw date inputs, `cwDateValid`                                        | cycles, goals, PIP, 202                     |
| P0       | `FormSection` + inline field error + `ErrorSummary`    | molecule | `cwSection`, `cwInline`, `cwErrorSummary`                            | all forms                                   |
| P0       | `PersonCell` (avatar, name, role)                      | molecule | `person()`, `urDisplayPerson`                                        | employees, team, reviews                    |
| P0       | `EmployeeLookup` (search combobox)                     | molecule | `pmsSearchGoalOwners`, `urDrawEmployeeLookup`                        | goals, cycles, manager assignment           |
| P1       | `ScoreBar` / `RatingStars` / `AchievementBadge`        | atom     | `urScoreBar`, `urRating`, `pdAchievement`                            | results, reviews, goals                     |
| P1       | `ProgressCell` (bar + percent)                         | atom     | goal listing                                                         | goals, dashboard, reports                   |
| P1       | `Stepper` generalized (existing one is cycle-specific) | molecule | `urWizardStep`                                                       | cycle wizard, PIP, goal form                |
| P1       | `Timeline` / `StageTimeline`                           | molecule | `pdStageTimeline`, `pipUIExclusionHistory`, `pmsManagerScheduleHtml` | cycles, PIP, 202, manager assignment        |
| P1       | `FilterBar` (select filters + clear)                   | molecule | `pmsToolbarSelect`, `pmsGoalToolbar`                                 | all listings (extend `ListingToolbar`)      |
| P1       | `DetailPageTemplate` (header, back, tabs, side panel)  | template | `urReviewDetail`, `pipUIDetail`, `ntDetailPage`                      | review detail, PIP, 202, cycle detail       |
| P1       | `FormPageTemplate` (sticky save bar, unsaved guard)    | template | `urBuilder`, `ntFormPage`, `pdJournalPage`                           | templates, NTE, journal                     |
| P1       | `UnsavedChangesGuard` ("Leave without saving?")        | molecule | modal 'Leave without saving?'                                        | all forms                                   |
| P2       | `BarChart`, `DonutChart`                               | organism | `pmsDashBars`, `pmsDashDonut`                                        | dashboard, reports                          |
| P2       | `ActivityList` / `NextActionsPanel`                    | organism | `pmsDashNextActions`, `pmsDashReviewList`                            | dashboard                                   |
| P2       | `NotificationMenu`                                     | organism | `pmsNotificationRows`, `pmsRenderHeaderMenu`                         | header, PIP, 202                            |
| P2       | `ExportButton` (CSV)                                   | molecule | `exportCSV`, `urDownloadCsv`                                         | reports, results                            |
| P2       | `ReadOnlyField` / `DefinitionGrid`                     | molecule | profile modal, details                                               | profile, details                            |
| P2       | `ReasonDialog` (required reason textarea)              | molecule | `pipUIReason`, `pipUIReasonConfirm`                                  | PIP, reopen, exclusion, early closure       |
| P2       | Theme toggle, company switcher, role preview           | layout   | `theme.js`, `pmsToggleCompany`, `pmsToggleRolePreview`               | header                                      |

Decision needed: `DataTable` has no sort, selection, row click, or expandable rows. Legacy goals list uses expandable milestone rows (`pmsToggleGoalExpansion`) and bulk select (`pmsSelectVisible`). Extend `DataTable` rather than make a second table.

## 3. Missing feature components, per feature

### Dashboard (`dashboard.js`)

Role-scoped header with quarter filter, metric row, bar chart, donut, review list, goal deadlines, next-actions panel. Have: `MetricCard` only.
Need: `features/dashboard/` with `DashboardFilters`, `ReviewStatusChart`, `GoalProgressDonut`, `GoalDeadlinesList`, `NextActionsPanel`, plus P2 charts.

### Goals and milestones (`position-goals.js`, goal parts of `shell.js`, `revisions.js`)

Have: `KpiReportingForm`, `KpiVerificationPanel`.
Need: `GoalsTable` (expandable milestones, tabs: mine / assigned), `GoalFormDialog` (create, owner lookup, cycle, milestones), `MilestoneList` + `MilestoneEditor` + status badge, `GoalProgressDialog` (update + "Change Goal Progress?" confirm), `GoalDetailsSheet`, `GoalScheduleExtension` (`pgExtendSchedule`), `SubmissionHistory`, `IndicatorReference` (read-only matrix).

### Indicator matrix (`indicator-matrix.js`)

Need: `IndicatorMatrixEditor` (rows, columns, scale cells, kind, bounds), `BoundaryPreview`, `ScoringConfig`, `ScaleWarning`. Not in KPI template editor yet; verify before building.

### Review templates (`reviews.js`)

Have: KPI and behavioral editors.
Need: `TemplateListing` (tabs, duplicate, archive, view, usage lock), `QuestionBuilder` (question card, type switch, options, section add, rename, move, duplicate, delete), `TemplatePreview`, `ArchiveTemplateDialog`. Check whether the two existing editors cover question types or only KPI and behavior.

### Review cycles (`cycle-workflow.js`, `reviews.js`)

Have: setup pieces, table.
Need: `CycleDetailPage` (assignments, progress, results tabs), `CycleAssignmentsTable`, `CycleActionDialogs` (finalize, release, cancel, edit, extend deadlines, recover scheduled), `WorkflowClockDialog` + `WorkflowClockStatus` (Asia/Manila), `ScheduleRecoveryPanel`, `WorkflowGuide` (graph walkthrough, optional, low priority), `AssignmentGenerationErrors`.

### Reviews and evaluations (`reviews.js`, `evaluations.js`, `evaluation-results.js`)

Have: `EvaluatorScoringForm`.
Need: `ReviewListing` (scoped by role, tabs), `ReviewDetail`, `ReviewResponseForm` (question renderer by type, completion %, save draft), `SubmitReviewDialog`, `ReopenReviewDialog`, `EmployeeResultsPanel` (goals, behavior, assessments, written), `CompetencyBreakdown`, `FinalCommentForm`, `ResultsExport`, `AcknowledgeAction`, `EvaluationJournal` + `JournalEntryForm`, `AssessmentSequenceCorrection`.

### Employees and manager assignment (`revisions.js`)

Need: `EmployeesTable` (select, assign manager), `AssignManagerDialog` (effective date, cycle check `pmsWouldCycle`), `ManagerScheduleTimeline`, `EmployeeProfileDialog`, `MyTeamTable`.

### 202 Files / NTE (`nte-files.js`)

Need: `NteListing` (tabs, badge), `NteForm` (draft, issue), `NteDetail`, `IssueNteDialog`, `RespondNteForm` ("Submit Explanation?"), `EarlyClosureDialog` + review, `NteTimeline`.

### PIP (`pip-ui.js`, `pip-workflow.js`)

Need: `PipListing`, `PipEnrollmentForm`, `PipPlanBuilder` (weeks, focus indicators, coverage), `PipWeekForm`, `FailedIndicatorExclusion` (exclude, restore, history), `PipDetail`, `WeeklyAssessmentForm`, `PipExtensionForm`, `PipActivateDialog`, `PipOutcomeDialog`, `PipAcknowledge`, `PipNotifications`.

### Reports (`revisions.js`)

Need: `ReportsPage` filters (`pmsReportSelect`), `CompletionBars`, `ReportTable`, `ExportButton`, rating eligibility rule UI.

### Shell and settings (`shell.js`, `theme.js`)

Have: workspace layout, account menu, clock.
Need: `ProfileDialog`, `SettingsDialog`, `LogoutDialog`, `ThemeToggle`, `CompanySwitcher`, `RolePreview` (demo only), `SidebarSearch` (`pmsSidebarSearchInput`), `NotificationMenu`.

## 4. Gaps outside components

- No chart library in `package.json` (needs recharts or custom SVG).
- No Zod. CLAUDE.md requires runtime validation at boundaries. Legacy validations (`cwValidate`, `ntErrors`, `pipWeekErrors`, `urTemplateErrors`) need schemas in each feature.
- No `types/` or `services/` content. Legacy data model (employees as arrays, `data.cycles`, `data.reviews`) needs typed entities first.
- Legacy business rules to port as pure functions with tests (TDD per CLAUDE.md): `cwWeights`/`cwNormalize`, `pdAchievement`/`pdWeighted`, `pmsMilestonePercent`, `pmsWouldCycle`, `pipCoverageErrors`, `mxScaleScore`, `cwDateValid`.
- Mock data layer missing: for mockups, add `features/<name>/mocks/` fixtures so pages render without backend.

## 5. Suggested build order for mockups

1. Shared P0 molecules (row menu, tabs, date field, form section, person cell, employee lookup).
2. Extend `DataTable` (row click, expand, select, sort) and `FilterBar`.
3. `DetailPageTemplate` and `FormPageTemplate`.
4. Mock fixtures and types.
5. Pages by value: Dashboard, Goals, Reviews, Employees, Cycles (wire existing pieces), PIP, 202 Files, Reports.
6. P2 charts and notifications last.

## 6. Notes

- Legacy "role" nav differs from pms-fe: legacy Manager has Review Cycles and Reports, pms-fe Manager has neither Cycles nor Templates. Confirm intended access before building cycle pages for managers.
