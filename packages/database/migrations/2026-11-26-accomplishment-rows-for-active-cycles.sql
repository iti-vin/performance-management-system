-- Data step: a cycle that was launched before work records existed gets one draft accomplishment
-- for each participant, so the employee can report (PRD Cyc-006). A launch creates them itself now.
--
-- It changes no schema and no existing row. It covers active cycles where goals count, and
-- participants with a frozen KPI version. A participant with a record keeps it. Running it
-- again adds nothing. It needs PostgreSQL 13 or newer (gen_random_uuid).
--
--   psql "<your connection>" -v ON_ERROR_STOP=1 -f packages/database/migrations/2026-11-26-accomplishment-rows-for-active-cycles.sql

BEGIN;

INSERT INTO pms.accomplishments (
    accomplishment_id, participant_id, cycle_id, employee_id, status, created_at, updated_at
)
SELECT gen_random_uuid(), p.participant_id, p.cycle_id, p.employee_id, 'draft', now(), now()
FROM pms.cycle_participants AS p
JOIN pms.cycles AS c ON c.cycle_id = p.cycle_id
WHERE c.state = 'active'
  AND c.goals_weight > 0
  AND p.kpi_version_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM pms.accomplishments AS existing
      WHERE existing.participant_id = p.participant_id
  )
ON CONFLICT (participant_id) DO NOTHING;

COMMIT;

-- Check after the commit. Expected: for each active cycle, records equals participants.
SELECT c.name,
       count(p.participant_id) AS participants,
       count(a.accomplishment_id) AS records
FROM pms.cycles AS c
JOIN pms.cycle_participants AS p ON p.cycle_id = c.cycle_id
LEFT JOIN pms.accomplishments AS a ON a.participant_id = p.participant_id
WHERE c.state = 'active' AND c.goals_weight > 0
GROUP BY c.name
ORDER BY c.name;
