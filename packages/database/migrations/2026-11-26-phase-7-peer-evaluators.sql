-- Expand step for phase 7: the peers that HR names for one participant.
--
-- It only creates a table and an index. It changes no row, and it reads no other schema.
-- Running it again changes nothing more. Run it before the backend that maps this table.
--
--   psql "<your connection>" -v ON_ERROR_STOP=1 -f packages/database/migrations/2026-11-26-phase-7-peer-evaluators.sql

BEGIN;

-- The peers that HR names for one participant (PRD Cyc-003). A launch turns each into an
-- assignment of the peer stage. A replaced draft removes its participants, and their peers with them.
CREATE TABLE IF NOT EXISTS pms.cycle_peer_evaluators (
    participant_id uuid NOT NULL REFERENCES pms.cycle_participants(participant_id) ON DELETE CASCADE,
    evaluator_id   uuid NOT NULL REFERENCES pms.employees(guid),
    created_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (participant_id, evaluator_id)
);

-- The primary key covers participant lookups. Index the other foreign key.
CREATE INDEX IF NOT EXISTS cycle_peer_evaluators_evaluator_idx
    ON pms.cycle_peer_evaluators (evaluator_id);

COMMIT;

-- Check after the commit. Expected: two rows. The first table comes from this script. The
-- second must already exist: phase 5 saves its results there.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'pms'
  AND table_name IN ('cycle_peer_evaluators', 'evaluation_snapshots')
ORDER BY table_name;
