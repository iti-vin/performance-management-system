import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readSchema, readSeed } from "./sql-files.mjs";

test("schema and seed load their modules in dependency order", () => {
  const schema = readSchema();
  const seed = readSeed();
  for (const table of ["employees", "kpi_goal_templates", "kpi_indicators", "cycles", "evaluation_snapshots", "nte_notices", "pip_plans"]) {
    assert.match(schema, new RegExp("CREATE TABLE IF NOT EXISTS pms\\." + table + "\\s*\\("));
  }
  assert.ok(schema.indexOf("pms.employees (") < schema.indexOf("pms.manager_assignments ("));
  assert.ok(schema.indexOf("pms.evaluation_snapshots (") < schema.indexOf("pms.pip_plans ("));
  assert.match(seed, /INSERT INTO pms\.employees/);
  assert.match(seed, /ON CONFLICT/);
  assert.doesNotMatch(seed, /INSERT INTO public\.users/);
});

test("employee GUIDs are valid foreign-key targets", () => {
  const employees = readFileSync(new URL("./schema/employees.sql", import.meta.url), "utf8");
  assert.match(employees, /UNIQUE\s*\(guid\)/);
});

test("the results module loads before PIP and requires finalization before release", () => {
  const results = readFileSync(new URL("./schema/evaluation-results.sql", import.meta.url), "utf8");
  const schema = readSchema();
  assert.match(results, /CHECK\s*\(released_at IS NULL OR \(finalized_at IS NOT NULL AND released_at >= finalized_at\)\)/);
  assert.ok(schema.indexOf("pms.evaluation_snapshots (") < schema.indexOf("pms.pip_plans ("));
});

test("KPI actuals allow one value per indicator in each accomplishment", () => {
  const sql = readFileSync(new URL("./schema/kpi-accomplishments.sql", import.meta.url), "utf8");
  assert.match(sql, /UNIQUE\s*\(accomplishment_id, indicator_id\)/);
});
