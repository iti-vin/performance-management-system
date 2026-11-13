-- ============================================================================
-- 11. Operational Goals and Milestones
-- ============================================================================
-- Stores operational goals, milestone targets, and progress history.

-- Tracks employee goals and their progress.
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

-- Stores the due dates and completion state for goal milestones.
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

-- Keeps the history of progress changes for a goal.
CREATE TABLE IF NOT EXISTS pms.goal_progress_updates (
    update_id               uuid PRIMARY KEY,
    goal_id                 uuid NOT NULL REFERENCES pms.operational_goals(goal_id),
    actor_id                uuid NOT NULL,
    progress_percent        numeric(5,2) NOT NULL,
    comment                 text,
    milestone_snapshot_json jsonb,
    updated_at              timestamptz NOT NULL DEFAULT now()
);
