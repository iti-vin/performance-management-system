-- Development fixtures only. Stores improvement plans, triggering evidence, weekly updates, and assessments.

-- ---------------------------------------------------------------------------
-- 10. Performance Improvement Plan
-- ---------------------------------------------------------------------------

INSERT INTO pms.pip_plans (
    plan_id, employee_id, company_id, origin, state,
    referral_review_required, completion_note, cancel_reason,
    linked_evaluation_snapshot_id, created_by, created_at, closed_at
)
VALUES
  ('00000000-0000-0000-0000-000000000251',
   '00000000-0000-0000-0000-000000000021',
   1,
   'manual', 'active',
   false, NULL, NULL, NULL,
   '00000000-0000-0000-0000-000000000022', now(), NULL)
ON CONFLICT (plan_id) DO NOTHING;

INSERT INTO pms.pip_sources (
    source_id, plan_id, cycle_id, indicator_id,
    frozen_actual, frozen_target, direction, unit, score,
    matrix_criteria_json, covered_by_week_id, exclusion_reason, referral_reviewed
)
VALUES
  ('00000000-0000-0000-0000-000000000261',
   '00000000-0000-0000-0000-000000000251',
   '00000000-0000-0000-0000-000000000141',
   '00000000-0000-0000-0000-000000000062',
   3, 2, 'lower_is_better', 'count', 2,
   NULL, '00000000-0000-0000-0000-000000000271', NULL, false)
ON CONFLICT (source_id) DO NOTHING;

INSERT INTO pms.pip_weeks (
    week_id, plan_id, source_id, focus, goal_description,
    target_value, unit, direction, start_date, end_date,
    status, follow_up_of_week_id, follow_up_reason,
    assessment_reason_missed, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000271',
   '00000000-0000-0000-0000-000000000251',
   '00000000-0000-0000-0000-000000000261',
   'Reduce defect leakage', 'Introduce a pre-release smoke test gate.',
   1, 'defect', 'lower_is_better',
   '2026-11-04', '2026-11-10',
   'active', NULL, NULL, NULL, now(), now())
ON CONFLICT (week_id) DO NOTHING;

INSERT INTO pms.pip_week_updates (
    update_id, week_id, employee_id, status, progress_actual,
    remarks, returned_reason, submitted_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000281',
   '00000000-0000-0000-0000-000000000271',
   '00000000-0000-0000-0000-000000000021',
   'submitted', 0.5,
   'Smoke test gate in place, blocked by flaky infra test.',
   NULL, now(), now())
ON CONFLICT (update_id) DO NOTHING;

INSERT INTO pms.pip_week_assessments (
    assessment_id, week_id, update_id, assessor_id, outcome,
    verified_actual, remarks, missed_reason, assessed_at
)
VALUES
  ('00000000-0000-0000-0000-000000000291',
   '00000000-0000-0000-0000-000000000271',
   '00000000-0000-0000-0000-000000000281',
   '00000000-0000-0000-0000-000000000022',
   'met', 0.5,
   'Gate accepted with one waived flaky test.',
   NULL, now())
ON CONFLICT (assessment_id) DO NOTHING;
