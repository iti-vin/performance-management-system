-- ============================================================================
-- PMS sample seed data.
-- Aligned with .docs/database-design.md via schema pms.*.
-- Idempotent: safe to rerun. Uses deterministic UUIDs (fixed suffix pattern).
-- Sample data only. Do not use in production.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 2. Identity and Directory
-- ---------------------------------------------------------------------------

INSERT INTO pms.companies (company_id, name, demo_mode, demo_date, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Mayon Consolidated Inc.', false, NULL, now(), now())
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO pms.positions (position_id, company_id, title, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000011', gen_random_uuid(), 'Software Engineer', now(), now()),
  ('00000000-0000-0000-0000-000000000012', gen_random_uuid(), 'Engineering Manager', now(), now()),
  ('00000000-0000-0000-0000-000000000013', gen_random_uuid(), 'Human Resources Officer', now(), now())
ON CONFLICT (position_id) DO NOTHING;

INSERT INTO pms.employees (
    employee_id, company_id, hrdotnet_id, employee_number, first_name, last_name,
    position_id, department, status, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000021', gen_random_uuid(), 'HRD-001', 'EMP-001', 'Juan', 'Dela Cruz',
   '00000000-0000-0000-0000-000000000011', 'Engineering', 'active', now(), now()),
  ('00000000-0000-0000-0000-000000000022', gen_random_uuid(), 'HRD-002', 'EMP-002', 'Maria', 'Santos',
   '00000000-0000-0000-0000-000000000012', 'Engineering', 'active', now(), now()),
  ('00000000-0000-0000-0000-000000000023', gen_random_uuid(), 'HRD-003', 'EMP-003', 'Ramon', 'Reyes',
   '00000000-0000-0000-0000-000000000013', 'Human Resources', 'active', now(), now())
ON CONFLICT (employee_id) DO NOTHING;

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
   gen_random_uuid(),
   '2026-11-04', 'applied',
   NULL, 'Initial assignment', now(),
   'MGR-KEY-001', now(), now())
ON CONFLICT (assignment_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. KPI Goal Templates
-- ---------------------------------------------------------------------------

INSERT INTO pms.kpi_goal_templates (
    template_id, position_id, company_id, status, current_version, published_by, published_at, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000041',
   '00000000-0000-0000-0000-000000000011',
   gen_random_uuid(),
   'published', 1,
   '00000000-0000-0000-0000-000000000022', now(), now(), now())
ON CONFLICT (template_id) DO NOTHING;

INSERT INTO pms.kpi_template_versions (version_id, template_id, version, frozen_at, created_by, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000051',
   '00000000-0000-0000-0000-000000000041', 1, now(),
   '00000000-0000-0000-0000-000000000022', now())
ON CONFLICT (version_id) DO NOTHING;

INSERT INTO pms.kpi_indicators (
    indicator_id, version_id, name, description, unit, target, direction, weight,
    score_target_met, score_below_target, use_for_scoring
)
VALUES
  ('00000000-0000-0000-0000-000000000061',
   '00000000-0000-0000-0000-000000000051',
   'Completed milestones', 'Milestones finished within the cycle', 'count', 4, 'higher_is_better', 60.00,
   4, 2, true),
  ('00000000-0000-0000-0000-000000000062',
   '00000000-0000-0000-0000-000000000051',
   'Production defects', 'Defects found in released builds', 'count', 2, 'lower_is_better', 40.00,
   4, 2, true)
ON CONFLICT (indicator_id) DO NOTHING;

INSERT INTO pms.kpi_indicator_scales (scale_id, indicator_id, lower_bound, upper_bound, score)
VALUES
  ('00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000061', 0, 1, 1),
  ('00000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000061', 2, 3, 3),
  ('00000000-0000-0000-0000-000000000073', '00000000-0000-0000-0000-000000000061', 4, NULL, 5),
  ('00000000-0000-0000-0000-000000000074', '00000000-0000-0000-0000-000000000062', 0, 1, 5),
  ('00000000-0000-0000-0000-000000000075', '00000000-0000-0000-0000-000000000062', 2, NULL, 2)
ON CONFLICT (scale_id) DO NOTHING;

INSERT INTO pms.kpi_indicator_matrix_rows (row_id, indicator_id, row_label)
VALUES
  ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000061', 'Below target'),
  ('00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000061', 'At target')
ON CONFLICT (row_id) DO NOTHING;

INSERT INTO pms.kpi_indicator_matrix_columns (col_id, indicator_id, col_label)
VALUES
  ('00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000061', 'Q1'),
  ('00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000061', 'Q2')
ON CONFLICT (col_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Behavioral Assessment Templates
-- ---------------------------------------------------------------------------

INSERT INTO pms.behavioral_templates (
    template_id, company_id, status, current_version, published_by, published_at, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-0000-000000000001',
   'published', 1,
   '00000000-0000-0000-0000-000000000022', now(), now(), now())
ON CONFLICT (template_id) DO NOTHING;

INSERT INTO pms.behavioral_template_versions (version_id, template_id, version, frozen_at, created_by, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000111',
   '00000000-0000-0000-0000-000000000101', 1, now(),
   '00000000-0000-0000-0000-000000000022', now())
ON CONFLICT (version_id) DO NOTHING;

INSERT INTO pms.behavioral_sections (section_id, version_id, title, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000121', '00000000-0000-0000-0000-000000000111', 'Collaboration', 1),
  ('00000000-0000-0000-0000-000000000122', '00000000-0000-0000-0000-000000000111', 'Ownership', 2)
ON CONFLICT (section_id) DO NOTHING;

INSERT INTO pms.behavioral_questions (
    question_id, section_id, prompt, question_type, is_required, allow_not_observed, sort_order
)
VALUES
  ('00000000-0000-0000-0000-000000000131',
   '00000000-0000-0000-0000-000000000121',
   'Communicates progress clearly and on time', 'rating_scale', true, true, 1),
  ('00000000-0000-0000-0000-000000000132',
   '00000000-0000-0000-0000-000000000122',
   'Owns outcomes from start to finish', 'rating_scale', true, true, 1)
ON CONFLICT (question_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Review Cycles
-- ---------------------------------------------------------------------------

INSERT INTO pms.cycles (
    cycle_id, company_id, name, review_type, state,
    evaluation_start, evaluation_end, assessment_start, verification_deadline,
    activation_date, goals_weight, behavioral_weight, anonymity_threshold,
    idempotency_key, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000141',
   gen_random_uuid(),
   'CY2026-Q4', 'standard', 'active',
   '2026-11-04', '2026-12-31', now(), now() + interval '14 days',
   '2026-11-04', 0.50, 0.50, 5,
   'CYC-KEY-001', now(), now())
ON CONFLICT (cycle_id) DO NOTHING;

INSERT INTO pms.cycle_participants (
    participant_id, cycle_id, employee_id, frozen_position_id,
    kpi_version_id, behavioral_version_id, created_at
)
VALUES
  ('00000000-0000-0000-0000-000000000151',
   '00000000-0000-0000-0000-000000000141',
   '00000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000051',
   '00000000-0000-0000-0000-000000000111',
   now())
ON CONFLICT (participant_id) DO NOTHING;

INSERT INTO pms.cycle_stages (stage_id, cycle_id, perspective, evaluator_role, sort_order, deadline)
VALUES
  ('00000000-0000-0000-0000-000000000161',
   '00000000-0000-0000-0000-000000000141', 'self', 'employee', 1, now() + interval '7 days'),
  ('00000000-0000-0000-0000-000000000162',
   '00000000-0000-0000-0000-000000000141', 'manager', 'engineering_manager', 2, now() + interval '10 days'),
  ('00000000-0000-0000-0000-000000000163',
   '00000000-0000-0000-0000-000000000141', 'hr', 'hr_officer', 3, now() + interval '14 days')
ON CONFLICT (stage_id) DO NOTHING;

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
   '00000000-0000-0000-0000-000000000021', now(), now(), now(), now(), now())
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

-- ---------------------------------------------------------------------------
-- 9. 202 Files
-- ---------------------------------------------------------------------------

INSERT INTO pms.journal_entries (
    entry_id, employee_id, author_id, company_id, entry_date, entry_type,
    title, description, cycle_id, created_at
)
VALUES
  ('00000000-0000-0000-0000-000000000221',
   '00000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000021',
   gen_random_uuid(),
   '2026-11-04', 'progress',
   'Feature release', 'Shipped the performance dashboard to production.',
   '00000000-0000-0000-0000-000000000141', now())
ON CONFLICT (entry_id) DO NOTHING;

INSERT INTO pms.nte_notices (
    notice_id, employee_id, company_id, category, subject, body,
    explanation_deadline, incident_date, incident_reference, status,
    explanation_text, explanation_submitted_at, early_close_reason, cancel_reason,
    issued_by, issued_at, closed_by, closed_at,
    created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000231',
   '00000000-0000-0000-0000-000000000021',
   gen_random_uuid(),
   'conduct',
   'Unapproved overtime',
   'You logged two days of overtime without prior approval.',
   '2026-11-20', '2026-11-01', 'INC-2026-0141', 'issued',
   NULL, NULL, NULL, NULL,
   '00000000-0000-0000-0000-000000000023', now(), NULL, NULL, now(), now())
ON CONFLICT (notice_id) DO NOTHING;

INSERT INTO pms.nte_read_receipts (receipt_id, notice_id, employee_id, opened_at)
VALUES
  ('00000000-0000-0000-0000-000000000241',
   '00000000-0000-0000-0000-000000000231',
   '00000000-0000-0000-0000-000000000021', now())
ON CONFLICT (receipt_id) DO NOTHING;

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
   gen_random_uuid(),
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

-- ---------------------------------------------------------------------------
-- 11. Operational Goals and Milestones
-- ---------------------------------------------------------------------------

INSERT INTO pms.operational_goals (
    goal_id, owner_id, creator_id, company_id, name, description, category,
    cycle_id, start_date, due_date, progress_percent, tracking_mode,
    status, version, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000022',
   gen_random_uuid(),
   'Adopt PMS', 'Adopt PMS across the Engineering department.',
   'delivery', '00000000-0000-0000-0000-000000000141',
   '2026-11-04', '2026-12-15', 40.00, 'milestone',
   'active', 1, now(), now())
ON CONFLICT (goal_id) DO NOTHING;

INSERT INTO pms.goal_milestones (
    milestone_id, goal_id, title, due_date, done, completed_at,
    status, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000311',
   '00000000-0000-0000-0000-000000000301',
   'Draft rollout plan', '2026-11-15', true, now(),
   'completed', now(), now()),
  ('00000000-0000-0000-0000-000000000312',
   '00000000-0000-0000-0000-000000000301',
   'Complete pilot team', '2026-12-01', false, NULL,
   'pending', now(), now())
ON CONFLICT (milestone_id) DO NOTHING;

INSERT INTO pms.goal_progress_updates (
    update_id, goal_id, actor_id, progress_percent, comment,
    milestone_snapshot_json, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000321',
   '00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000021',
   40.00,
   'Rollout plan drafted and circulated.',
   jsonb_build_array(
     jsonb_build_object('title', 'Draft rollout plan', 'done', true),
     jsonb_build_object('title', 'Complete pilot team', 'done', false)
   ),
   now())
ON CONFLICT (update_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. Notifications
-- ---------------------------------------------------------------------------

INSERT INTO pms.notifications (
    notification_id, recipient_id, source_type, source_id, message,
    read_at, created_at
)
VALUES
  ('00000000-0000-0000-0000-000000000331',
   '00000000-0000-0000-0000-000000000021',
   'nte',
   '00000000-0000-0000-0000-000000000231',
   'You have a new Notice of Explanation: Unapproved overtime.',
   NULL, now()),
  ('00000000-0000-0000-0000-000000000332',
   '00000000-0000-0000-0000-000000000022',
   'assignment',
   '00000000-0000-0000-0000-000000000201',
   'You have a new evaluation to complete: CY2026-Q4 self-assessment.',
   now(), now())
ON CONFLICT (notification_id) DO NOTHING;

INSERT INTO pms.notification_preferences (employee_id, review_notifications_enabled)
VALUES
  ('00000000-0000-0000-0000-000000000021', true),
  ('00000000-0000-0000-0000-000000000022', true),
  ('00000000-0000-0000-0000-000000000023', true)
ON CONFLICT (employee_id) DO NOTHING;

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

-- ---------------------------------------------------------------------------
-- 14. Sample user (auth)
-- Lives in public schema so the TypeORM entity @Entity({ name: 'users' })
-- picks it up without a schema prefix on the connection.
-- Password: "admin123"
-- Hash generated with bcrypt (cost 10).
-- ---------------------------------------------------------------------------

INSERT INTO public.users (id, email, password, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000351',
   'admin@mayon.com',
   '$2b$10$fDwwanfVoBqSFZ9GtGiseO3l5S0WypqInW1pkk8rnhQwIFQU.eHpu',
   now(), now())
ON CONFLICT (id) DO NOTHING;

COMMIT;
