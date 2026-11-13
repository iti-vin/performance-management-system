-- Development fixtures only. Stores reporting changes with effective dates and application outcomes.

-- ---------------------------------------------------------------------------
-- 3. Manager Assignments
-- ---------------------------------------------------------------------------

INSERT INTO pms.manager_assignments (
    assignment_id, employee_id, manager_id, company_id, effective_date, status,
    previous_manager_id, apply_reason, applied_at, idempotency_key, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000022',
   1,
   '2026-11-04', 'applied',
   NULL, 'Initial assignment', now(),
   'MGR-KEY-001', now(), now())
ON CONFLICT (assignment_id) DO NOTHING;
