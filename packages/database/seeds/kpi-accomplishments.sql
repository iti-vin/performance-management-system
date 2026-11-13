-- Development fixtures only. Stores employee KPI submissions, indicator actuals, and revision history.

-- ---------------------------------------------------------------------------
-- 7. KPI Accomplishments
-- ---------------------------------------------------------------------------

INSERT INTO pms.accomplishments (
    accomplishment_id, participant_id, cycle_id, employee_id, status,
    remarks, submitted_by, submitted_at, verified_by, verified_at,
    created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000171',
   '00000000-0000-0000-0000-000000000151',
   '00000000-0000-0000-0000-000000000141',
   '00000000-0000-0000-0000-000000000021',
   'submitted',
   'Strong quarter. Two milestones ahead of plan.',
   '00000000-0000-0000-0000-000000000021', now(),
   NULL, NULL, now(), now())
ON CONFLICT (accomplishment_id) DO NOTHING;

INSERT INTO pms.accomplishment_actuals (actual_id, accomplishment_id, indicator_id, actual_value, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000181',
   '00000000-0000-0000-0000-000000000171',
   '00000000-0000-0000-0000-000000000061', 4, now(), now()),
  ('00000000-0000-0000-0000-000000000182',
   '00000000-0000-0000-0000-000000000171',
   '00000000-0000-0000-0000-000000000062', 1, now(), now())
ON CONFLICT (actual_id) DO NOTHING;

INSERT INTO pms.accomplishment_versions (
    version_id, accomplishment_id, version, actuals_json, remarks, actor_id, acted_at
)
VALUES
  ('00000000-0000-0000-0000-000000000191',
   '00000000-0000-0000-0000-000000000171', 1,
   jsonb_build_object(
     'actuals',
     jsonb_build_array(
       jsonb_build_object('indicator_id', '00000000-0000-0000-0000-000000000061', 'actual_value', 4),
       jsonb_build_object('indicator_id', '00000000-0000-0000-000000000062', 'actual_value', 1)
     )
   ),
   'Initial submission',
   '00000000-0000-0000-0000-000000000021', now())
ON CONFLICT (version_id) DO NOTHING;
