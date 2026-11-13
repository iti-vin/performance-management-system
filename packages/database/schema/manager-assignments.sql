-- ============================================================================
-- 3. Effective-Dated Manager Assignments
-- Invariants (no self-assignment, same-company match, no projected
-- reporting loop) are enforced in the application layer because the
-- loop check depends on the projected pending batch (Mgr-002).
-- ============================================================================
-- Stores reporting changes with effective dates and application outcomes.

-- Tracks effective-dated changes to an employee's reporting line.
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
