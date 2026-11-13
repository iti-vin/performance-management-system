-- Development fixtures only. Defines versioned KPI templates, indicators, scoring ranges, and matrix axes.

-- ---------------------------------------------------------------------------
-- 4. KPI Goal Templates
-- ---------------------------------------------------------------------------

INSERT INTO pms.kpi_goal_templates (
    template_id, position_id, company_id, status, current_version, published_by, published_at, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000041',
   11,
   1,
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
