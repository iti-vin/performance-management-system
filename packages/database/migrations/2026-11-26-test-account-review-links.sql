-- Data step for the development databases: the test accounts `user` and `manager` can take part in a review.
-- `user` (employee 27) gets the position Software Engineer, which a published KPI goal template covers,
-- and `manager` (employee 26) as the applied performance manager from 2026-11-26.
--
-- It changes no schema. It fills an empty position only, and it adds a manager only when the employee
-- has no applied one, so it replaces nothing. A database whose ids and GUIDs differ from the seeds is
-- left alone: the check at the end then shows it. Running it again changes nothing more.
--
--   psql "<your connection>" -v ON_ERROR_STOP=1 -f packages/database/migrations/2026-11-26-test-account-review-links.sql

BEGIN;

UPDATE pms.employees
SET position = 'Software Engineer', updated_at = now()
WHERE id = 27
  AND guid = '08bd7bb2-faa4-46ae-b7c1-cc20664d7331'
  AND company = 'Mayon Consolidated Inc.'
  AND position IS NULL;

INSERT INTO pms.manager_assignments (
    assignment_id, employee_id, manager_id, company, effective_date, status,
    previous_manager_id, apply_reason, applied_at, idempotency_key, created_at, updated_at
)
SELECT '00000000-0000-0000-0000-000000000032', worker.guid, boss.guid, worker.company,
       DATE '2026-11-26', 'applied', NULL, 'Test accounts for the review modules', now(),
       'MGR-KEY-002', now(), now()
FROM pms.employees AS worker
JOIN pms.employees AS boss
  ON boss.id = 26
 AND boss.guid = 'ce58dfdf-e0bf-47d8-9060-3dc10d732d07'
 AND boss.company = worker.company
WHERE worker.id = 27
  AND worker.guid = '08bd7bb2-faa4-46ae-b7c1-cc20664d7331'
  AND worker.company = 'Mayon Consolidated Inc.'
  AND NOT EXISTS (
      SELECT 1 FROM pms.manager_assignments AS current_link
      WHERE current_link.employee_id = worker.guid AND current_link.status = 'applied'
  )
ON CONFLICT (assignment_id) DO NOTHING;

COMMIT;

-- Check after the commit. Expected: one row with position Software Engineer,
-- manager Iging ManagerDotTech, status applied, effective_date 2026-11-26.
SELECT worker.id, worker.position,
       boss.first_name || ' ' || boss.last_name AS manager,
       link.status, link.effective_date
FROM pms.employees AS worker
LEFT JOIN pms.manager_assignments AS link ON link.employee_id = worker.guid AND link.status = 'applied'
LEFT JOIN pms.employees AS boss ON boss.guid = link.manager_id
WHERE worker.id = 27;
