-- Development fixtures only. Load after schema.sql in an isolated demo database.
-- Stable fixture IDs preserve cross-module references. No login accounts are seeded.

BEGIN;
\ir seeds/identity-and-directory.sql
\ir seeds/manager-assignments.sql
\ir seeds/kpi-goals.sql
\ir seeds/behavioral-assessments.sql
\ir seeds/review-cycles.sql
\ir seeds/kpi-accomplishments.sql
\ir seeds/evaluator-assignments.sql
\ir seeds/202-files.sql
\ir seeds/pip.sql
\ir seeds/operational-goals.sql
\ir seeds/notifications.sql
\ir seeds/audit.sql
COMMIT;
