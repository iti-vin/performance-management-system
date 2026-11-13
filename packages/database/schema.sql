-- PostgreSQL bootstrap for the model in docs/database-design.md.
-- Load modules in dependency order. Use psql -f or the package initializer.
-- Existing databases require explicit migrations for changes to table definitions.

BEGIN;
CREATE SCHEMA IF NOT EXISTS pms;
\ir schema/identity-and-directory.sql
\ir schema/employees.sql
\ir schema/manager-assignments.sql
\ir schema/kpi-goals.sql
\ir schema/behavioral-assessments.sql
\ir schema/review-cycles.sql
\ir schema/kpi-accomplishments.sql
\ir schema/evaluator-assignments.sql
\ir schema/evaluation-results.sql
\ir schema/202-files.sql
\ir schema/pip.sql
\ir schema/operational-goals.sql
\ir schema/notifications.sql
\ir schema/audit.sql
\ir schema/users.sql
COMMIT;
