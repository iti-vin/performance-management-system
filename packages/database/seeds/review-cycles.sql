-- Development fixtures only. Stores review cycles, participants, frozen template references, and stages.

-- ---------------------------------------------------------------------------
-- 6. Review Cycles
-- ---------------------------------------------------------------------------

INSERT INTO pms.cycles (
    cycle_id, company, name, review_type, state,
    evaluation_start, evaluation_end, assessment_start, verification_deadline,
    activation_date, goals_weight, behavioral_weight, anonymity_threshold,
    idempotency_key, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000141',
   'Mayon Consolidated Inc.',
   'CY2026-Q4', 'standard', 'active',
   '2026-11-04', '2026-12-31', now(), now() + interval '14 days',
   '2026-11-04', 0.50, 0.50, 5,
   'CYC-KEY-001', now(), now())
ON CONFLICT (cycle_id) DO NOTHING;

INSERT INTO pms.cycle_participants (
    participant_id, cycle_id, employee_id, frozen_position,
    kpi_version_id, behavioral_version_id, created_at
)
VALUES
  ('00000000-0000-0000-0000-000000000151',
   '00000000-0000-0000-0000-000000000141',
   '284ddc9e-ebe4-468d-945f-fb18af72e622',
   'Software Engineer',
   '00000000-0000-0000-0000-000000000051',
   '00000000-0000-0000-0000-000000000111',
   now())
ON CONFLICT (participant_id) DO NOTHING;

-- The self and manager stages have no named person: launch derives the participant and the applied manager.
INSERT INTO pms.cycle_stages (stage_id, cycle_id, perspective, evaluator_role, evaluator_id, sort_order, deadline)
VALUES
  ('00000000-0000-0000-0000-000000000161',
   '00000000-0000-0000-0000-000000000141', 'self', 'employee', NULL, 1, now() + interval '7 days'),
  ('00000000-0000-0000-0000-000000000162',
   '00000000-0000-0000-0000-000000000141', 'manager', 'engineering_manager', NULL, 2, now() + interval '10 days'),
  ('00000000-0000-0000-0000-000000000163',
   '00000000-0000-0000-0000-000000000141', 'hr', 'hr_officer',
   '00000000-0000-0000-0000-000000000023', 3, now() + interval '14 days')
ON CONFLICT (stage_id) DO NOTHING;
