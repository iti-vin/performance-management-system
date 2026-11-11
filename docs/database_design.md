# Database Design

**System**: HRDotNet Performance (PMS)
**Based on**: `.docs/product-requirements-document.md` v2.0 (26 October 2026)
**Scope**: Logical data model and relational mapping for the production backend described in PRD sections 2, 4-16. Conceptual entities map to tables; validation stays in application layer, not in database constraints where noted.
**Language**: PostgreSQL dialect. Identifiers are `snake_case`. All tables use `uuid` primary keys unless stated otherwise.
**Date handling**: All workflow dates stored as `timestamp with time zone`; company date semantics use Asia/Manila per PRD Clk-001.

---

## 1. Conventions

- All tables carry `created_at`, `updated_at` as `timestamptz`.
- Immutable/frozen tables (template versions, cycle snapshots, result snapshots) carry `frozen_at` instead of `updated_at`; application layer refuses mutation after freeze.
- Audit: append-only `audit_events` table plus optional per-record history columns where the PRD requires a specific before/after retention.
- Soft delete: use `archived_at`/`cancelled_at`/state columns, never physical delete, for all business records.
- Idempotency: workflow mutations carry an `idempotency_key` column where PRD VAL-007/VAL-016 applies.

---

## 2. Identity and Directory

### 2.1 companies
| Column | Type | Notes |
|---|---|---|
| company_id | uuid PK | |
| name | text | |
| demo_mode | boolean | Clk-002 |
| demo_date | date | Validated calendar date |
| created_at, updated_at | timestamptz | |

### 2.2 employees
| Column | Type | Notes |
|---|---|---|
| employee_id | uuid PK | Stable identity |
| company_id | uuid FK companies | |
| hrdotnet_id | text | Source-of-truth reference, nullable pre-integration |
| employee_number | text | |
| first_name, last_name | text | |
| position_id | uuid FK positions | |
| department | text | |
| status | text | active/inactive (re-hire/termination per Dir-009) |
| created_at, updated_at | timestamptz | |

### 2.3 positions
| Column | Type | Notes |
|---|---|---|
| position_id | uuid PK | |
| company_id | uuid FK | |
| title | text | |
| created_at, updated_at | timestamptz | |

---

## 3. Effective-Dated Manager Assignments

### 3.1 manager_assignments
| Column | Type | Notes |
|---|---|---|
| assignment_id | uuid PK | |
| employee_id | uuid FK employees | |
| manager_id | uuid FK employees | |
| company_id | uuid FK | |
| effective_date | date | On or after current company date (Dir-004) |
| status | text | pending/applied/blocked/cancelled |
| previous_manager_id | uuid FK employees | Set on apply |
| apply_reason | text | |
| cancel_reason | text | |
| blocked_reason | text | |
| applied_at, cancelled_at, blocked_at | timestamptz | |
| idempotency_key | text | VAL-007 |
| created_at, updated_at | timestamptz | |

Invariants: no self-assignment (employee_id = manager_id), same-company match, no projected reporting loop (Mgr-002). Enforced at application time in app layer, not DB constraint, because loop depends on projected batch.

---

## 4. KPI Goal Templates

### 4.1 kpi_goal_templates
| Column | Type | Notes |
|---|---|---|
| template_id | uuid PK | |
| position_id | uuid FK positions | |
| company_id | uuid FK | |
| status | text | draft/published/archived |
| current_version | integer | |
| published_by, published_at | uuid/timestamptz | |
| archived_at | timestamptz | |
| created_at, updated_at | timestamptz | |

### 4.2 kpi_template_versions
Immutable. One row per published/draft version.
| Column | Type | Notes |
|---|---|---|
| version_id | uuid PK | |
| template_id | uuid FK | |
| version | integer | |
| frozen_at | timestamptz | NULL until published |
| created_by | uuid FK | |
| created_at | timestamptz | |

### 4.3 kpi_indicators
Belong to a template version. Stable identity per indicator row.
| Column | Type | Notes |
|---|---|---|
| indicator_id | uuid PK | |
| version_id | uuid FK kpi_template_versions | |
| name | text | |
| description | text | |
| unit | text | |
| target | numeric | Nonnegative |
| direction | text | higher_is_better / lower_is_better |
| weight | numeric(5,2) | Positive, all indicators in one version total 100% |
| score_target_met | integer 1-5 | |
| score_below_target | integer 1-5 | |
| use_for_scoring | boolean | Tpl-G-004 toggle |

### 4.4 kpi_indicator_scales
Scoring boundary mapping. One row per threshold band per indicator.
| Column | Type | Notes |
|---|---|---|
| scale_id | uuid PK | |
| indicator_id | uuid FK kpi_indicators | |
| lower_bound | numeric | Inclusive |
| upper_bound | numeric | Inclusive, NULL means unbounded final range |
| score | integer 1-5 | |

### 4.5 kpi_indicator_matrix_rows / columns
Flexible reference matrix (custom rows/columns).
| Column | Type | Notes |
|---|---|---|
| row_id / col_id | uuid PK | |
| indicator_id | uuid FK | |
| row_label, col_label | text | |
| cell_value | text | At reference cell level |

---

## 5. Behavioral Assessment Templates

### 5.1 behavioral_templates / behavioral_template_versions
Same split as KPI templates: `template_id` (draft/published/archived) and `version_id` (immutable, `frozen_at`).

### 5.2 behavioral_sections
| Column | Type | Notes |
|---|---|---|
| section_id | uuid PK | |
| version_id | uuid FK | |
| title | text | |
| sort_order | integer | |

### 5.3 behavioral_questions
| Column | Type | Notes |
|---|---|---|
| question_id | uuid PK | |
| section_id | uuid FK | |
| prompt | text | |
| question_type | text | rating_scale / short_answer / paragraph / multiple_choice |
| is_required | boolean | |
| allow_not_observed | boolean | rating_scale only |
| sort_order | integer | |

### 5.4 behavioral_choice_options
| Column | Type | Notes |
|---|---|---|
| option_id | uuid PK | |
| question_id | uuid FK | |
| label | text | Distinct within question |

---

## 6. Review Cycles

### 6.1 cycles
| Column | Type | Notes |
|---|---|---|
| cycle_id | uuid PK | |
| company_id | uuid FK | |
| name | text | |
| review_type | text | standard / 360 / probationary / project_based |
| state | text | draft / scheduled / active / completed / cancelled |
| evaluation_start, evaluation_end | date | |
| assessment_start | timestamptz | |
| verification_deadline | timestamptz | Acc-006 |
| activation_date | date | For scheduled cycles |
| goals_weight | numeric(4,2) | Default 0.50 |
| behavioral_weight | numeric(4,2) | Default 0.50 |
| anonymity_threshold | integer 2-10 | Res-008 |
| cancelled_reason | text | |
| finalized_at, released_at | timestamptz | |
| idempotency_key | text | Cyc-006/009 |
| created_at, updated_at | timestamptz | |

### 6.2 cycle_participants
| Column | Type | Notes |
|---|---|---|
| participant_id | uuid PK | |
| cycle_id | uuid FK | |
| employee_id | uuid FK | |
| frozen_position_id | uuid FK positions | Snapshot at scheduling (Cyc-004) |
| kpi_version_id | uuid FK kpi_template_versions | Frozen |
| behavioral_version_id | uuid FK behavioral_template_versions | Frozen |
| created_at | timestamptz | |

Unique: `(cycle_id, employee_id)`.

### 6.3 cycle_stages
| Column | Type | Notes |
|---|---|---|
| stage_id | uuid PK | |
| cycle_id | uuid FK | |
| perspective | text | self / manager / hr / peer / upward |
| evaluator_role | text | |
| sort_order | integer | Stage sequence, Rev-003 |
| deadline | timestamptz | |

---

## 7. KPI Accomplishments

### 7.1 accomplishments
One record per cycle participant. Corrections create new versions; record row tracks current state.
| Column | Type | Notes |
|---|---|---|
| accomplishment_id | uuid PK | |
| participant_id | uuid FK cycle_participants | |
| cycle_id | uuid FK | Denormalized for query |
| employee_id | uuid FK | |
| status | text | draft / submitted / returned / verified |
| remarks | text | |
| submitted_by, submitted_at | uuid/timestamptz | |
| verified_by, verified_at | uuid/timestamptz | |
| return_reason | text | |
| created_at, updated_at | timestamptz | |

Unique: `(participant_id)`.

### 7.2 accomplishment_actuals
One row per indicator per accomplishment.
| Column | Type | Notes |
|---|---|---|
| actual_id | uuid PK | |
| accomplishment_id | uuid FK | |
| indicator_id | uuid FK kpi_indicators | |
| actual_value | numeric | Nonnegative, nullable for draft |
| created_at, updated_at | timestamptz | |

### 7.3 accomplishment_versions
Correction history. Each resubmission after return creates a new row.
| Column | Type | Notes |
|---|---|---|
| version_id | uuid PK | |
| accomplishment_id | uuid FK | |
| version | integer | |
| actuals_json | jsonb | Snapshot of submitted actuals |
| remarks | text | |
| actor_id, acted_at | uuid/timestamptz | |
| correction_reason | text | |

---

## 8. Evaluator Assignments and Assessments

### 8.1 assignments
| Column | Type | Notes |
|---|---|---|
| assignment_id | uuid PK | |
| cycle_id | uuid FK | |
| participant_id | uuid FK | Subject |
| evaluator_id | uuid FK employees | Retains original evaluator after manager change (Rev-007, AUTH-004) |
| stage_id | uuid FK cycle_stages | |
| state | text | locked / not_started / in_progress / submitted / completed |
| deadline | timestamptz | |
| submitted_by, submitted_at | uuid/timestamptz | |
| completed_at | timestamptz | |
| created_at, updated_at | timestamptz | |

Unique: `(participant_id, evaluator_id, stage_id)`.

### 8.2 assignment_responses
One response row per assignment, immutable once submitted; corrections create a new version row.
| Column | Type | Notes |
|---|---|---|
| response_id | uuid PK | |
| assignment_id | uuid FK | |
| answers_json | jsonb | Typed answers keyed by question_id |
| version | integer | |
| status | text | draft / submitted |
| submitted_by, submitted_at | uuid/timestamptz | |
| reopen_reason | text | |
| created_at | timestamptz | |

### 8.3 evaluation_snapshots
Locks all finalized result evidence.
| Column | Type | Notes |
|---|---|---|
| snapshot_id | uuid PK | |
| cycle_id | uuid FK | |
| participant_id | uuid FK | |
| goals_component_score | numeric | |
| behavioral_component_score | numeric | |
| overall_score | numeric | |
| evidence_json | jsonb | Frozen verified actuals, ratings, weights, config |
| finalized_by, finalized_at | uuid/timestamptz | |
| released_at | timestamptz | |

Immutable after `finalized_at` (Res-002).

---

## 9. 202 Files

### 9.1 journal_entries
| Column | Type | Notes |
|---|---|---|
| entry_id | uuid PK | |
| employee_id | uuid FK | |
| author_id | uuid FK employees | |
| company_id | uuid FK | |
| entry_date | date | |
| entry_type | text | |
| title | text | |
| description | text | |
| cycle_id | uuid FK nullable | |
| created_at | timestamptz | |

### 9.2 nte_notices
| Column | Type | Notes |
|---|---|---|
| notice_id | uuid PK | |
| employee_id | uuid FK | |
| company_id | uuid FK | |
| category | text | |
| subject | text | |
| body | text | |
| explanation_deadline | date | |
| incident_date, incident_reference | date / text nullable | |
| status | text | draft / issued / responded / closed / cancelled |
| explanation_text | text | One submission only (Doc-005) |
| explanation_submitted_at | timestamptz | |
| early_close_reason | text | Doc-006 |
| cancel_reason | text | Doc-007 |
| issued_by, issued_at | uuid/timestamptz | |
| closed_by, closed_at | uuid/timestamptz | |
| created_at, updated_at | timestamptz | |

### 9.3 nte_read_receipts
| Column | Type | Notes |
|---|---|---|
| receipt_id | uuid PK | |
| notice_id | uuid FK | |
| employee_id | uuid FK | |
| opened_at | timestamptz | |

---

## 10. Performance Improvement Plan

### 10.1 pip_plans
| Column | Type | Notes |
|---|---|---|
| plan_id | uuid PK | |
| employee_id | uuid FK | |
| company_id | uuid FK | |
| origin | text | automatic / manual |
| state | text | awaiting_planning / draft / active / completed / not_met / cancelled |
| referral_review_required | boolean | Pip-004/008 |
| completion_note | text | Pip-012 |
| cancel_reason | text | |
| linked_evaluation_snapshot_id | uuid FK nullable | |
| created_by, created_at | uuid/timestamptz | |
| closed_at | timestamptz | |

### 10.2 pip_sources
One row per (cycleId + indicatorId) that triggered the plan.
| Column | Type | Notes |
|---|---|---|
| source_id | uuid PK | |
| plan_id | uuid FK | |
| cycle_id | uuid FK | |
| indicator_id | uuid FK | |
| frozen_actual, frozen_target | numeric | Immutable |
| direction, unit, score, matrix_criteria_json | text / numeric / jsonb | |
| covered_by_week_id | uuid FK nullable | |
| exclusion_reason | text nullable | Pip-007 |
| referral_reviewed | boolean | |

Unique: `(plan_id, cycle_id, indicator_id)` (Pip-005).

### 10.3 pip_weeks
| Column | Type | Notes |
|---|---|---|
| week_id | uuid PK | |
| plan_id | uuid FK | |
| source_id | uuid FK pip_sources nullable | Follow-up may share source |
| focus | text | |
| goal_description | text | |
| target_value | numeric | |
| unit | text | |
| direction | text | |
| start_date, end_date | date | Inclusive 7 days, no overlap with sibling weeks |
| status | text | pending / active / completed / not_met |
| follow_up_of_week_id | uuid FK nullable | Pip-011 |
| follow_up_reason | text | |
| assessment_reason_missed | text | Pip-010 |
| created_at, updated_at | timestamptz | |

### 10.4 pip_week_updates
| Column | Type | Notes |
|---|---|---|
| update_id | uuid PK | |
| week_id | uuid FK | |
| employee_id | uuid FK | |
| status | text | draft / submitted / returned |
| progress_actual | numeric | |
| remarks | text | |
| returned_reason | text | |
| submitted_at, updated_at | timestamptz | |

### 10.5 pip_week_assessments
| Column | Type | Notes |
|---|---|---|
| assessment_id | uuid PK | |
| week_id | uuid FK | |
| update_id | uuid FK nullable | |
| assessor_id | uuid FK | |
| outcome | text | met / not_met / missed |
| verified_actual | numeric | |
| remarks | text | |
| missed_reason | text | Required if outcome = missed |
| assessed_at | timestamptz | |

---

## 11. Operational Goals and Milestones

### 11.1 operational_goals
| Column | Type | Notes |
|---|---|---|
| goal_id | uuid PK | |
| owner_id | uuid FK employees | |
| creator_id | uuid FK employees | |
| company_id | uuid FK | |
| name | text | |
| description | text nullable | |
| category | text | quality / delivery / growth / collaboration |
| cycle_id | uuid FK nullable | Optional association |
| start_date, due_date | date | due >= start |
| progress_percent | numeric(5,2) | 0-100 |
| tracking_mode | text | manual / milestone |
| status | text | active / pending_approval / completed |
| version | integer | Stale-write detection, VAL-013 |
| created_at, updated_at | timestamptz | |

### 11.2 goal_milestones
| Column | Type | Notes |
|---|---|---|
| milestone_id | uuid PK | |
| goal_id | uuid FK | |
| title | text required | |
| due_date | date nullable | |
| done | boolean | |
| completed_at | timestamptz | |
| status | text | pending / completed / completed_late / overdue |
| created_at, updated_at | timestamptz | |

### 11.3 goal_progress_updates
| Column | Type | Notes |
|---|---|---|
| update_id | uuid PK | |
| goal_id | uuid FK | |
| actor_id | uuid FK | |
| progress_percent | numeric(5,2) | |
| comment | text nullable | |
| milestone_snapshot_json | jsonb | |
| updated_at | timestamptz | |

---

## 12. Notifications

### 12.1 notifications
| Column | Type | Notes |
|---|---|---|
| notification_id | uuid PK | |
| recipient_id | uuid FK employees | |
| source_type | text | assignment / nte / pip | |
| source_id | uuid | Polymorphic |
| message | text | |
| read_at | timestamptz nullable | |
| created_at | timestamptz | |

### 12.2 notification_preferences
| Column | Type | Notes |
|---|---|---|
| employee_id | uuid PK | |
| review_notifications_enabled | boolean | |

---

## 13. Audit

### 13.1 audit_events
Append-only. Covers every PRD history event in section 2.7.
| Column | Type | Notes |
|---|---|---|
| event_id | uuid PK | |
| entity_type | text | |
| entity_id | uuid | |
| action | text | create / update / submit / verify / return / finalize / release / cancel / issue / close / etc. |
| actor_id | uuid | |
| reason | text nullable | |
| before_json, after_json | jsonb nullable | |
| idempotency_key | text nullable | |
| occurred_at | timestamptz | |

No UPDATE or DELETE permitted on this table. Access-controlled views per role scope.

---

## 14. Entity Relationship Overview

```
companies
  +-- employees
        +-- manager_assignments (employee -> manager, both employees)
        +-- operational_goals (owner = employee)
        +-- nte_notices
        +-- journal_entries
  +-- positions
  +-- kpi_goal_templates (position, company)
        +-- kpi_template_versions
              +-- kpi_indicators
                    +-- kpi_indicator_scales
                    +-- kpi_indicator_matrix_rows
  +-- behavioral_templates (company)
        +-- behavioral_template_versions
              +-- behavioral_sections
                    +-- behavioral_questions
                          +-- behavioral_choice_options

cycles (company)
  +-- cycle_participants (employee, frozen kpi_version, frozen behavioral_version)
  +-- cycle_stages

cycle_participants
  +-- accomplishments
        +-- accomplishment_actuals (indicator)
        +-- accomplishment_versions

cycle_stages
  +-- assignments (participant, evaluator, stage)
        +-- assignment_responses (versioned)

cycles
  +-- evaluation_snapshots (participant, frozen on finalization)

pip_plans (employee)
  +-- pip_sources (cycle + indicator, frozen evidence)
  +-- pip_weeks
        +-- pip_week_updates (employee)
        +-- pip_week_assessments (assessor)

notifications (recipient, source)
```

---

## 15. Production Gates Mapped to This Design

| PRD Production Gate | This Design |
|---|---|
| COM-006 server-side authorization | Role/company scoping enforced in app layer per query; `audit_events` and `notifications` tables carry actor/company for audit |
| COM-007 durable persistence, transactions, idempotency | `idempotency_key` on `cycles`, `manager_assignments`, all PIP week operations |
| Cyc-009 transactional cycle activation | Single-transaction insert of `cycle_participants` + `assignments`; idempotency key prevents duplicate rows |
| Mgr-007 server-backed scheduler | `manager_assignments.status = pending` polled by independent worker; no browser dependency |
| Tpl-G-007 immutable version history | `kpi_template_versions` / `behavioral_template_versions` frozen_at; no update path |
| Doc-009 durable document storage | `nte_notices` body stored in Postgres; retention policy external |
| Pip-014 transactional PIP writes | `pip_weeks` / `pip_week_assessments` in same transaction as state transitions |
| Res-002 / Res-003 lock and release are separate | `evaluation_snapshots.finalized_at` and `released_at` are distinct columns |
