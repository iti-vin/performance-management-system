-- ============================================================================
-- 10. Performance Improvement Plan
-- ============================================================================
-- Stores improvement plans, triggering evidence, weekly updates, and assessments.

-- Stores a performance improvement plan and its lifecycle state.
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
-- Connects the plan to the review and indicator evidence that triggered it.
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

-- Defines weekly milestones, expected outcomes, and follow-up weeks.
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

-- Stores employee progress submissions for a plan week.
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

-- Records a reviewer's outcome for a plan week.
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
