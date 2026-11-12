-- ============================================================================
-- PMS (HRDotNet Performance) schema
-- Aligned with .docs/database-design.md
--
-- Conventions from design doc section 1:
--   - CREATE SCHEMA pms; all objects below live in pms.
--   - Column names follow the design doc exactly.
--   - All tables carry created_at, updated_at as timestamptz.
--   - Immutable/frozen tables (template versions, snapshots) carry
--     frozen_at or the doc-specified audit columns and no updated_at.
--   - Soft delete via archived_at/cancelled_at/state columns;
--     never physical delete.
--   - idempotency_key on workflow mutations where VAL-007/VAL-016 apply.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS pms;

BEGIN;

-- ============================================================================
-- 2. Identity and Directory
-- ============================================================================


CREATE TABLE IF NOT EXISTS pms.user_role (
    id          bigint PRIMARY KEY,
    code        text NOT NULL,
    name        text NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pms.companies (
    company_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        text NOT NULL,
    demo_mode   boolean NOT NULL DEFAULT false,   -- Clk-002
    demo_date   date,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pms.departments (
    department_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id    bigint NOT NULL REFERENCES pms.companies(company_id),
    name          text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS pms.positions (
    position_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id  bigint NOT NULL REFERENCES pms.companies(company_id),
    title       text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pms.employees (
    guid            uuid PRIMARY KEY,
    id              bigint PRIMARY KEY,
    code            text NOT NULL,
    email           text NOT NULL,
    first_name      text NOT NULL,
    last_name       text NOT NULL,
    hrdotnet_id     bigint,
    company_id      bigint NOT NULL REFERENCES pms.companies(company_id),
    position_id     bigint REFERENCES pms.positions(position_id),
    department_id   bigint NOT NULL REFERENCES pms.departments(department_id),
    status          text NOT NULL CHECK (status IN ('active', 'inactive')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    UNIQUE (company_id, code, email)
);


-- ============================================================================
-- 3. Effective-Dated Manager Assignments
-- Invariants (no self-assignment, same-company match, no projected
-- reporting loop) are enforced in the application layer because the
-- loop check depends on the projected pending batch (Mgr-002).
-- ============================================================================

CREATE TABLE IF NOT EXISTS pms.manager_assignments (
    assignment_id        uuid PRIMARY KEY,
    employee_id          uuid NOT NULL REFERENCES pms.employees(guid),
    manager_id           uuid NOT NULL REFERENCES pms.employees(guid),
    company_id           bigint NOT NULL REFERENCES pms.companies(company_id),
    effective_date       date NOT NULL,           -- on or after current company date (Dir-004)
    status               text NOT NULL CHECK (status IN ('pending','applied','blocked','cancelled')),
    previous_manager_id  uuid REFERENCES pms.employees(guid),   -- set on apply
    apply_reason         text,
    cancel_reason        text,
    blocked_reason       text,
    applied_at           timestamptz,
    cancelled_at         timestamptz,
    blocked_at           timestamptz,
    idempotency_key      text,                     -- VAL-007
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. KPI Goal Templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS pms.kpi_goal_templates (
    template_id     uuid PRIMARY KEY,
    position_id     bigint REFERENCES pms.positions(position_id),
    company_id      bigint NOT NULL REFERENCES pms.companies(company_id),
    status          text NOT NULL CHECK (status IN ('draft','published','archived')),
    current_version integer NOT NULL DEFAULT 0,
    published_by    uuid,
    published_at    timestamptz,
    archived_at     timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Immutable: one row per published/draft version.
CREATE TABLE IF NOT EXISTS pms.kpi_template_versions (
    version_id  uuid PRIMARY KEY,
    template_id uuid NOT NULL REFERENCES pms.kpi_goal_templates(template_id),
    version     integer NOT NULL,
    frozen_at   timestamptz,                       -- NULL until published
    created_by  uuid,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (template_id, version)
);

-- Belong to a template version. Stable identity per indicator row.
CREATE TABLE IF NOT EXISTS pms.kpi_indicators (
    indicator_id        uuid PRIMARY KEY,
    version_id          uuid NOT NULL REFERENCES pms.kpi_template_versions(version_id),
    name                text NOT NULL,
    description         text,
    unit                text,
    target              numeric CHECK (target >= 0),
    direction           text NOT NULL CHECK (direction IN ('higher_is_better','lower_is_better')),
    weight              numeric(5,2) NOT NULL CHECK (weight > 0),
    score_target_met    integer NOT NULL CHECK (score_target_met BETWEEN 1 AND 5),
    score_below_target  integer NOT NULL CHECK (score_below_target BETWEEN 1 AND 5),
    use_for_scoring     boolean NOT NULL DEFAULT true  -- Tpl-G-004 toggle
);

-- Scoring boundary mapping. One row per threshold band per indicator.
CREATE TABLE IF NOT EXISTS pms.kpi_indicator_scales (
    scale_id     uuid PRIMARY KEY,
    indicator_id uuid NOT NULL REFERENCES pms.kpi_indicators(indicator_id),
    lower_bound  numeric NOT NULL,                  -- inclusive
    upper_bound  numeric,                           -- inclusive; NULL means unbounded final range
    score        integer NOT NULL CHECK (score BETWEEN 1 AND 5)
);

-- Flexible reference matrix.
CREATE TABLE IF NOT EXISTS pms.kpi_indicator_matrix_rows (
    row_id       uuid PRIMARY KEY,
    indicator_id uuid NOT NULL REFERENCES pms.kpi_indicators(indicator_id),
    row_label    text NOT NULL
);

CREATE TABLE IF NOT EXISTS pms.kpi_indicator_matrix_columns (
    col_id       uuid PRIMARY KEY,
    indicator_id uuid NOT NULL REFERENCES pms.kpi_indicators(indicator_id),
    col_label    text NOT NULL
);

-- ============================================================================
-- 5. Behavioral Assessment Templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS pms.behavioral_templates (
    template_id     uuid PRIMARY KEY,
    company_id      bigint NOT NULL REFERENCES pms.companies(company_id),
    status          text NOT NULL CHECK (status IN ('draft','published','archived')),
    current_version integer NOT NULL DEFAULT 0,
    published_by    uuid,
    published_at    timestamptz,
    archived_at     timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Immutable, same split as KPI template versions.
CREATE TABLE IF NOT EXISTS pms.behavioral_template_versions (
    version_id  uuid PRIMARY KEY,
    template_id uuid NOT NULL REFERENCES pms.behavioral_templates(template_id),
    version     integer NOT NULL,
    frozen_at   timestamptz,
    created_by  uuid,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (template_id, version)
);

CREATE TABLE IF NOT EXISTS pms.behavioral_sections (
    section_id  uuid PRIMARY KEY,
    version_id  uuid NOT NULL REFERENCES pms.behavioral_template_versions(version_id),
    title       text NOT NULL,
    sort_order  integer NOT NULL
);

CREATE TABLE IF NOT EXISTS pms.behavioral_questions (
    question_id         uuid PRIMARY KEY,
    section_id          uuid NOT NULL REFERENCES pms.behavioral_sections(section_id),
    prompt              text NOT NULL,
    question_type       text NOT NULL CHECK (question_type IN ('rating_scale','short_answer','paragraph','multiple_choice')),
    is_required         boolean NOT NULL DEFAULT true,
    allow_not_observed  boolean,   -- rating_scale only
    sort_order          integer NOT NULL
);

CREATE TABLE IF NOT EXISTS pms.behavioral_choice_options (
    option_id   uuid PRIMARY KEY,
    question_id uuid NOT NULL REFERENCES pms.behavioral_questions(question_id),
    label       text NOT NULL,
    UNIQUE (question_id, label)
);

-- ============================================================================
-- 6. Review Cycles
-- ============================================================================

CREATE TABLE IF NOT EXISTS pms.cycles (
    cycle_id             uuid PRIMARY KEY,
    company_id           bigint NOT NULL REFERENCES pms.companies(company_id),
    name                 text NOT NULL,
    review_type          text NOT NULL CHECK (review_type IN ('standard','360','probationary','project_based')),
    state                text NOT NULL CHECK (state IN ('draft','scheduled','active','completed','cancelled')),
    evaluation_start     date NOT NULL,
    evaluation_end       date NOT NULL,
    assessment_start     timestamptz,
    verification_deadline timestamptz,                -- Acc-006
    activation_date      date,
    goals_weight         numeric(4,2) NOT NULL DEFAULT 0.50,
    behavioral_weight    numeric(4,2) NOT NULL DEFAULT 0.50,
    anonymity_threshold  integer CHECK (anonymity_threshold BETWEEN 2 AND 10),  -- Res-008
    cancelled_reason     text,
    finalized_at         timestamptz,
    released_at          timestamptz,
    idempotency_key      text,                       -- Cyc-006/009
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    CHECK (evaluation_end >= evaluation_start)
);

CREATE TABLE IF NOT EXISTS pms.cycle_participants (
    participant_id        uuid PRIMARY KEY,
    cycle_id              uuid NOT NULL REFERENCES pms.cycles(cycle_id),
    employee_id           uuid NOT NULL REFERENCES pms.employees(guid),
    frozen_position_id    bigint REFERENCES pms.positions(position_id),   -- snapshot at scheduling (Cyc-004)
    kpi_version_id        uuid REFERENCES pms.kpi_template_versions(version_id),          -- frozen
    behavioral_version_id uuid REFERENCES pms.behavioral_template_versions(version_id),   -- frozen
    created_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (cycle_id, employee_id)
);

CREATE TABLE IF NOT EXISTS pms.cycle_stages (
    stage_id       uuid PRIMARY KEY,
    cycle_id       uuid NOT NULL REFERENCES pms.cycles(cycle_id),
    perspective    text NOT NULL CHECK (perspective IN ('self','manager','hr','peer','upward')),
    evaluator_role text,
    sort_order     integer NOT NULL,   -- stage sequence (Rev-003)
    deadline       timestamptz
);

-- ============================================================================
-- 7. KPI Accomplishments
-- ============================================================================

CREATE TABLE IF NOT EXISTS pms.accomplishments (
    accomplishment_id  uuid PRIMARY KEY,
    participant_id     uuid NOT NULL REFERENCES pms.cycle_participants(participant_id),
    cycle_id           uuid NOT NULL REFERENCES pms.cycles(cycle_id),   -- denormalized for query
    employee_id        uuid NOT NULL REFERENCES pms.employees(guid),
    status             text NOT NULL CHECK (status IN ('draft','submitted','returned','verified')),
    remarks            text,
    submitted_by       uuid,
    submitted_at       timestamptz,
    verified_by        uuid,
    verified_at        timestamptz,
    return_reason      text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    UNIQUE (participant_id)
);

CREATE TABLE IF NOT EXISTS pms.accomplishment_actuals (
    actual_id          uuid PRIMARY KEY,
    accomplishment_id  uuid NOT NULL REFERENCES pms.accomplishments(accomplishment_id),
    indicator_id       uuid NOT NULL REFERENCES pms.kpi_indicators(indicator_id),
    actual_value       numeric CHECK (actual_value >= 0),   -- nullable for draft
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Correction history. Each resubmission after return creates a new row.
CREATE TABLE IF NOT EXISTS pms.accomplishment_versions (
    version_id         uuid PRIMARY KEY,
    accomplishment_id  uuid NOT NULL REFERENCES pms.accomplishments(accomplishment_id),
    version            integer NOT NULL,
    actuals_json       jsonb NOT NULL,     -- snapshot of submitted actuals
    remarks            text,
    actor_id           uuid,
    acted_at           timestamptz,
    correction_reason  text,
    UNIQUE (accomplishment_id, version)
);

-- ============================================================================
-- 8. Evaluator Assignments and Assessments
-- ============================================================================

CREATE TABLE IF NOT EXISTS pms.assignments (
    assignment_id  uuid PRIMARY KEY,
    cycle_id       uuid NOT NULL REFERENCES pms.cycles(cycle_id),
    participant_id uuid NOT NULL REFERENCES pms.cycle_participants(participant_id),   -- subject
    evaluator_id   uuid NOT NULL REFERENCES pms.employees(guid),  -- retained after manager change (Rev-007, AUTH-004)
    stage_id       uuid NOT NULL REFERENCES pms.cycle_stages(stage_id),
    state          text NOT NULL CHECK (state IN ('locked','not_started','in_progress','submitted','completed')),
    deadline       timestamptz,
    submitted_by   uuid,
    submitted_at   timestamptz,
    completed_at   timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (participant_id, evaluator_id, stage_id)
);

-- One response row per assignment; immutable once submitted, corrections
-- create a new version row.
CREATE TABLE IF NOT EXISTS pms.assignment_responses (
    response_id     uuid PRIMARY KEY,
    assignment_id   uuid NOT NULL REFERENCES pms.assignments(assignment_id),
    answers_json    jsonb NOT NULL,      -- typed answers keyed by question_id
    version         integer NOT NULL,
    status          text NOT NULL CHECK (status IN ('draft','submitted')),
    submitted_by    uuid,
    submitted_at    timestamptz,
    reopen_reason   text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, version)
);

-- Locks all finalized result evidence. Immutable after finalized_at (Res-002).
CREATE TABLE IF NOT EXISTS pms.evaluation_snapshots (
    snapshot_id                 uuid PRIMARY KEY,
    cycle_id                    uuid NOT NULL REFERENCES pms.cycles(cycle_id),
    participant_id              uuid NOT NULL REFERENCES pms.cycle_participants(participant_id),
    goals_component_score       numeric,
    behavioral_component_score  numeric,
    overall_score               numeric,
    evidence_json               jsonb NOT NULL,   -- frozen verified actuals, ratings, weights, config
    finalized_by                uuid,
    finalized_at                timestamptz,
    released_at                 timestamptz,
    UNIQUE (cycle_id, participant_id)
);

-- ============================================================================
-- 9. 202 Files
-- ============================================================================

CREATE TABLE IF NOT EXISTS pms.journal_entries (
    entry_id      uuid PRIMARY KEY,
    employee_id   uuid NOT NULL REFERENCES pms.employees(guid),
    author_id     uuid NOT NULL REFERENCES pms.employees(guid),
    company_id    bigint NOT NULL REFERENCES pms.companies(company_id),
    entry_date    date NOT NULL,
    entry_type    text NOT NULL,
    title         text NOT NULL,
    description   text,
    cycle_id      uuid REFERENCES pms.cycles(cycle_id),
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pms.nte_notices (
    notice_id               uuid PRIMARY KEY,
    employee_id             uuid NOT NULL REFERENCES pms.employees(guid),
    company_id              bigint NOT NULL REFERENCES pms.companies(company_id),
    category                text NOT NULL,
    subject                 text NOT NULL,
    body                    text NOT NULL,
    explanation_deadline    date NOT NULL,
    incident_date           date,
    incident_reference      text,
    status                  text NOT NULL CHECK (status IN ('draft','issued','responded','closed','cancelled')),
    explanation_text        text,          -- one submission only (Doc-005)
    explanation_submitted_at timestamptz,
    early_close_reason      text,          -- Doc-006
    cancel_reason           text,          -- Doc-007
    issued_by               uuid,
    issued_at               timestamptz,
    closed_by               uuid,
    closed_at               timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pms.nte_read_receipts (
    receipt_id   uuid PRIMARY KEY,
    notice_id    uuid NOT NULL REFERENCES pms.nte_notices(notice_id),
    employee_id  uuid NOT NULL REFERENCES pms.employees(guid),
    opened_at    timestamptz NOT NULL,
    UNIQUE (notice_id, employee_id)
);

-- ============================================================================
-- 10. Performance Improvement Plan
-- ============================================================================

CREATE TABLE IF NOT EXISTS pms.pip_plans (
    plan_id                       uuid PRIMARY KEY,
    employee_id                 uuid NOT NULL REFERENCES pms.employees(guid),
    company_id                  bigint NOT NULL REFERENCES pms.companies(company_id),
    origin                      text NOT NULL CHECK (origin IN ('automatic','manual')),
    state                       text NOT NULL CHECK (state IN ('awaiting_planning','draft','active','completed','not_met','cancelled')),
    referral_review_required    boolean,   -- Pip-004/008
    completion_note             text,      -- Pip-012
    cancel_reason               text,
    linked_evaluation_snapshot_id uuid REFERENCES pms.evaluation_snapshots(snapshot_id),
    created_by                  uuid,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    closed_at                   timestamptz
);

-- One row per (cycle_id + indicator_id) that triggered the plan.
CREATE TABLE IF NOT EXISTS pms.pip_sources (
    source_id           uuid PRIMARY KEY,
    plan_id             uuid NOT NULL REFERENCES pms.pip_plans(plan_id),
    cycle_id            uuid NOT NULL REFERENCES pms.cycles(cycle_id),
    indicator_id        uuid NOT NULL REFERENCES pms.kpi_indicators(indicator_id),
    frozen_actual       numeric,          -- immutable
    frozen_target       numeric,          -- immutable
    direction           text,
    unit                text,
    score               numeric,
    matrix_criteria_json jsonb,
    covered_by_week_id  uuid,            -- uuid FK, nullable, set later to pip_weeks
    exclusion_reason    text,            -- Pip-007
    referral_reviewed   boolean NOT NULL DEFAULT false,
    UNIQUE (plan_id, cycle_id, indicator_id)   -- Pip-005
);

CREATE TABLE IF NOT EXISTS pms.pip_weeks (
    week_id            uuid PRIMARY KEY,
    plan_id            uuid NOT NULL REFERENCES pms.pip_plans(plan_id),
    source_id          uuid REFERENCES pms.pip_sources(source_id),   -- nullable; follow-up may share source
    focus              text,
    goal_description   text,
    target_value       numeric,
    unit               text,
    direction          text,
    start_date         date NOT NULL,
    end_date           date NOT NULL,
    status             text NOT NULL CHECK (status IN ('pending','active','completed','not_met')),
    follow_up_of_week_id uuid REFERENCES pms.pip_weeks(week_id),     -- Pip-011
    follow_up_reason   text,
    assessment_reason_missed text,   -- Pip-010
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS pms.pip_week_updates (
    update_id       uuid PRIMARY KEY,
    week_id         uuid NOT NULL REFERENCES pms.pip_weeks(week_id),
    employee_id     uuid NOT NULL REFERENCES pms.employees(guid),
    status          text NOT NULL CHECK (status IN ('draft','submitted','returned')),
    progress_actual numeric,
    remarks         text,
    returned_reason text,
    submitted_at    timestamptz,
    updated_at      timestamptz
);

CREATE TABLE IF NOT EXISTS pms.pip_week_assessments (
    assessment_id  uuid PRIMARY KEY,
    week_id        uuid NOT NULL REFERENCES pms.pip_weeks(week_id),
    update_id      uuid REFERENCES pms.pip_week_updates(update_id),
    assessor_id    uuid NOT NULL,
    outcome        text NOT NULL CHECK (outcome IN ('met','not_met','missed')),
    verified_actual numeric,
    remarks        text,
    missed_reason  text,            -- required if outcome = missed (app layer)
    assessed_at    timestamptz NOT NULL
);

-- ============================================================================
-- 11. Operational Goals and Milestones
-- ============================================================================

CREATE TABLE IF NOT EXISTS pms.operational_goals (
    goal_id          uuid PRIMARY KEY,
    owner_id         uuid NOT NULL REFERENCES pms.employees(guid),
    creator_id       uuid NOT NULL REFERENCES pms.employees(guid),
    company_id       bigint NOT NULL REFERENCES pms.companies(company_id),
    name             text NOT NULL,
    description      text,
    category         text NOT NULL CHECK (category IN ('quality','delivery','growth','collaboration')),
    cycle_id         uuid REFERENCES pms.cycles(cycle_id),   -- optional association
    start_date       date NOT NULL,
    due_date         date NOT NULL,
    progress_percent numeric(5,2) CHECK (progress_percent BETWEEN 0 AND 100),
    tracking_mode    text NOT NULL CHECK (tracking_mode IN ('manual','milestone')),
    status           text NOT NULL CHECK (status IN ('active','pending_approval','completed')),
    version          integer NOT NULL DEFAULT 0,   -- stale-write detection, VAL-013
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CHECK (due_date >= start_date)
);

CREATE TABLE IF NOT EXISTS pms.goal_milestones (
    milestone_id  uuid PRIMARY KEY,
    goal_id       uuid NOT NULL REFERENCES pms.operational_goals(goal_id),
    title         text NOT NULL,
    due_date      date,
    done          boolean NOT NULL DEFAULT false,
    completed_at  timestamptz,
    status        text NOT NULL CHECK (status IN ('pending','completed','completed_late','overdue')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pms.goal_progress_updates (
    update_id               uuid PRIMARY KEY,
    goal_id                 uuid NOT NULL REFERENCES pms.operational_goals(goal_id),
    actor_id                uuid NOT NULL,
    progress_percent        numeric(5,2) NOT NULL,
    comment                 text,
    milestone_snapshot_json jsonb,
    updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 12. Notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS pms.notifications (
    notification_id uuid PRIMARY KEY,
    recipient_id    uuid NOT NULL REFERENCES pms.employees(guid),
    source_type     text NOT NULL CHECK (source_type IN ('assignment','nte','pip')),
    source_id       uuid NOT NULL,   -- polymorphic: id of the assignment / nte_notices / pip_plans row
    message         text NOT NULL,
    read_at         timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pms.notification_preferences (
    employee_id                  uuid PRIMARY KEY REFERENCES pms.employees(guid),
    review_notifications_enabled boolean NOT NULL DEFAULT true
);

-- ============================================================================
-- 13. Audit
-- ============================================================================

-- Append-only. No UPDATE or DELETE permitted on this table.
CREATE TABLE IF NOT EXISTS pms.audit_events (
    event_id        uuid PRIMARY KEY,
    entity_type     text NOT NULL,
    entity_id       uuid NOT NULL,
    action          text NOT NULL,
    actor_id        uuid,
    reason          text,
    before_json     jsonb,
    after_json      jsonb,
    idempotency_key text,
    occurred_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 14. Users (authentication)
-- Lives in public schema so TypeORM entity @Entity({ name: 'users' }) works
-- without a schema prefix on the connection.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email      text NOT NULL UNIQUE,
    username   text NOT NULL UNIQUE,
    password   text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
