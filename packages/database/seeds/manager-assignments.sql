-- Development fixtures only. Stores reporting changes with effective dates and application outcomes.

-- ---------------------------------------------------------------------------
-- 3. Manager Assignments
-- ---------------------------------------------------------------------------

INSERT INTO pms.manager_assignments (
    assignment_id, employee_id, manager_id, company, effective_date, status,
    previous_manager_id, apply_reason, applied_at, idempotency_key, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000031',
   '284ddc9e-ebe4-468d-945f-fb18af72e622',
   '00000000-0000-0000-0000-000000000022',
   'Mayon Consolidated Inc.',
   '2026-11-04', 'applied',
   NULL, 'Initial assignment', now(),
   'MGR-KEY-001', now(), now()),
  -- The test account `user` reports to the test account `manager`, so a cycle can give both a review.
  ('00000000-0000-0000-0000-000000000032',
   '08bd7bb2-faa4-46ae-b7c1-cc20664d7331',
   'ce58dfdf-e0bf-47d8-9060-3dc10d732d07',
   'Mayon Consolidated Inc.',
   '2026-11-26', 'applied',
   NULL, 'Test accounts for the review modules', now(),
   'MGR-KEY-002', now(), now())
ON CONFLICT (assignment_id) DO NOTHING;
