-- ============================================================================
-- 8. Evaluator Assignments and Assessments
-- ============================================================================
-- Stores evaluator assignments and response versions (PRD section 8).
-- The service checks evaluator scope and stage readiness before submission.

-- Links an evaluator to a review subject and cycle stage.
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
-- Stores versioned answers for an evaluator assignment.
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
