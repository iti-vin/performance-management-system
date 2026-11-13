// Fails when an enum in src/domain drifts from a CHECK constraint in
// packages/database/schema.sql. Run after `pnpm build:packages`.
import assert from "node:assert/strict";
import { test } from "node:test";

import * as shared from "../dist/index.js";
import { readSchema } from "../../database/sql-files.mjs";

const schemaSql = readSchema();

// [table, column, exported constant, values the DTOs keep that the CHECK does not list]
const PAIRS = [
  ["employees", "status", "EMPLOYEE_STATUSES", []],
  ["manager_assignments", "status", "MANAGER_ASSIGNMENT_STATUSES", []],
  ["kpi_goal_templates", "status", "TEMPLATE_VERSION_STATUSES", []],
  ["kpi_indicators", "direction", "KPI_DIRECTIONS", []],
  ["behavioral_questions", "question_type", "BEHAVIORAL_QUESTION_TYPES", []],
  ["cycles", "review_type", "REVIEW_TYPES", []],
  ["cycles", "state", "CYCLE_STATUSES", []],
  ["cycle_stages", "perspective", "EVALUATOR_TYPES", []],
  ["accomplishments", "status", "ACCOMPLISHMENT_STATUSES", []],
  ["assignments", "state", "EVALUATION_STATUSES", []],
  ["assignment_responses", "status", "RESPONSE_STATUSES", []],
  ["nte_notices", "status", "NTE_STATUSES", []],
  ["pip_plans", "origin", "PIP_ORIGINS", []],
  ["pip_plans", "state", "PIP_STATUSES", []],
  ["pip_weeks", "status", "PIP_WEEK_STATUSES", []],
  ["pip_week_updates", "status", "PIP_WEEK_UPDATE_STATUSES", []],
  ["pip_week_assessments", "outcome", "PIP_WEEK_RESULTS", []],
  ["operational_goals", "category", "GOAL_CATEGORIES", []],
  ["operational_goals", "tracking_mode", "GOAL_TRACKING_MODES", []],
  ["operational_goals", "status", "GOAL_STATUSES", []],
  ["goal_milestones", "status", "GOAL_MILESTONE_STATUSES", []],
  ["notifications", "source_type", "NOTIFICATION_SOURCE_TYPES", []],
];

function checkValues(table, column) {
  const tableStart = schemaSql.indexOf(
    `CREATE TABLE IF NOT EXISTS pms.${table} (`,
  );
  assert.ok(tableStart >= 0, `table pms.${table} not found in schema.sql`);
  const rest = schemaSql.slice(tableStart);
  const next = rest.indexOf("CREATE TABLE", 10);
  const body = next === -1 ? rest : rest.slice(0, next);
  const match = body.match(
    new RegExp(
      `${column}\\s+text[^\\n]*CHECK\\s*\\(\\s*${column}\\s+IN\\s*\\(([^)]*)\\)`,
    ),
  );
  assert.ok(match, `CHECK on pms.${table}.${column} not found`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

for (const [table, column, constant, extra] of PAIRS) {
  test(`${constant} matches pms.${table}.${column}`, () => {
    const fromDb = checkValues(table, column);
    const expected = [...fromDb, ...extra].sort();
    const actual = [...shared[constant]].sort();
    assert.deepEqual(actual, expected);
  });
}
