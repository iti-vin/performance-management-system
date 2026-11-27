import assert from "node:assert/strict";
import { test } from "node:test";

import * as shared from "../dist/index.js";

const guid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
// PostgreSQL stores no NUL character, in text or in jsonb: it must stop at the boundary.
const BAD = "a\u0000b";
const paths = (result) => result.error?.issues.map((issue) => issue.path.join("."));

test("a review answer refuses a NUL character", () => {
  const body = { answers: [{ questionId: guid(131), writtenAnswer: BAD }] };
  assert.deepEqual(paths(shared.submitBehavioralAssessmentRequestSchema.safeParse(body)), ["answers.0.writtenAnswer"]);
});

test("the texts of a report and of a decision refuse a NUL character", () => {
  const report = { actuals: [], remarks: BAD, correctionReason: BAD };
  assert.deepEqual(paths(shared.reportIndicatorActualsRequestSchema.safeParse(report)), ["remarks", "correctionReason"]);
  const decision = { outcome: "returned", reason: BAD };
  assert.deepEqual(paths(shared.accomplishmentDecisionRequestSchema.safeParse(decision)), ["reason"]);
});
