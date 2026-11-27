import type { ResultRowDto } from "@pms/shared-types";

import { formatScore } from "@/features/review-cycles/services/result-words";

const HEADINGS = ["Employee", "Position", "Department", "Review Cycle", "Goals", "Behavioral", "Overall Rating"];
/** A spreadsheet runs a cell that starts with one of these as a formula (CWE-1236). */
const FORMULA_START = /^[=+\-@\t\r]/;

const cell = (value: string) => `"${(FORMULA_START.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
const score = (value: number | null) => formatScore(value).replace(" / 5", "");

/** The listed results as a CSV file, one line for each row. */
export function resultsCsv(rows: readonly ResultRowDto[]): string {
  const lines = rows.map((row) => [
    row.employeeName,
    row.position ?? "",
    row.department ?? "",
    row.cycleName,
    score(row.goalsScore),
    score(row.behavioralScore),
    score(row.overallScore),
  ]);
  return [HEADINGS, ...lines].map((line) => line.map(cell).join(",")).join("\r\n");
}
