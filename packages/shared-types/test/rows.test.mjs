// Rows must accept what the `pg` driver returns: bigint and numeric as strings,
// timestamps as ISO text. They must reject the old label values.
import assert from "node:assert/strict";
import { test } from "node:test";

import * as shared from "../dist/index.js";

test("employees row accepts a bigint id as a string and the directory codes", () => {
  const row = shared.employeesRowSchema.parse({
    guid: null,
    id: "21",
    code: "EMP-001",
    email: "employee1@example.invalid",
    firstName: "Juan",
    lastName: "Dela Cruz",
    hrdotnetId: "1",
    company: "Mayon Consolidated Inc.",
    position: null,
    division: null,
    department: "Engineering",
    branch: "Main",
    employmentStatus: "regular",
    status: "active",
    createdAt: "2026-11-10T08:00:00+08:00",
    updatedAt: "2026-11-10T08:00:00+08:00",
    middleName: null,
    suffix: null,
    mobileNumber: null,
    gender: "male",
    birthDate: "1995-03-14",
    placeOfBirth: null,
    maritalStatus: "single",
    nationality: null,
    religion: null,
    bloodType: "O+",
    photoUrl: null,
  });
  assert.equal(row.id, 21);
  assert.throws(() => shared.employeesRowSchema.parse({ ...row, employmentStatus: "Regular" }));
});

test("cycles row accepts numeric weights as strings", () => {
  const row = shared.cyclesRowSchema.parse({
    cycleId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    companyId: 1,
    name: "H1 2026",
    reviewType: "standard",
    state: "draft",
    evaluationStart: "2026-01-01",
    evaluationEnd: "2026-06-30",
    assessmentStart: null,
    verificationDeadline: null,
    activationDate: null,
    goalsWeight: "0.50",
    behavioralWeight: "0.50",
    anonymityThreshold: null,
    cancelledReason: null,
    finalizedAt: null,
    releasedAt: null,
    idempotencyKey: null,
    createdAt: "2026-11-10T08:00:00+08:00",
    updatedAt: "2026-11-10T08:00:00+08:00",
  });
  assert.equal(row.goalsWeight, 0.5);
});

test("a row rejects an old label value", () => {
  const result = shared.employeesRowSchema.shape.status.safeParse("Active");
  assert.equal(result.success, false);
});

test("create cycle request needs weights that total 1", () => {
  const base = {
    name: "H1 2026",
    reviewType: "standard",
    evaluationStart: "2026-01-01",
    evaluationEnd: "2026-06-30",
    assessmentStart: "2026-07-01T00:00:00+08:00",
    verificationDeadline: "2026-07-15T00:00:00+08:00",
    stages: [
      {
        perspective: "self",
        evaluatorRole: "employee",
        deadline: "2026-07-10T00:00:00+08:00",
      },
    ],
  };
  assert.equal(
    shared.createReviewCycleRequestSchema.safeParse({
      ...base,
      goalsWeight: 0.6,
      behavioralWeight: 0.4,
    }).success,
    true,
  );
  assert.equal(
    shared.createReviewCycleRequestSchema.safeParse({
      ...base,
      goalsWeight: 0.6,
      behavioralWeight: 0.6,
    }).success,
    false,
  );
});
