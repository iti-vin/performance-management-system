import assert from "node:assert/strict";
import { test } from "node:test";

import * as shared from "../dist/index.js";

const guid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const report = (body) => shared.reportIndicatorActualsRequestSchema.safeParse(body);
const one = (actualValue) => report({ actuals: [{ indicatorId: guid(61), actualValue }] });

test("a report takes a value of zero or more for each indicator, or none yet", () => {
  const result = report({ actuals: [{ indicatorId: guid(61), actualValue: 0 }, { indicatorId: guid(62), actualValue: null }] });

  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  assert.equal(result.data.remarks, "");
  assert.equal(result.data.correctionReason, "");
  assert.equal(one(98.5).success, true);
});

test("a report refuses a negative value, a value that is not finite, and a value that is not a number", () => {
  for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, "4"]) {
    assert.equal(one(value).success, false, String(value));
  }
});

test("a report has limits: one value per indicator, 200 values, and texts of 2000 characters", () => {
  assert.equal(shared.ACCOMPLISHMENT_TEXT_MAX_LENGTH, 2000);
  assert.equal(shared.MAX_ACCOMPLISHMENT_ACTUALS, 200);
  const twice = report({ actuals: [{ indicatorId: guid(61), actualValue: 1 }, { indicatorId: guid(61), actualValue: 2 }] });
  assert.deepEqual(twice.error.issues.map((issue) => issue.path.join(".")), ["actuals.1.indicatorId"]);
  const many = Array.from({ length: 201 }, (_, index) => ({ indicatorId: guid(index), actualValue: 1 }));
  assert.equal(report({ actuals: many }).success, false);
  for (const field of ["remarks", "correctionReason"]) {
    assert.equal(report({ actuals: [], [field]: "x".repeat(2000) }).success, true, field);
    assert.equal(report({ actuals: [], [field]: "x".repeat(2001) }).success, false, field);
  }
});

test("a decision verifies, or returns with a reason", () => {
  const decide = (body) => shared.accomplishmentDecisionRequestSchema.safeParse(body);

  assert.deepEqual(decide({ outcome: "verified" }).data, { outcome: "verified", reason: "" });
  assert.deepEqual(decide({ outcome: "returned", reason: "  Check unit 2.  " }).data, { outcome: "returned", reason: "Check unit 2." });
  for (const body of [{ outcome: "returned" }, { outcome: "returned", reason: "   " }, { outcome: "rejected" }, { outcome: "returned", reason: "x".repeat(2001) }]) {
    assert.equal(decide(body).success, false, JSON.stringify(body));
  }
});

const ROW = {
  accomplishmentId: guid(171),
  cycleId: guid(141),
  cycleName: "ZZ demo",
  cycleState: "active",
  employeeName: "Iging UserDotTech",
  status: "returned",
  evaluationEnd: "2026-11-25",
  verificationDeadline: "2026-12-31T15:59:59.000Z",
  accomplishmentDeadline: null,
  isOwn: true,
  canDecide: false,
  position: "Software Engineer",
  kpiTemplateName: "Engineer goals",
  kpiTemplateVersion: 2,
};

const DETAIL = {
  accomplishmentId: guid(171),
  participantId: guid(151),
  cycleId: guid(141),
  cycleName: "ZZ demo",
  cycleState: "active",
  employeeName: "Iging UserDotTech",
  position: "Software Engineer",
  kpiTemplateName: "Engineer goals",
  kpiTemplateVersion: 2,
  status: "returned",
  evaluationStart: "2026-10-01",
  evaluationEnd: "2026-11-25",
  verificationDeadline: null,
  accomplishmentDeadline: null,
  remarks: null,
  returnReason: "Check unit 2.",
  submittedAt: "2026-11-26T02:00:00.000Z",
  verifiedAt: null,
  canEdit: true,
  canSubmit: true,
  canDecide: false,
  notice: null,
  kpi: {
    indicators: [
      {
        indicatorId: guid(61),
        versionId: guid(51),
        name: "Defects",
        description: null,
        unit: "Count",
        // numeric columns may arrive as text.
        target: "2.00",
        direction: "lower_is_better",
        weight: "100.00",
        scoreTargetMet: "5.00",
        scoreBelowTarget: "2.00",
        matrixKind: "none",
        matrixTitle: null,
        scaleBound: null,
        useForScoring: false,
      },
    ],
    scales: [],
    matrixRows: [],
    matrixColumns: [],
    matrixCells: [],
  },
  actuals: [{ indicatorId: guid(61), actualValue: "1.5", remarks: "Late" }],
  versions: [
    {
      version: 1,
      actedAt: "2026-11-26T02:00:00.000Z",
      actorName: "Iging UserDotTech",
      remarks: "First.",
      correctionReason: null,
      actuals: [{ indicatorId: guid(61), actualValue: 3, remarks: null }],
    },
  ],
};

test("an accomplishment list row and detail parse what the API sends, with numbers", () => {
  assert.deepEqual(shared.accomplishmentListSchema.parse([ROW]), [ROW]);
  const detail = shared.accomplishmentDetailSchema.parse(DETAIL);
  assert.equal(detail.actuals[0].actualValue, 1.5);
  assert.equal(detail.kpi.indicators[0].target, 2);
});

test("an accomplishment refuses an unknown status and a missing flag", () => {
  const bad = (change) => assert.equal(shared.accomplishmentDetailSchema.safeParse({ ...DETAIL, ...change }).success, false);
  bad({ status: "approved" });
  bad({ canDecide: undefined });
  assert.equal(shared.accomplishmentListSchema.safeParse([{ ...ROW, isOwn: undefined }]).success, false);
});

test("a record says the position and the frozen KPI template, each of which may be unknown", () => {
  const parsed = (row) => shared.accomplishmentListRowSchema.safeParse(row).success;
  assert.equal(parsed({ ...ROW, position: null, kpiTemplateName: null, kpiTemplateVersion: null }), true);
  for (const field of ["position", "kpiTemplateName", "kpiTemplateVersion"]) {
    assert.equal(parsed({ ...ROW, [field]: undefined }), false, field);
  }
});

test("each reported value may carry its own remarks", () => {
  const indicatorId = "00000000-0000-0000-0000-000000000061";
  const parse = (extra) => shared.reportIndicatorActualsRequestSchema.safeParse({ actuals: [{ indicatorId, actualValue: 1, ...extra }] });
  assert.equal(parse({}).data.actuals[0].remarks, "");
  assert.equal(parse({ remarks: "  Two late  " }).data.actuals[0].remarks, "Two late");
  assert.equal(parse({ remarks: "x".repeat(2001) }).success, false);
  assert.equal(parse({ remarks: "a\u0000b" }).success, false);
});

test("a record carries the accomplishment deadline, and the remarks of each value and version", () => {
  assert.equal("accomplishmentDeadline" in shared.accomplishmentListRowSchema.shape, true);
  const value = { indicatorId: "00000000-0000-0000-0000-000000000061", actualValue: 1 };
  const actuals = shared.accomplishmentDetailSchema.shape.actuals;
  assert.equal(actuals.safeParse([value]).success, false);
  assert.equal(actuals.safeParse([{ ...value, remarks: null }]).success, true);
});
