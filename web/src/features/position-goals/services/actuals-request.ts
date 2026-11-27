import {
  reportIndicatorActualsRequestSchema,
  type AccomplishmentDetailDto,
  type ReportIndicatorActualsRequestDto,
} from "@pms/shared-types";

/** A report as its form holds it: each value as the text the employee typed, by indicator id. */
export interface ReportDraft {
  values: Readonly<Record<string, string>>;
  /** The remarks of each indicator, by indicator id. */
  notes: Readonly<Record<string, string>>;
  remarks: string;
  correctionReason: string;
}

type ReportRequest =
  | { success: true; data: ReportIndicatorActualsRequestDto }
  | { success: false; fieldErrors: Record<string, string> };

/** A plain decimal of 0 or more. The exponent form is how a very small saved value reads. */
const NON_NEGATIVE_NUMBER = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;

/** The value of one field: null for a blank, undefined for a text that is not a number of 0 or more. */
function parseActual(text: string): number | null | undefined {
  const typed = text.trim();
  if (!typed) return null;
  const value = NON_NEGATIVE_NUMBER.test(typed) ? Number(typed) : Number.NaN;
  return Number.isFinite(value) ? value : undefined;
}

/** The report as the API saved it. It keeps no correction reason with a draft. */
export function toReportDraft(detail: AccomplishmentDetailDto): ReportDraft {
  const saved = new Map(detail.actuals.map((actual) => [actual.indicatorId, actual]));
  const textOf = (read: (indicatorId: string) => string) =>
    Object.fromEntries(detail.kpi.indicators.map(({ indicatorId }) => [indicatorId, read(indicatorId)]));
  return {
    values: textOf((id) => String(saved.get(id)?.actualValue ?? "")),
    notes: textOf((id) => saved.get(id)?.remarks ?? ""),
    remarks: detail.remarks ?? "",
    correctionReason: "",
  };
}

/** The whole report, because a save replaces it: one value or null for each indicator. */
export function toReportRequest(indicatorIds: readonly string[], draft: ReportDraft): ReportRequest {
  const parsed = indicatorIds.map((indicatorId) => ({ indicatorId, actualValue: parseActual(draft.values[indicatorId] ?? "") }));
  const bad = parsed.filter((actual) => actual.actualValue === undefined);
  if (bad.length > 0) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(bad.map((actual) => [actual.indicatorId, "Enter a number of 0 or more."])),
    };
  }

  const body = reportIndicatorActualsRequestSchema.safeParse({
    actuals: parsed.map((actual) => ({ ...actual, remarks: draft.notes[actual.indicatorId] ?? "" })),
    remarks: draft.remarks,
    correctionReason: draft.correctionReason,
  });
  return body.success ? { success: true, data: body.data } : { success: false, fieldErrors: {} };
}

/** True when a save would change something, or when a typed correction reason would be lost. */
export function isReportChanged(indicatorIds: readonly string[], draft: ReportDraft, saved: ReportDraft): boolean {
  const valueChanged = indicatorIds.some(
    (indicatorId) => parseActual(draft.values[indicatorId] ?? "") !== parseActual(saved.values[indicatorId] ?? ""),
  );
  const noteOf = (report: ReportDraft, indicatorId: string) => (report.notes[indicatorId] ?? "").trim();
  return (
    valueChanged ||
    indicatorIds.some((indicatorId) => noteOf(draft, indicatorId) !== noteOf(saved, indicatorId)) ||
    draft.remarks.trim() !== saved.remarks.trim() ||
    draft.correctionReason.trim() !== saved.correctionReason.trim()
  );
}

/** What a submission needs beyond a draft: every value, and the correction of a returned report. */
export function missingForSubmission(
  indicatorIds: readonly string[],
  draft: ReportDraft,
  needsCorrection: boolean,
): Record<string, string> {
  const missing = Object.fromEntries(
    indicatorIds
      .filter((indicatorId) => !draft.values[indicatorId]?.trim())
      .map((indicatorId) => [indicatorId, "Report a value."]),
  );
  if (needsCorrection && !draft.correctionReason.trim()) missing.correctionReason = "Say what you corrected.";
  return missing;
}
