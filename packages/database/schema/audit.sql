-- ============================================================================
-- 13. Audit
-- ============================================================================
-- Stores audit evidence for workflow changes.

-- Audit records are append-only by policy. Enforce that policy in application access and database grants.
-- Records workflow actions and optional before and after snapshots.
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
