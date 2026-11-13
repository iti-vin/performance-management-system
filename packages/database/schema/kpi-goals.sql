-- ============================================================================
-- 4. KPI Goal Templates
-- ============================================================================
-- Defines versioned KPI templates, indicators, scoring ranges, and matrix axes.

-- Stores the current KPI template state for a company and position.
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
-- Keeps each numbered version of a KPI template.
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
-- Defines the measures and scoring direction in a template version.
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
-- Maps numeric ranges to indicator scores.
CREATE TABLE IF NOT EXISTS pms.kpi_indicator_scales (
    scale_id     uuid PRIMARY KEY,
    indicator_id uuid NOT NULL REFERENCES pms.kpi_indicators(indicator_id),
    lower_bound  numeric NOT NULL,                  -- inclusive
    upper_bound  numeric,                           -- inclusive; NULL means unbounded final range
    score        integer NOT NULL CHECK (score BETWEEN 1 AND 5)
);

-- Flexible reference matrix.
-- Defines the row labels for matrix indicators.
CREATE TABLE IF NOT EXISTS pms.kpi_indicator_matrix_rows (
    row_id       uuid PRIMARY KEY,
    indicator_id uuid NOT NULL REFERENCES pms.kpi_indicators(indicator_id),
    row_label    text NOT NULL
);

-- Defines the column labels for matrix indicators.
CREATE TABLE IF NOT EXISTS pms.kpi_indicator_matrix_columns (
    col_id       uuid PRIMARY KEY,
    indicator_id uuid NOT NULL REFERENCES pms.kpi_indicators(indicator_id),
    col_label    text NOT NULL
);
