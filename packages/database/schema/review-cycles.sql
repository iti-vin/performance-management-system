-- ============================================================================
-- 6. Review Cycles
-- ============================================================================
-- Stores review cycles, participants, frozen template references, and stages.

-- Stores the review calendar, weights, and lifecycle state.
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
    CHECK (evaluation_end >= evaluation_start),
    -- Store component weights as fractions. Together they represent 100 percent (PRD sections 2.6 and 6.6).
    CONSTRAINT cycles_component_weights
        CHECK (goals_weight BETWEEN 0 AND 1 AND behavioral_weight BETWEEN 0 AND 1
               AND goals_weight + behavioral_weight = 1)
);

-- Links employees to a cycle and records their frozen template versions.
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

-- Defines reviewer perspectives, order, and deadlines for a cycle.
CREATE TABLE IF NOT EXISTS pms.cycle_stages (
    stage_id       uuid PRIMARY KEY,
    cycle_id       uuid NOT NULL REFERENCES pms.cycles(cycle_id),
    perspective    text NOT NULL CHECK (perspective IN ('self','manager','hr','peer','upward')),
    evaluator_role text,
    sort_order     integer NOT NULL,   -- stage sequence (Rev-003)
    deadline       timestamptz
);
