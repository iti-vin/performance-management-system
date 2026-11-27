-- Expand step for result visibility: who reads the released results of a cycle.
--
-- It only creates a table. It changes no row, and it reads no other schema.
-- Running it again changes nothing more. Run it before a release, or a read of released results.
--
--   psql "<your connection>" -v ON_ERROR_STOP=1 -f packages/database/migrations/2026-11-27-result-visibility.sql

BEGIN;

-- Who reads the released results of a cycle, beside HR (PRD Cyc-001). A cycle with no row is
-- read by the employee and the manager.
CREATE TABLE IF NOT EXISTS pms.cycle_result_visibility (
    cycle_id         uuid PRIMARY KEY REFERENCES pms.cycles(cycle_id) ON DELETE CASCADE,
    employee_visible boolean NOT NULL DEFAULT true,
    manager_visible  boolean NOT NULL DEFAULT true
);

COMMIT;

-- Check after the commit. Expected: one row.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'pms' AND table_name = 'cycle_result_visibility';
