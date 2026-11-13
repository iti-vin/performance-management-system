-- Development fixtures only. Stores evaluator assignments, response versions, and frozen result snapshots.

-- ---------------------------------------------------------------------------
-- 8. Evaluator Assignments and Assessments
-- ---------------------------------------------------------------------------

INSERT INTO pms.assignments (
    assignment_id, cycle_id, participant_id, evaluator_id, stage_id,
    state, deadline, submitted_by, submitted_at, completed_at,
    created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000201',
   '00000000-0000-0000-0000-000000000141',
   '00000000-0000-0000-0000-000000000151',
   '00000000-0000-0000-0000-000000000022',
   '00000000-0000-0000-0000-000000000162',
   'in_progress', now() + interval '10 days',
   NULL, NULL, NULL, now(), now()),
  ('00000000-0000-0000-0000-000000000202',
   '00000000-0000-0000-0000-000000000141',
   '00000000-0000-0000-0000-000000000151',
   '00000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000161',
   'submitted', now() + interval '7 days',
   '00000000-0000-0000-0000-000000000021', now(), now(), now(), now())
ON CONFLICT (assignment_id) DO NOTHING;

INSERT INTO pms.assignment_responses (
    response_id, assignment_id, answers_json, version, status,
    submitted_by, submitted_at, created_at
)
VALUES
  ('00000000-0000-0000-0000-000000000211',
   '00000000-0000-0000-0000-000000000202',
   jsonb_build_object(
     '00000000-0000-0000-0000-000000000131', 4,
     '00000000-0000-0000-0000-000000000132', 4
   ),
   1, 'submitted',
   '00000000-0000-0000-0000-000000000021', now(), now())
ON CONFLICT (response_id) DO NOTHING;
