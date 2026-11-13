-- Development fixtures only. Defines versioned behavioral forms, sections, questions, and answer options.

-- ---------------------------------------------------------------------------
-- 5. Behavioral Assessment Templates
-- ---------------------------------------------------------------------------

INSERT INTO pms.behavioral_templates (
    template_id, company_id, status, current_version, published_by, published_at, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000101',
   1,
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
