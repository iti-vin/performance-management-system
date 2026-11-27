-- Expand step for decision D5: whether the reviewer of a later stage reads the answers of an
-- earlier stage.
--
-- It only adds one column with the default false, so a running cycle opens nothing by itself
-- and an old backend keeps working. It changes no stored value, and it reads no other schema.
-- Running it again changes nothing more. It needs 2026-11-27-result-visibility.sql first.
--
--   psql "<your connection>" -v ON_ERROR_STOP=1 -f packages/database/migrations/2026-11-27-earlier-answers-visibility.sql

BEGIN;

ALTER TABLE pms.cycle_result_visibility
    ADD COLUMN IF NOT EXISTS earlier_answers_visible boolean NOT NULL DEFAULT false;

COMMIT;

-- Check after the commit. Expected: one row, boolean, NO, false.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'pms' AND table_name = 'cycle_result_visibility' AND column_name = 'earlier_answers_visible';
