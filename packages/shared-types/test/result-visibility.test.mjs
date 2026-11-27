import assert from "node:assert/strict";
import { test } from "node:test";
import * as shared from "../dist/index.js";

test("a release may name who reads, and an omitted choice stays what the cycle holds", () => {
  assert.deepEqual(shared.releaseResultsRequestSchema.parse({}), {});
  assert.deepEqual(shared.releaseResultsRequestSchema.parse({ employeeVisible: false }), { employeeVisible: false });
  assert.equal(shared.releaseResultsRequestSchema.safeParse({ managerVisible: "no" }).success, false);
});

test("a cycle says who reads its results, in the request and in the detail (Cyc-001)", () => {
  for (const key of ["employeeVisible", "managerVisible"]) {
    const request = shared.createReviewCycleRequestSchema.shape[key];
    assert.equal(request.parse(undefined), true, key);
    assert.equal(request.parse(false), false, key);
    assert.equal(shared.reviewCycleDetailSchema.shape[key].safeParse(undefined).success, false, key);
  }
});
