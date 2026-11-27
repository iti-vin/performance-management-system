import { describe, expect, it } from "vitest";

import {
  isReportChanged,
  missingForSubmission,
  toReportDraft,
  toReportRequest,
} from "@/features/position-goals/services/actuals-request";
import { accomplishmentDetail, DEFECTS, SPRINT } from "../utils/accomplishment";

const IDS = [SPRINT, DEFECTS];
const draft = (sprint: string, defects: string, change: { remarks?: string; correctionReason?: string; notes?: Record<string, string> } = {}) => ({
  values: { [SPRINT]: sprint, [DEFECTS]: defects },
  notes: {} as Record<string, string>,
  remarks: "",
  correctionReason: "",
  ...change,
});

describe("toReportDraft", () => {
  it("holds each saved value as text, blank where none is saved, and the saved remarks", () => {
    const saved = accomplishmentDetail({ actuals: [{ indicatorId: SPRINT, actualValue: 0, remarks: "On time." }], remarks: "Half done." });

    expect(toReportDraft(saved)).toEqual(draft("0", "", { remarks: "Half done.", notes: { [SPRINT]: "On time.", [DEFECTS]: "" } }));
  });
});

describe("toReportRequest", () => {
  it("sends every indicator, with null for a blank one, zero as zero, and the texts trimmed", () => {
    const result = toReportRequest(IDS, draft(" 0 ", "  ", { remarks: " Done. ", correctionReason: " Recounted. " }));

    expect(result).toEqual({
      success: true,
      data: {
        actuals: [
          { indicatorId: SPRINT, actualValue: 0, remarks: "" },
          { indicatorId: DEFECTS, actualValue: null, remarks: "" },
        ],
        remarks: "Done.",
        correctionReason: "Recounted.",
      },
    });
  });

  it("sends the remarks of each indicator, trimmed", () => {
    const result = toReportRequest(IDS, draft("1", "", { notes: { [SPRINT]: " Late. " } }));

    expect(result.success && result.data.actuals.map((actual) => actual.remarks)).toEqual(["Late.", ""]);
  });

  it.each(["-1", "abc", "1,000", "0x10", "Infinity", "9".repeat(400)])("names the indicator of the bad value %s", (value) => {
    expect(toReportRequest(IDS, draft("5", value))).toEqual({
      success: false,
      fieldErrors: { [DEFECTS]: "Enter a number of 0 or more." },
    });
  });

  it("accepts decimals, with or without a leading digit", () => {
    const result = toReportRequest(IDS, draft("90.50", ".5"));

    expect(result.success && result.data.actuals.map((actual) => actual.actualValue)).toEqual([90.5, 0.5]);
  });
});

describe("isReportChanged", () => {
  const saved = draft("90.5", "", { remarks: "Done." });

  it("compares numbers as numbers and ignores spaces around a text", () => {
    expect(isReportChanged(IDS, draft("90.50", " ", { remarks: " Done. " }), saved)).toBe(false);
  });

  it.each([
    ["a value", draft("91", "", { remarks: "Done." })],
    ["a filled blank", draft("90.5", "0", { remarks: "Done." })],
    ["a bad value", draft("90.5", "x", { remarks: "Done." })],
    ["the remarks", draft("90.5", "", { remarks: "Done!" })],
    ["the remarks of an indicator", draft("90.5", "", { remarks: "Done.", notes: { [SPRINT]: "Late." } })],
    // A saved draft does not keep the correction reason, so a typed one would be lost.
    ["a correction reason", draft("90.5", "", { remarks: "Done.", correctionReason: "Recounted." })],
  ])("sees a change of %s", (_what, changed) => {
    expect(isReportChanged(IDS, changed, saved)).toBe(true);
  });
});

describe("missingForSubmission", () => {
  it("asks for every blank value, and for the correction of a returned report", () => {
    expect(missingForSubmission(IDS, draft("0", " "), true)).toEqual({
      [DEFECTS]: "Report a value.",
      correctionReason: "Say what you corrected.",
    });
  });

  it("asks for nothing when the report is complete", () => {
    expect(missingForSubmission(IDS, draft("0", "2"), false)).toEqual({});
  });
});
