-- Finalization, scoring, and result release (PRD section 9).
-- PIP reads this evidence after release. Load this module before PIP.

-- Keep one result per cycle participant. The service freezes scores and
-- evidence on finalization and checks visibility when serving released results.
CREATE TABLE IF NOT EXISTS pms.evaluation_snapshots (
    snapshot_id                 uuid PRIMARY KEY,
    cycle_id                    uuid NOT NULL REFERENCES pms.cycles(cycle_id),
    participant_id              uuid NOT NULL REFERENCES pms.cycle_participants(participant_id),
    goals_component_score       numeric,
    behavioral_component_score  numeric,
    overall_score               numeric,
    evidence_json               jsonb NOT NULL,   -- verified actuals, ratings, weights, and config
    finalized_by                uuid,
    finalized_at                timestamptz,
    released_at                 timestamptz,
    UNIQUE (cycle_id, participant_id),
    -- Release is a separate transition and cannot precede finalization (Res-002/003).
    CONSTRAINT evaluation_snapshots_release_order
        CHECK (released_at IS NULL OR (finalized_at IS NOT NULL AND released_at >= finalized_at))
);

-- The unique key above covers cycle lookups. Index the other foreign key for participant lookups.
CREATE INDEX IF NOT EXISTS evaluation_snapshots_participant_idx
    ON pms.evaluation_snapshots (participant_id);

-- Who reads the released results of a cycle, beside HR (PRD Cyc-001). A cycle with no row is
-- read by the employee and the manager. earlier_answers_visible: the reviewer of a later stage
-- reads the submitted answers of an earlier one (D5). Off unless the cycle chose it.
CREATE TABLE IF NOT EXISTS pms.cycle_result_visibility (
    cycle_id         uuid PRIMARY KEY REFERENCES pms.cycles(cycle_id) ON DELETE CASCADE,
    employee_visible boolean NOT NULL DEFAULT true,
    manager_visible  boolean NOT NULL DEFAULT true,
    earlier_answers_visible boolean NOT NULL DEFAULT false
);
