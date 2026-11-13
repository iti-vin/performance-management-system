// Generates src/rows/<table>.row.ts from packages/database/schema.sql.
// One Zod object per table. Column names become camelCase, one mechanical rule,
// no renames, with one exception: a boolean column gets an auxiliary verb
// (is, has, can, should, needs) so the field reads as a yes or no.
//
// Run: pnpm --filter @pms/shared-types generate
// Check without writing: pnpm --filter @pms/shared-types generate -- --check
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readSchema } from "../../database/sql-files.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, "../src/rows");
const CHECK_ONLY = process.argv.includes("--check");

// "table.column" of a CHECK ... IN (...) column -> the enum schema in src/domain.
const ENUM_COLUMNS = {
  "employees.status": "employeeStatusSchema",
  "manager_assignments.status": "managerAssignmentStatusSchema",
  "kpi_goal_templates.status": "templateVersionStatusSchema",
  "kpi_indicators.direction": "kpiDirectionSchema",
  "behavioral_templates.status": "templateVersionStatusSchema",
  "behavioral_questions.question_type": "behavioralQuestionTypeSchema",
  "cycles.review_type": "reviewTypeSchema",
  "cycles.state": "cycleStatusSchema",
  "cycle_stages.perspective": "evaluatorTypeSchema",
  "accomplishments.status": "accomplishmentStatusSchema",
  "assignments.state": "evaluationStatusSchema",
  "assignment_responses.status": "responseStatusSchema",
  "nte_notices.status": "nteStatusSchema",
  "pip_plans.origin": "pipOriginSchema",
  "pip_plans.state": "pipStatusSchema",
  "pip_weeks.status": "pipWeekStatusSchema",
  "pip_week_updates.status": "pipWeekUpdateStatusSchema",
  "pip_week_assessments.outcome": "pipWeekResultSchema",
  "operational_goals.category": "goalCategorySchema",
  "operational_goals.tracking_mode": "goalTrackingModeSchema",
  "operational_goals.status": "goalStatusSchema",
  "goal_milestones.status": "goalMilestoneStatusSchema",
  "notifications.source_type": "notificationSourceTypeSchema",
};

// Boolean columns whose name does not read well with an `is_` prefix.
const BOOLEAN_NAMES = {
  allow_not_observed: "canMarkNotObserved",
  referral_review_required: "isReferralReviewRequired",
  use_for_scoring: "isUsedForScoring",
};
const AUXILIARY = /^(is|has|can|should|needs)_/;

const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = (s) => camel(s).replace(/^./, (c) => c.toUpperCase());
const kebab = (s) => s.replace(/_/g, "-");
const enumFile = (schemaName) =>
  schemaName
    .replace(/Schema$/, "")
    .replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

function fieldName(column, sqlType) {
  if (sqlType !== "boolean") return camel(column);
  if (BOOLEAN_NAMES[column]) return BOOLEAN_NAMES[column];
  return camel(AUXILIARY.test(column) ? column : `is_${column}`);
}

function zodFor(table, column, sqlType, notNull) {
  const key = `${table}.${column}`;
  const imports = new Set();
  let expr;
  if (ENUM_COLUMNS[key]) {
    expr = ENUM_COLUMNS[key];
    imports.add(`enum:${expr}`);
  } else if (sqlType === "uuid")
    ((expr = "idSchema"), imports.add("common:idSchema"));
  else if (sqlType === "bigint")
    ((expr = "bigintIdSchema"), imports.add("common:bigintIdSchema"));
  else if (sqlType === "text") expr = "z.string()";
  else if (sqlType === "timestamptz")
    ((expr = "timestampSchema"), imports.add("common:timestampSchema"));
  else if (sqlType === "date")
    ((expr = "dateOnlySchema"), imports.add("common:dateOnlySchema"));
  else if (sqlType.startsWith("numeric"))
    ((expr = "decimalSchema"), imports.add("common:decimalSchema"));
  else if (sqlType === "integer") expr = "z.number().int()";
  else if (sqlType === "boolean") expr = "z.boolean()";
  else if (sqlType === "jsonb")
    ((expr = "jsonValueSchema"), imports.add("common:jsonValueSchema"));
  else throw new Error(`Unsupported type "${sqlType}" on ${key}`);
  return { expr: notNull ? expr : `${expr}.nullable()`, imports };
}

const sql = readSchema().replace(/\r\n/g, "\n");
const tables = [
  ...sql.matchAll(/CREATE TABLE IF NOT EXISTS pms\.(\w+) \(\n([\s\S]*?)\n\);/g),
];
if (!tables.length) throw new Error("No tables found in schema.sql");

const COLUMN =
  /^ {4}(\w+)\s+(uuid|text|timestamptz|bigint|integer|numeric(?:\(\d+,\d+\))?|date|boolean|jsonb)\b(.*)$/;
const files = new Map();
const coveredEnumKeys = new Set();
const booleanRenames = [];

for (const [, table, body] of tables) {
  const fields = [];
  const imports = { common: new Set(), enums: new Set() };
  for (const line of body.split("\n")) {
    const m = line.match(COLUMN);
    if (!m) continue;
    const [, column, sqlType, rest] = m;
    const code = rest.split("--")[0];
    const isPrimaryKey = /PRIMARY KEY/i.test(code);
    const notNull = isPrimaryKey || /NOT NULL/i.test(code);
    const { expr, imports: used } = zodFor(table, column, sqlType, notNull);
    if (ENUM_COLUMNS[`${table}.${column}`])
      coveredEnumKeys.add(`${table}.${column}`);
    for (const u of used) {
      const [kind, name] = u.split(":");
      if (kind === "common") imports.common.add(name);
      else imports.enums.add(name);
    }
    const name = fieldName(column, sqlType);
    if (sqlType === "boolean" && name !== camel(column))
      booleanRenames.push(`${table}.${column} -> ${name}`);
    fields.push(`  ${name}: ${expr},`);
  }
  if (!fields.length) throw new Error(`No columns parsed for pms.${table}`);

  const schemaName = `${camel(table)}RowSchema`;
  const typeName = `${pascal(table)}Row`;
  const importLines = [`import { z } from "zod";`];
  if (imports.common.size)
    importLines.push(
      `import { ${[...imports.common].sort().join(", ")} } from "../common.js";`,
    );
  for (const e of [...imports.enums].sort())
    importLines.push(
      `import { ${e} } from "../domain/${enumFile(e)}.enum.js";`,
    );

  files.set(
    `${kebab(table)}.row.ts`,
    `// GENERATED by scripts/generate-rows.mjs from packages/database/schema.sql. Do not edit.
${importLines.join("\n")}

/** One row of pms.${table}. */
export const ${schemaName} = z.object({
${fields.join("\n")}
});
export type ${typeName} = z.infer<typeof ${schemaName}>;
`,
  );
}

// Every CHECK ... IN column must have an enum mapping.
const missingEnum = [];
for (const [, table, body] of tables) {
  for (const line of body.split("\n")) {
    const m = line.match(/^ {4}(\w+)\s+text.*CHECK\s*\(\s*\1\s+IN\s*\(/);
    if (m && !ENUM_COLUMNS[`${table}.${m[1]}`])
      missingEnum.push(`${table}.${m[1]}`);
  }
}
if (missingEnum.length)
  throw new Error(
    `CHECK IN columns with no enum mapping: ${missingEnum.join(", ")}`,
  );
for (const key of Object.keys(ENUM_COLUMNS))
  if (!coveredEnumKeys.has(key))
    throw new Error(`Enum mapping for ${key} matches no column`);

files.set(
  "index.ts",
  `// GENERATED by scripts/generate-rows.mjs. Do not edit.\n` +
    [...files.keys()]
      .sort()
      .map((f) => `export * from "./${f.replace(/\.ts$/, ".js")}";`)
      .join("\n") +
    "\n",
);

// Compare or write.
let stale = false;
if (existsSync(OUT_DIR)) {
  for (const f of readdirSync(OUT_DIR))
    if (!files.has(f)) {
      stale = true;
      if (!CHECK_ONLY) rmSync(join(OUT_DIR, f));
    }
}
for (const [name, content] of files) {
  const path = join(OUT_DIR, name);
  // Git on Windows checks files out with CRLF (core.autocrlf). Compare the text
  // without the line ending, or the check fails on a fresh checkout there.
  const current = existsSync(path)
    ? readFileSync(path, "utf8").replace(/\r\n/g, "\n")
    : null;
  if (current !== content) {
    stale = true;
    if (!CHECK_ONLY) {
      mkdirSync(OUT_DIR, { recursive: true });
      writeFileSync(path, content);
    }
  }
}
if (CHECK_ONLY) {
  if (stale) {
    console.error(
      "src/rows is out of date. Run: pnpm --filter @pms/shared-types generate",
    );
    process.exit(1);
  }
  console.log(`src/rows matches schema.sql (${tables.length} tables).`);
} else {
  console.log(`Generated ${tables.length} row schemas.`);
  if (booleanRenames.length)
    console.log(
      "Boolean fields given a verb:\n  " + booleanRenames.join("\n  "),
    );
}
