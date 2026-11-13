-- Development fixtures only. Stores operational goals, milestone targets, and progress history.

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
   1,
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
