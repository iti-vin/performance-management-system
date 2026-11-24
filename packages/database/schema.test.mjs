import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readSchema, readSeed } from "./sql-files.mjs";

test("schema and seed load their modules in dependency order", () => {
  const schema = readSchema();
  const seed = readSeed();
  for (const table of [
    "employees",
    "kpi_goal_templates",
    "kpi_indicators",
    "cycles",
    "evaluation_snapshots",
    "nte_notices",
    "pip_plans",
  ]) {
    assert.match(
      schema,
      new RegExp("CREATE TABLE IF NOT EXISTS pms\\." + table + "\\s*\\("),
    );
  }
  assert.ok(
    schema.indexOf("pms.employees (") <
      schema.indexOf("pms.manager_assignments ("),
  );
  assert.ok(
    schema.indexOf("pms.evaluation_snapshots (") <
      schema.indexOf("pms.pip_plans ("),
  );
  assert.match(seed, /INSERT INTO pms\.employees/);
  assert.match(seed, /ON CONFLICT/);
  assert.doesNotMatch(seed, /INSERT INTO public\.users/);
});

test("employee GUIDs are valid foreign-key targets", () => {
  const employees = readFileSync(
    new URL("./schema/employees.sql", import.meta.url),
    "utf8",
  );
  assert.match(employees, /UNIQUE\s*\(guid\)/);
});

test("the results module loads before PIP and requires finalization before release", () => {
  const results = readFileSync(
    new URL("./schema/evaluation-results.sql", import.meta.url),
    "utf8",
  );
  const schema = readSchema();
  assert.match(
    results,
    /CHECK\s*\(released_at IS NULL OR \(finalized_at IS NOT NULL AND released_at >= finalized_at\)\)/,
  );
  assert.ok(
    schema.indexOf("pms.evaluation_snapshots (") <
      schema.indexOf("pms.pip_plans ("),
  );
});

test("a template stores an optional name and description", () => {
  const sql = readFileSync(
    new URL("./schema/kpi-goals.sql", import.meta.url),
    "utf8",
  );
  const table =
    sql.match(
      /CREATE TABLE IF NOT EXISTS pms\.kpi_goal_templates \(([\s\S]*?)\r?\n\);/,
    )?.[1] ?? "";
  assert.match(table, /^\s+name\s+text,\r?$/m);
  assert.match(table, /^\s+description\s+text,\r?$/m);
});

function table(sql, name) {
  return (
    sql.match(
      new RegExp(
        "CREATE TABLE IF NOT EXISTS pms\\." +
          name +
          " \\(([\\s\\S]*?)\\r?\\n\\);",
      ),
    )?.[1] ?? ""
  );
}

test("an indicator stores its matrix kind, title and threshold type", () => {
  const sql = readFileSync(
    new URL("./schema/kpi-goals.sql", import.meta.url),
    "utf8",
  );
  const indicators = table(sql, "kpi_indicators");
  assert.match(
    indicators,
    /matrix_kind\s+text NOT NULL DEFAULT 'none' CHECK \(matrix_kind IN \('none','table','scale'\)\)/,
  );
  assert.match(indicators, /matrix_title\s+text,/);
  assert.match(
    indicators,
    /scale_bound\s+text CHECK \(scale_bound IN \('minimum','maximum'\)\)/,
  );
  assert.match(indicators, /use_for_scoring\s+boolean NOT NULL DEFAULT false/);
});

test("a scale row is one threshold with a label and a decimal score", () => {
  const sql = readFileSync(
    new URL("./schema/kpi-goals.sql", import.meta.url),
    "utf8",
  );
  const scales = table(sql, "kpi_indicator_scales");
  assert.match(scales, /lower_bound\s+numeric,/);
  assert.doesNotMatch(scales, /lower_bound\s+numeric NOT NULL/);
  assert.match(scales, /label\s+text/);
  assert.match(
    scales,
    /score\s+numeric\(3,2\) NOT NULL CHECK \(score BETWEEN 1 AND 5\)/,
  );
  assert.match(scales, /CHECK \(lower_bound IS NULL OR upper_bound IS NULL\)/);
});

test("a reference table keeps row and column order and one cell per row and column", () => {
  const sql = readFileSync(
    new URL("./schema/kpi-goals.sql", import.meta.url),
    "utf8",
  );
  assert.match(
    table(sql, "kpi_indicator_matrix_rows"),
    /position\s+integer NOT NULL DEFAULT 0/,
  );
  assert.doesNotMatch(
    table(sql, "kpi_indicator_matrix_rows"),
    /row_label\s+text NOT NULL/,
  );
  assert.match(
    table(sql, "kpi_indicator_matrix_columns"),
    /position\s+integer NOT NULL DEFAULT 0/,
  );
  const cells = table(sql, "kpi_indicator_matrix_cells");
  assert.match(
    cells,
    /row_id\s+uuid NOT NULL REFERENCES pms\.kpi_indicator_matrix_rows\(row_id\)/,
  );
  assert.match(
    cells,
    /col_id\s+uuid NOT NULL REFERENCES pms\.kpi_indicator_matrix_columns\(col_id\)/,
  );
  assert.match(cells, /value\s+text NOT NULL/);
  assert.match(cells, /PRIMARY KEY \(row_id, col_id\)/);
});

test("indicator scores allow decimals within 1 to 5", () => {
  const sql = readFileSync(
    new URL("./schema/kpi-goals.sql", import.meta.url),
    "utf8",
  );
  assert.match(
    sql,
    /score_target_met\s+numeric\(3,2\) NOT NULL CHECK \(score_target_met BETWEEN 1 AND 5\)/,
  );
  assert.match(
    sql,
    /score_below_target\s+numeric\(3,2\) NOT NULL CHECK \(score_below_target BETWEEN 1 AND 5\)/,
  );
});

test("KPI actuals allow one value per indicator in each accomplishment", () => {
  const sql = readFileSync(
    new URL("./schema/kpi-accomplishments.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /UNIQUE\s*\(accomplishment_id, indicator_id\)/);
});

test("the employee and user seeds load in foreign-key order and match the backend roles", () => {
  const seed = readSeed();
  const users = readFileSync(new URL("./schema/users.sql", import.meta.url), "utf8");

  assert.ok(users.indexOf("pms.user_role (") < users.indexOf("pms.users ("));
  assert.match(users, /user_role_id\s+bigint NOT NULL REFERENCES pms\.user_role\(id\)/);

  assert.ok(seed.indexOf("INSERT INTO pms.employees") < seed.indexOf("INSERT INTO pms.users"));
  assert.ok(seed.indexOf("INSERT INTO pms.user_role") < seed.indexOf("INSERT INTO pms.users"));
  // ADMIN_ROLE_ID in the backend is "1"; the codes are ROLE_CODES in @pms/shared-types.
  assert.match(seed, /\(1, 'ADMIN',/);
  assert.match(seed, /\(2, 'MANAGER',/);
  assert.match(seed, /\(3, 'USER',/);
  // Other seeds refer to these employee GUIDs.
  for (const guid of ["021", "022", "023"]) {
    assert.match(seed, new RegExp("'00000000-0000-0000-0000-000000000" + guid + "', " + Number(guid)));
  }
  // Seeded accounts store bcrypt hashes, never a plain password.
  assert.match(seed, /'\$2[aby]\$10\$[./A-Za-z0-9]{53}'/);
  assert.doesNotMatch(seed, /INSERT INTO pms\.users \([^)]*\bpassword\b[^_]/);
});
