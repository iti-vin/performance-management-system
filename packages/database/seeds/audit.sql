-- Development fixtures only. Stores audit evidence for workflow changes.

-- ---------------------------------------------------------------------------
-- 13. Audit Events
-- ---------------------------------------------------------------------------

INSERT INTO pms.audit_events (
    event_id, entity_type, entity_id, action, actor_id,
    reason, before_json, after_json, idempotency_key, occurred_at
)
VALUES
  ('00000000-0000-0000-0000-000000000341',
   'nte_notices',
   '00000000-0000-0000-0000-000000000231',
   'issue',
   '00000000-0000-0000-0000-000000000023',
   'Unapproved overtime',
   NULL,
   jsonb_build_object('status', 'issued'),
   NULL, now()),
  ('00000000-0000-0000-0000-000000000342',
   'pip_plans',
   '00000000-0000-0000-0000-000000000251',
   'create',
   '00000000-0000-0000-0000-000000000022',
   'Manual PIP for reduced defect leakage',
   NULL,
   jsonb_build_object('state', 'active'),
   NULL, now())
ON CONFLICT (event_id) DO NOTHING;
