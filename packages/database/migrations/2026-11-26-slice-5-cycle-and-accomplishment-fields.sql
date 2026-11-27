-- Expand step for slice 5 of the sample alignment: a cycle gets a description and an
-- accomplishment deadline, and each actual result gets its own remarks.
--
-- It only adds nullable columns. It changes no row, and it reads no other schema.
-- Running it again changes nothing more. Run it before the backend that maps these columns.
--
--   psql "<your connection>" -v ON_ERROR_STOP=1 -f packages/database/migrations/2026-11-26-slice-5-cycle-and-accomplishment-fields.sql

BEGIN;

ALTER TABLE pms.cycles
    ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE pms.cycles
    ADD COLUMN IF NOT EXISTS accomplishment_deadline timestamptz;
ALTER TABLE pms.accomplishment_actuals
    ADD COLUMN IF NOT EXISTS remarks text;

COMMIT;

-- Check after the commit. Expected: three rows, each nullable (YES).
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'pms'
  AND (table_name, column_name) IN (
      ('cycles', 'description'),
      ('cycles', 'accomplishment_deadline'),
      ('accomplishment_actuals', 'remarks'))
ORDER BY table_name, column_name;
