-- ============================================================================
-- 7. KPI Accomplishments
-- ============================================================================
-- Stores employee KPI submissions, indicator actuals, and revision history.

-- Tracks the employee's KPI submission and verification status.
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

-- Stores reported values for individual KPI indicators.
CREATE TABLE IF NOT EXISTS pms.accomplishment_actuals (
    actual_id          uuid PRIMARY KEY,
    accomplishment_id  uuid NOT NULL REFERENCES pms.accomplishments(accomplishment_id),
    indicator_id       uuid NOT NULL REFERENCES pms.kpi_indicators(indicator_id),
    actual_value       numeric CHECK (actual_value >= 0),   -- nullable for draft
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    -- One current actual per frozen indicator. Corrections retain history in the versions table.
    CONSTRAINT accomplishment_actuals_indicator_unique UNIQUE (accomplishment_id, indicator_id)
);

-- The unique key covers accomplishment lookups. Index the indicator foreign key separately.
CREATE INDEX IF NOT EXISTS accomplishment_actuals_indicator_idx
    ON pms.accomplishment_actuals (indicator_id);

-- Correction history. Each resubmission after return creates a new row.
-- Records snapshots of a submission as it changes.
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
