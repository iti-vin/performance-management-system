-- ============================================================================
-- 9. 202 Files
-- ============================================================================
-- Stores employee journal entries, notices to explain, and read receipts.

-- Stores employee journal entries and optional cycle references.
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

-- Stores notices to explain, their deadlines, and workflow state.
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

-- Records when an employee opens a notice.
CREATE TABLE IF NOT EXISTS pms.nte_read_receipts (
    receipt_id   uuid PRIMARY KEY,
    notice_id    uuid NOT NULL REFERENCES pms.nte_notices(notice_id),
    employee_id  uuid NOT NULL REFERENCES pms.employees(guid),
    opened_at    timestamptz NOT NULL,
    UNIQUE (notice_id, employee_id)
);
