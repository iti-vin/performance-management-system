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
  const users = readFileSync(
    new URL("./schema/users.sql", import.meta.url),
    "utf8",
  );

  assert.ok(users.indexOf("pms.user_role (") < users.indexOf("pms.users ("));
  assert.match(
    users,
    /user_role_id\s+bigint NOT NULL REFERENCES pms\.user_role\(id\)/,
  );

  assert.ok(
    seed.indexOf("INSERT INTO pms.employees") <
      seed.indexOf("INSERT INTO pms.users"),
  );
  assert.ok(
    seed.indexOf("INSERT INTO pms.user_role") <
      seed.indexOf("INSERT INTO pms.users"),
  );
  // ADMIN_ROLE_ID in the backend is "1"; the codes are ROLE_CODES in @pms/shared-types.
  assert.match(seed, /\(1, 'ADMIN',/);
  assert.match(seed, /\(2, 'MANAGER',/);
  assert.match(seed, /\(3, 'USER',/);
  // Other seeds refer to these employee GUIDs. Employee 21 is a real person now (see the next test).
  for (const guid of ["022", "023"]) {
    assert.match(
      seed,
      new RegExp(
        "'00000000-0000-0000-0000-000000000" + guid + "', " + Number(guid),
      ),
    );
  }
  // Seeded accounts store bcrypt hashes, never a plain password.
  assert.match(seed, /'\$2[aby]\$10\$[./A-Za-z0-9]{53}'/);
  assert.doesNotMatch(seed, /INSERT INTO pms\.users \([^)]*\bpassword\b[^_]/);
});

test("the seeds carry the real accounts of the team databases, and no seed points at a placeholder employee", () => {
  const seed = readSeed();

  // Employee 21 is Iging DotTech, with the real GUID. The old placeholder GUID is gone from every seed.
  assert.match(seed, /'284ddc9e-ebe4-468d-945f-fb18af72e622', 21, 'ITI-001'/);
  assert.doesNotMatch(seed, /00000000-0000-0000-0000-000000000021/);

  // Employees 21 to 27 exist: 22 and 23 are the fixtures without a login, 24 to 27 are the real accounts.
  const employeeIds = [
    ...seed.matchAll(/^\s+\('[0-9a-f-]{36}', (\d+), '/gm),
  ].map((m) => Number(m[1]));
  assert.deepEqual(employeeIds, [21, 22, 23, 24, 25, 26, 27]);

  // The fixture Ramon Reyes is regular in the team databases (checked 2026-11-25), not probationary.
  assert.match(
    seed,
    /'Human Resources Officer', NULL, 'Human Resources', 'Main', 'regular', 'active'/,
  );
  assert.doesNotMatch(seed, /'probationary'/);

  // Every login: user id, employee id, role id, username. Ids and roles follow the team database.
  const logins = [
    ...seed.matchAll(
      /^\s+\((\d+), (\d+), (\d+), '[^']+', '([^']+)', '\$2[aby]\$10\$/gm,
    ),
  ].map((m) => [Number(m[1]), Number(m[2]), Number(m[3]), m[4]]);
  assert.deepEqual(logins, [
    [1, 25, 1, "admin"],
    [4, 21, 1, "admin001"],
    [8, 26, 2, "manager"],
    [9, 27, 3, "user"],
    [10, 24, 1, "lebronjames023"],
  ]);
  for (const [, employeeId] of logins) {
    assert.ok(
      employeeIds.includes(employeeId),
      "login points at employee " + employeeId,
    );
  }
});

test("every REFERENCES target is a table that schema.sql creates", () => {
  const schema = readSchema();
  const created = new Set(
    [...schema.matchAll(/CREATE TABLE IF NOT EXISTS (pms\.\w+)/g)].map(
      (m) => m[1],
    ),
  );
  const missing = [
    ...new Set(
      [...schema.matchAll(/REFERENCES (pms\.\w+)\s*\(/g)]
        .map((m) => m[1])
        .filter((target) => !created.has(target)),
    ),
  ];
  assert.deepEqual(missing, []);
});

test("the company and position migration only expands: it drops no column and reads no public table", () => {
  const sql = readFileSync(
    new URL(
      "./migrations/2026-11-24-kpi-company-position-text.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(sql, /DROP\s+COLUMN/i);
  assert.doesNotMatch(sql, /DROP\s+TABLE/i);
  assert.doesNotMatch(sql, /\bpublic\./i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS company text/);
  assert.match(sql, /position/);
});

test("the behavioral template details migration only adds columns and checks", () => {
  const sql = readFileSync(
    new URL(
      "./migrations/2026-11-24-behavioral-template-details.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(sql, /DROP\s+(COLUMN|TABLE)/i);
  assert.doesNotMatch(sql, /\bpublic\./i);
  for (const column of ["name", "description", "category", "review_type"]) {
    assert.match(sql, new RegExp(`ADD COLUMN IF NOT EXISTS ${column} text`));
  }
  // The same code lists as schema/behavioral-assessments.sql, so a migrated database accepts the same values.
  const schema = readSchema();
  for (const list of [
    "'general_performance','self_assessment','manager_evaluation','peer_feedback','feedback_360','probationary_evaluation','others'",
    "'self','manager','peer','upward','hr','others'",
  ]) {
    assert.ok(schema.includes(list), "schema.sql lacks " + list);
    assert.ok(sql.includes(list), "the migration lacks " + list);
  }
});

test("a cycle stage names its evaluator person, and the migration only adds the column", () => {
  const schema = readSchema();
  const stages = schema.match(
    /CREATE TABLE IF NOT EXISTS pms\.cycle_stages \(([\s\S]*?)\n\);/,
  );
  assert.ok(stages, "schema.sql lacks pms.cycle_stages");
  assert.match(
    stages[1],
    /evaluator_id\s+uuid REFERENCES pms\.employees\(guid\)/,
  );

  const migration = readFileSync(
    new URL("./migrations/2026-11-25-cycle-stage-evaluator.sql", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(migration, /DROP\s+(COLUMN|TABLE)/i);
  assert.doesNotMatch(migration, /\bpublic\./i);
  assert.match(
    migration,
    /ADD COLUMN IF NOT EXISTS evaluator_id uuid REFERENCES pms\.employees\(guid\)/,
  );

  // The HR stage of the dev cycle names the HR officer. Self and manager stages derive their evaluator, so they stay NULL.
  const seed = readFileSync(
    new URL("./seeds/review-cycles.sql", import.meta.url),
    "utf8",
  );
  assert.match(seed, /INSERT INTO pms\.cycle_stages \([^)]*evaluator_id/);
  const hrStage = seed.match(/0{9}163'[\s\S]*?ON CONFLICT/);
  assert.ok(hrStage, "the seed lacks the HR stage");
  assert.ok(
    hrStage[0].includes("'00000000-0000-0000-0000-000000000023'"),
    "the HR stage names no evaluator",
  );
});

test("the test accounts can take part in a review: the user holds a position with a KPI template and has the manager as manager", () => {
  const user = "08bd7bb2-faa4-46ae-b7c1-cc20664d7331";
  const manager = "ce58dfdf-e0bf-47d8-9060-3dc10d732d07";
  const seed = readSeed();
  assert.match(
    seed,
    /'08bd7bb2-faa4-46ae-b7c1-cc20664d7331', 27, 'ITI-003', 'iging@userdotnet\.com', 'Iging', 'UserDotTech', 3,\s*'Mayon Consolidated Inc\.', 'Software Engineer',/,
  );
  assert.match(
    seed,
    /'08bd7bb2-faa4-46ae-b7c1-cc20664d7331',\s*'ce58dfdf-e0bf-47d8-9060-3dc10d732d07',\s*'Mayon Consolidated Inc\.',\s*'2026-11-26', 'applied'/,
  );

  const script = readFileSync(
    new URL("./migrations/2026-11-26-test-account-review-links.sql", import.meta.url),
    "utf8",
  );
  const statements = script.replace(/^\s*--.*$/gm, "");
  assert.match(statements, /^BEGIN;[\s\S]*^COMMIT;/m);
  // It fills what is empty and replaces nothing.
  assert.doesNotMatch(statements, /\b(DELETE|DROP|TRUNCATE|ALTER)\b/i);
  assert.doesNotMatch(statements, /\bpublic\./i);
  assert.equal(statements.match(/\bUPDATE\b/gi)?.length, 1);
  assert.match(statements, /SET position = 'Software Engineer'[\s\S]*?position IS NULL;/);
  assert.match(
    statements,
    /INSERT INTO pms\.manager_assignments[\s\S]*?NOT EXISTS[\s\S]*?status = 'applied'[\s\S]*?ON CONFLICT \(assignment_id\) DO NOTHING;/,
  );
  assert.ok(statements.includes(user) && statements.includes(manager), "the script names other accounts than the seeds");
});

test("an active cycle that was launched before work records existed gets one draft record per participant", () => {
  const script = readFileSync(
    new URL("./migrations/2026-11-26-accomplishment-rows-for-active-cycles.sql", import.meta.url),
    "utf8",
  );
  const statements = script.replace(/^\s*--.*$/gm, "");
  assert.match(statements, /^BEGIN;[\s\S]*^COMMIT;/m);
  assert.doesNotMatch(statements, /\b(UPDATE|DELETE|DROP|TRUNCATE|ALTER)\b/i);
  assert.doesNotMatch(statements, /\bpublic\./i);
  assert.match(statements, /INSERT INTO pms\.accomplishments[\s\S]*?'draft'[\s\S]*?FROM pms\.cycle_participants/);
  // Only an active cycle where goals count, and only a participant with a frozen KPI version.
  assert.match(statements, /WHERE c\.state = 'active'\s+AND c\.goals_weight > 0\s+AND p\.kpi_version_id IS NOT NULL/);
  // It replaces nothing, and a second run adds nothing.
  assert.match(statements, /AND NOT EXISTS \(\s*SELECT 1 FROM pms\.accomplishments[\s\S]*?participant_id = p\.participant_id\s*\)/);
  assert.match(statements, /ON CONFLICT \(participant_id\) DO NOTHING;/);
});

test("every indicator that a seeded submission names is a whole GUID", () => {
  const seed = readFileSync(new URL("./seeds/kpi-accomplishments.sql", import.meta.url), "utf8");
  const named = [...seed.matchAll(/'indicator_id', '([^']+)'/g)].map((match) => match[1]);
  assert.ok(named.length >= 2, "the seed names no indicator");
  for (const id of named) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  }
});

const SLICE_5 = [
  ["cycles", "description", "text", "review-cycles"],
  ["cycles", "accomplishment_deadline", "timestamptz", "review-cycles"],
  ["accomplishment_actuals", "remarks", "text", "kpi-accomplishments"],
];

test("a cycle has a description and an accomplishment deadline, and each actual result has remarks", () => {
  const script = readFileSync(new URL("./migrations/2026-11-26-slice-5-cycle-and-accomplishment-fields.sql", import.meta.url), "utf8");
  const statements = script.replace(/^\s*--.*$/gm, "");
  assert.match(statements, /^BEGIN;[\s\S]*^COMMIT;/m);
  // It only adds nullable columns: no data changes, and an old backend keeps working.
  assert.doesNotMatch(statements, /\b(UPDATE|DELETE|DROP|TRUNCATE|INSERT|NOT NULL)\b/i);
  assert.doesNotMatch(statements, /\bpublic\./i);
  for (const [table, column, type, file] of SLICE_5) {
    assert.match(statements, new RegExp(`ALTER TABLE pms\\.${table}[^;]*ADD COLUMN IF NOT EXISTS ${column}\\s+${type}\\b`), column);
    const schema = readFileSync(new URL(`./schema/${file}.sql`, import.meta.url), "utf8");
    const created = new RegExp(`CREATE TABLE IF NOT EXISTS pms\\.${table} \\(([\\s\\S]*?)\\n\\);`).exec(schema)?.[1] ?? "";
    assert.match(created, new RegExp(`^\\s*${column}\\s+${type}\\b`, "m"), `${table}.${column} in the schema file`);
  }
});

test("the peers that HR names have their own table, which a replaced draft clears", () => {
  const script = readFileSync(new URL("./migrations/2026-11-26-phase-7-peer-evaluators.sql", import.meta.url), "utf8");
  const schema = readFileSync(new URL("./schema/review-cycles.sql", import.meta.url), "utf8");
  const statements = script.replace(/^\s*--.*$/gm, "");
  assert.match(statements, /^BEGIN;[\s\S]*^COMMIT;/m);
  // It only creates: no data changes, and an old backend keeps working.
  assert.doesNotMatch(statements, /\b(UPDATE|DROP|TRUNCATE|INSERT|ALTER)\b|DELETE FROM/i);
  assert.doesNotMatch(statements, /\bpublic\./i);
  for (const [where, sql] of [["the migration", statements], ["the schema file", schema]]) {
    const table = /CREATE TABLE IF NOT EXISTS pms\.cycle_peer_evaluators \(([\s\S]*?)\n\);/.exec(sql)?.[1] ?? "";
    assert.match(table, /participant_id\s+uuid NOT NULL REFERENCES pms\.cycle_participants\(participant_id\) ON DELETE CASCADE/, where);
    assert.match(table, /evaluator_id\s+uuid NOT NULL REFERENCES pms\.employees\(guid\)/, where);
    assert.match(table, /PRIMARY KEY \(participant_id, evaluator_id\)/, where);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS cycle_peer_evaluators_evaluator_idx\s+ON pms\.cycle_peer_evaluators \(evaluator_id\);/, where);
  }
});

test("result visibility has its own table, so only release and results wait for the script", () => {
  const script = readFileSync(new URL("./migrations/2026-11-27-result-visibility.sql", import.meta.url), "utf8");
  const schema = readFileSync(new URL("./schema/evaluation-results.sql", import.meta.url), "utf8");
  const statements = script.replace(/^\s*--.*$/gm, "");
  assert.match(statements, /^BEGIN;[\s\S]*^COMMIT;/m);
  assert.doesNotMatch(statements, /\b(UPDATE|DROP|TRUNCATE|INSERT|ALTER)\b|DELETE FROM/i);
  assert.doesNotMatch(statements, /\bpublic\./i);
  for (const [where, sql] of [["the migration", statements], ["the schema file", schema]]) {
    const table = /CREATE TABLE IF NOT EXISTS pms\.cycle_result_visibility \(([\s\S]*?)\n\);/.exec(sql)?.[1] ?? "";
    assert.match(table, /cycle_id\s+uuid PRIMARY KEY REFERENCES pms\.cycles\(cycle_id\) ON DELETE CASCADE/, where);
    assert.match(table, /employee_visible\s+boolean NOT NULL DEFAULT true/, where);
    assert.match(table, /manager_visible\s+boolean NOT NULL DEFAULT true/, where);
  }
});

test("a cycle says whether a later reviewer reads earlier answers, and an old cycle says no (D5)", () => {
  const script = readFileSync(new URL("./migrations/2026-11-27-earlier-answers-visibility.sql", import.meta.url), "utf8");
  const schema = readFileSync(new URL("./schema/evaluation-results.sql", import.meta.url), "utf8");
  const statements = script.replace(/^\s*--.*$/gm, "");
  assert.match(statements, /^BEGIN;[\s\S]*^COMMIT;/m);
  // It adds one column: no row changes, and an old backend keeps working because of the default.
  assert.doesNotMatch(statements, /\b(UPDATE|DROP|TRUNCATE|INSERT)\b|DELETE FROM/i);
  assert.doesNotMatch(statements, /\bpublic\./i);
  assert.match(statements, /ALTER TABLE pms\.cycle_result_visibility\s+ADD COLUMN IF NOT EXISTS earlier_answers_visible boolean NOT NULL DEFAULT false;/);
  const table = /CREATE TABLE IF NOT EXISTS pms\.cycle_result_visibility \(([\s\S]*?)\n\);/.exec(schema)?.[1] ?? "";
  assert.match(table, /earlier_answers_visible\s+boolean NOT NULL DEFAULT false/, "the schema file");
});
