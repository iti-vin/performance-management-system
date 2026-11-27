import assert from "node:assert/strict";
import { test } from "node:test";

import * as shared from "../dist/index.js";

const ROW = {
  assignmentId: "17d1d193-0fc3-41e1-a13f-a45217488d5d",
  cycleId: "00000000-0000-0000-0000-000000000141",
  cycleName: "CY2026-Q4",
  cycleState: "active",
  subjectName: "Iging DotTech",
  evaluatorName: "Maria Santos",
  perspective: "manager",
  state: "not_started",
  deadline: "2026-12-06T00:00:00.000Z",
  isOverdue: false,
  subjectPosition: "Software Engineer",
  subjectDepartment: "IT",
  isAssignedToCaller: true,
};

test("a review list is one page of assignment rows, with the total of the same set", () => {
  const page = { items: [ROW, { ...ROW, deadline: null }], page: 1, pageSize: 20, totalItems: 2, cycles: [{ cycleId: ROW.cycleId, name: ROW.cycleName }], departments: ["IT"] };

  assert.deepEqual(shared.reviewListResponseSchema.parse(page), page);
});

test("a review row refuses a state or a stage outside the lists, and a missing overdue flag", () => {
  const page = (row) => ({ items: [row], page: 1, pageSize: 20, totalItems: 1, cycles: [], departments: [] });
  assert.equal(shared.reviewListResponseSchema.safeParse(page({ ...ROW, state: "done" })).success, false);
  assert.equal(shared.reviewListResponseSchema.safeParse(page({ ...ROW, perspective: "boss" })).success, false);
  assert.equal(shared.reviewListResponseSchema.safeParse(page({ ...ROW, isOverdue: undefined })).success, false);
});

test("a review query with nothing set asks for the first page of 10", () => {
  assert.deepEqual(shared.reviewListQuerySchema.parse({}), { page: 1, pageSize: 10 });
});

test("a review row says who the subject is and whether the caller answers it", () => {
  const parsed = (row) => shared.reviewListRowSchema.safeParse(row).success;
  assert.equal(parsed({ ...ROW, subjectPosition: null, subjectDepartment: null }), true);
  for (const field of ["subjectPosition", "subjectDepartment", "isAssignedToCaller"]) {
    assert.equal(parsed({ ...ROW, [field]: undefined }), false, field);
  }
});

test("a review query reads the text of the URL: filters, a trimmed search, and numbers", () => {
  const query = shared.reviewListQuerySchema.parse({
    cycleId: ROW.cycleId,
    cycleState: "active",
    perspective: "hr",
    state: "locked",
    q: "  maria ",
    page: "3",
    pageSize: "50",
  });

  assert.deepEqual(query, {
    cycleId: ROW.cycleId,
    cycleState: "active",
    perspective: "hr",
    state: "locked",
    q: "maria",
    page: 3,
    pageSize: 50,
  });
});

test("the longest search text is part of the contract", () => {
  assert.equal(shared.REVIEW_SEARCH_MAX_LENGTH, 120);
});

test("a review query refuses a bad filter, a page below 1, a page size outside the list, a long search, and an unknown key", () => {
  for (const [label, query] of [
    ["cycleId", { cycleId: "x" }],
    ["cycleState", { cycleState: "paused" }],
    ["perspective", { perspective: "boss" }],
    ["state", { state: "done" }],
    ["page", { page: "0" }],
    ["page text", { page: "two" }],
    ["pageSize", { pageSize: "1000" }],
    ["search", { q: "x".repeat(121) }],
    ["unknown", { companyId: "x" }],
    ["repeated", { state: ["locked", "submitted"] }],
  ]) {
    assert.equal(shared.reviewListQuerySchema.safeParse(query).success, false, label);
  }
});

test("a review list carries the filter options, and a query takes a tab, a department, and late work", () => {
  const empty = { items: [], page: 1, pageSize: 10, totalItems: 0 };
  assert.equal(shared.reviewListResponseSchema.safeParse(empty).success, false);
  const query = shared.reviewListQuerySchema.parse({ view: "completed", department: " IT ", state: "overdue" });
  assert.deepEqual(query, { view: "completed", department: "IT", state: "overdue", page: 1, pageSize: 10 });
  assert.equal(shared.reviewListQuerySchema.parse({ view: "team" }).view, "team");
  for (const bad of [{ view: "everyone" }, { department: "" }, { department: "x".repeat(121) }, { state: "late" }]) {
    assert.equal(shared.reviewListQuerySchema.safeParse(bad).success, false, JSON.stringify(bad));
  }
});

test("a review query refuses a NUL character in its texts, so a stale link drops the value", () => {
  for (const key of ["q", "department"]) {
    assert.equal(shared.reviewListQuerySchema.safeParse({ [key]: "a\u0000b" }).success, false, key);
  }
});
