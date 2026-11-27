-- Expand step: a cycle stage can name the person who evaluates it.
-- The self stage uses the participant and the manager stage uses the applied manager of the
-- participant, both found when the cycle launches. The HR stage (and later the peer and upward
-- stages) needs a stored person, so the column is nullable.
--
-- It only adds. It drops nothing, and it reads no other schema.
-- A table that does not exist is skipped. Running it again changes nothing more.
-- Run it before the new backend starts: the new entity maps this column.
--
--   psql "<your connection>" -v ON_ERROR_STOP=1 -f packages/database/migrations/2026-11-25-cycle-stage-evaluator.sql

BEGIN;

DO $$
BEGIN
    IF to_regclass('pms.cycle_stages') IS NULL THEN
        RAISE NOTICE 'pms.cycle_stages does not exist: nothing to change';
        RETURN;
    END IF;

    ALTER TABLE pms.cycle_stages
        ADD COLUMN IF NOT EXISTS evaluator_id uuid REFERENCES pms.employees(guid);
END $$;

COMMIT;

-- Check after the commit: the new column, nullable.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'pms' AND table_name = 'cycle_stages'
  AND column_name = 'evaluator_id';
