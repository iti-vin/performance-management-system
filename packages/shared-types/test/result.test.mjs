import assert from "node:assert/strict";
import { test } from "node:test";

import * as shared from "../dist/index.js";

const guid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const ROW = {
  participantId: guid(151),
  cycleId: guid(141),
  cycleName: "ZZ demo",
  employeeName: "Iging UserDotTech",
  position: "Software Engineer",
  department: null,
  goalsScore: 4.505,
  behavioralScore: null,
  overallScore: null,
  finalizedAt: "2026-12-20T00:00:00.000Z",
  releasedAt: null,
};
const DETAIL = {
  ...ROW,
  evaluationStart: "2026-10-01",
  evaluationEnd: "2026-11-25",
  goalsWeight: 0.5,
  behavioralWeight: 0.5,
  goals: {
    templateName: "Engineer goals",
    templateVersion: 2,
    indicators: [
      { indicatorId: guid(61), name: "Defects", unit: null, target: 2, direction: "lower_is_better", weight: 100, actualValue: 1, score: 5, isTargetMet: true, remarks: null },
    ],
  },
  behavioral: {
    templateName: null,
    templateVersion: null,
    questions: [{ questionId: guid(131), sectionTitle: "Work", prompt: "Delivers", ratings: [{ perspective: "self", rating: 4 }] }],
    assessments: [{ perspective: "peer", evaluatorName: null, submittedCount: 2, submittedAt: null, rating: null, isWithheld: true }],
    feedback: [{ perspective: "self", evaluatorName: "Ana", prompt: "Strengths", text: "Calm." }],
  },
};

test("a result row and a result detail parse what the API sends", () => {
  assert.deepEqual(shared.resultListSchema.parse([ROW]), [ROW]);
  assert.deepEqual(shared.resultDetailSchema.parse(DETAIL), DETAIL);
  assert.equal(shared.resultDetailSchema.safeParse({ ...DETAIL, goals: null, behavioral: null }).success, true);
});

test("a result refuses a score outside zero to five, and drops what the contract does not name", () => {
  assert.equal(shared.resultListSchema.safeParse([{ ...ROW, overallScore: 5.1 }]).success, false);
  const parsed = shared.resultDetailSchema.parse({ ...DETAIL, evaluatorIds: [guid(1)] });
  assert.equal("evaluatorIds" in parsed, false);
});
