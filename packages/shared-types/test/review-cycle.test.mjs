import assert from "node:assert/strict";
import { test } from "node:test";

import * as shared from "../dist/index.js";

const ROW = {
  cycleId: "00000000-0000-0000-0000-000000000141",
  name: "CY2026-Q4",
  reviewType: "standard",
  state: "active",
  evaluationStart: "2026-11-04",
  evaluationEnd: "2026-12-31",
  deadline: "2026-12-15T08:00:00+08:00",
  participantCount: 3,
  assignmentCount: 9,
  submittedCount: 2,
  completedCount: 1,
  releasedAt: null,
};

test("a list row carries the cycle, its last deadline, and the counts the register shows", () => {
  assert.deepEqual(shared.reviewCycleListRowSchema.parse(ROW), ROW);
});

test("a list row accepts a cycle with no stage deadline yet", () => {
  assert.equal(shared.reviewCycleListRowSchema.safeParse({ ...ROW, deadline: null }).success, true);
});

test("a list row refuses a missing id, an unknown state, a review type outside the list, and a negative count", () => {
  const { cycleId: _cycleId, ...withoutId } = ROW;
  assert.equal(shared.reviewCycleListRowSchema.safeParse(withoutId).success, false, "cycleId");
  assert.equal(shared.reviewCycleListRowSchema.safeParse({ ...ROW, state: "paused" }).success, false, "state");
  assert.equal(shared.reviewCycleListRowSchema.safeParse({ ...ROW, reviewType: "Standard Performance Review" }).success, false, "reviewType");
  for (const count of ["participantCount", "assignmentCount", "submittedCount", "completedCount"]) {
    assert.equal(shared.reviewCycleListRowSchema.safeParse({ ...ROW, [count]: -1 }).success, false, count);
  }
});

test("the create request keeps each weight to two decimals: numeric(4,2) would round 0.335 and 0.665 and break the total", () => {
  const base = {
    name: "CY2027-Q1",
    reviewType: "standard",
    evaluationStart: "2027-01-01",
    evaluationEnd: "2027-03-31",
    assessmentStart: "2027-04-01T00:00:00.000Z",
    verificationDeadline: "2027-04-20T00:00:00.000Z",
    anonymityThreshold: null,
    stages: [{ perspective: "self", evaluatorRole: "employee", deadline: "2027-04-07T00:00:00.000Z" }],
  };
  const parse = (goalsWeight, behavioralWeight) =>
    shared.createReviewCycleRequestSchema.safeParse({ ...base, goalsWeight, behavioralWeight });

  assert.equal(parse(0.5, 0.5).success, true);
  assert.equal(parse(0.07, 0.93).success, true);
  assert.equal(parse(0.335, 0.665).success, false);
});

const CREATE_BASE = {
  name: "CY2027-Q1",
  reviewType: "standard",
  evaluationStart: "2027-01-01",
  evaluationEnd: "2027-03-31",
  assessmentStart: "2027-04-01T00:00:00.000Z",
  verificationDeadline: "2027-04-20T00:00:00.000Z",
  goalsWeight: 0.5,
  behavioralWeight: 0.5,
  anonymityThreshold: null,
  stages: [
    { perspective: "self", evaluatorRole: "employee", deadline: "2027-04-07T00:00:00.000Z" },
    { perspective: "hr", evaluatorRole: "hr_officer", evaluatorId: "00000000-0000-0000-0000-000000000023", deadline: "2027-04-14T00:00:00.000Z" },
  ],
};
const EMPLOYEE = "00000000-0000-0000-0000-000000000021";

test("the create request carries the participants, each with an optional KPI and behavioral template, and defaults to none", () => {
  const empty = shared.createReviewCycleRequestSchema.parse(CREATE_BASE);
  assert.deepEqual(empty.participants, []);

  const body = shared.createReviewCycleRequestSchema.parse({
    ...CREATE_BASE,
    participants: [
      { employeeId: EMPLOYEE, behavioralTemplateId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" },
      { employeeId: "00000000-0000-0000-0000-000000000022", kpiTemplateId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302" },
    ],
  });
  assert.equal(body.participants.length, 2);
  assert.equal(body.participants[0].kpiTemplateId, undefined);
});

test("the create request refuses a participant id that is not a GUID, and more than 500 participants", () => {
  assert.equal(shared.createReviewCycleRequestSchema.safeParse({ ...CREATE_BASE, participants: [{ employeeId: "maria" }] }).success, false);
  const many = Array.from({ length: 501 }, (_, index) => ({ employeeId: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}` }));
  assert.equal(shared.createReviewCycleRequestSchema.safeParse({ ...CREATE_BASE, participants: many }).success, false);
});

test("a stage can name its evaluator by GUID, and a stage deadline must be after the stage before it", () => {
  assert.equal(shared.createReviewCycleRequestSchema.safeParse(CREATE_BASE).success, true);
  assert.equal(
    shared.createReviewCycleRequestSchema.safeParse({
      ...CREATE_BASE,
      stages: [{ ...CREATE_BASE.stages[0], evaluatorId: "maria" }],
    }).success,
    false,
  );
  const result = shared.createReviewCycleRequestSchema.safeParse({
    ...CREATE_BASE,
    stages: [CREATE_BASE.stages[1], CREATE_BASE.stages[0]],
  });
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues.map((issue) => issue.path.join(".")), ["stages.1.deadline"]);
});

/** A body with this many stages, each with a later deadline than the one before. */
const withStages = (count) => ({
  ...CREATE_BASE,
  stages: Array.from({ length: count }, (_, index) => ({
    perspective: "self",
    evaluatorRole: "employee",
    deadline: `2027-04-${String(index + 7).padStart(2, "0")}T00:00:00.000Z`,
  })),
});

test("the create request takes at most 10 stages: a launch creates one assignment per participant and stage", () => {
  assert.equal(shared.MAX_CYCLE_STAGES, 10);
  assert.equal(shared.createReviewCycleRequestSchema.safeParse(withStages(10)).success, true);
  assert.equal(shared.createReviewCycleRequestSchema.safeParse(withStages(11)).success, false);
});

test("deadlines compare as instants, not as text: an offset does not reorder them", () => {
  const later = shared.createReviewCycleRequestSchema.safeParse({
    ...CREATE_BASE,
    assessmentStart: "2027-04-01T08:00:00+08:00",
    verificationDeadline: "2027-04-01T01:00:00Z",
    stages: [
      { perspective: "self", evaluatorRole: "employee", deadline: "2027-04-14T00:00:00+08:00" },
      { perspective: "manager", evaluatorRole: "manager", deadline: "2027-04-13T20:00:00Z" },
    ],
  });
  assert.equal(later.success, true, JSON.stringify(later.error?.issues));
});

const OPTIONS = {
  employees: [
    { employeeId: "284ddc9e-ebe4-468d-945f-fb18af72e622", name: "Iging DotTech", position: "Software Engineer", department: "Engineering", employeeCode: "EMP-001", managerId: null, managerName: "Maria Santos" },
    { employeeId: "6293e9c7-6495-4555-85a9-1eccebc6d34c", name: "System Administrator", position: null, department: "Engineering", employeeCode: "EMP-025", managerId: null, managerName: null },
  ],
  kpiTemplates: [{ templateId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", name: "Engineer goals", position: "Software Engineer", version: 2 }],
  behavioralTemplates: [{ templateId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302", name: "Quarterly review", version: 1 }],
  hrEvaluators: [{ employeeId: "6293e9c7-6495-4555-85a9-1eccebc6d34c", name: "System Administrator" }],
};

test("the wizard options carry the employees, the published templates, and the HR evaluators", () => {
  assert.deepEqual(shared.reviewCycleOptionsSchema.parse(OPTIONS), OPTIONS);
});

test("the wizard options accept a template with no name, and refuse a row with no id", () => {
  const unnamed = { ...OPTIONS, kpiTemplates: [{ ...OPTIONS.kpiTemplates[0], name: null }] };
  assert.equal(shared.reviewCycleOptionsSchema.safeParse(unnamed).success, true);
  const noId = { ...OPTIONS, employees: [{ name: "x", position: null, department: "y" }] };
  assert.equal(shared.reviewCycleOptionsSchema.safeParse(noId).success, false);
});

// The shape of a real GET /review-cycles/:id: the dates are text, the weights are numbers, the stages and participants are embedded.
const DETAIL = {
  cycleId: "7d47ea3a-ec86-4120-abde-c13b7b14dbf4",
  company: "Mayon Consolidated Inc.",
  name: "ZZ wizard check",
  reviewType: "standard",
  state: "draft",
  evaluationStart: "2027-01-01",
  evaluationEnd: "2027-03-31",
  assessmentStart: "2027-03-31T16:00:00.000Z",
  verificationDeadline: "2027-04-30T15:59:59.000Z",
  accomplishmentDeadline: null,
  description: null,
  activationDate: null,
  goalsWeight: 0.5,
  behavioralWeight: 0.5,
  anonymityThreshold: null,
  cancelledReason: null,
  finalizedAt: null,
  releasedAt: null,
  employeeVisible: true,
  managerVisible: true,
  earlierAnswersVisible: true,
  idempotencyKey: null,
  createdAt: "2026-11-25T06:00:00.000Z",
  updatedAt: "2026-11-25T06:00:00.000Z",
  stages: [
    { stageId: "00000000-0000-0000-0000-000000000161", cycleId: "7d47ea3a-ec86-4120-abde-c13b7b14dbf4", perspective: "self", evaluatorRole: "employee", evaluatorId: null, sortOrder: 1, deadline: "2027-04-07T15:59:59.000Z" },
    { stageId: "00000000-0000-0000-0000-000000000163", cycleId: "7d47ea3a-ec86-4120-abde-c13b7b14dbf4", perspective: "hr", evaluatorRole: "hr_officer", evaluatorId: "6293e9c7-6495-4555-85a9-1eccebc6d34c", sortOrder: 3, deadline: "2027-04-21T15:59:59.000Z" },
  ],
  participants: [
    {
      participantId: "17d1d193-0fc3-41e1-a13f-a45217488d5d",
      cycleId: "7d47ea3a-ec86-4120-abde-c13b7b14dbf4",
      employeeId: "284ddc9e-ebe4-468d-945f-fb18af72e622",
      frozenPosition: "Software Engineer",
      kpiVersionId: "00000000-0000-0000-0000-000000000051",
      behavioralVersionId: null,
      kpiTemplateId: "00000000-0000-0000-0000-000000000041",
      behavioralTemplateId: null,
      peerIds: [],
    },
  ],
};

test("the cycle detail parses what the API sends: the cycle, its stages, and its participants with their template ids", () => {
  assert.deepEqual(shared.reviewCycleDetailSchema.parse(DETAIL), DETAIL);
});

test("the cycle detail refuses a participant with no employee, and a state outside the list", () => {
  const noEmployee = { ...DETAIL, participants: [{ ...DETAIL.participants[0], employeeId: undefined }] };
  assert.equal(shared.reviewCycleDetailSchema.safeParse(noEmployee).success, false);
  assert.equal(shared.reviewCycleDetailSchema.safeParse({ ...DETAIL, state: "paused" }).success, false);
});

test("the readiness list is a list of problems, each with the step, the field, and the message", () => {
  const issues = [{ step: "kpi", field: "participants.x.kpi", message: "Choose a template." }];
  assert.deepEqual(shared.reviewCycleReadinessSchema.parse(issues), issues);
  assert.deepEqual(shared.reviewCycleReadinessSchema.parse([]), []);
  assert.equal(shared.reviewCycleReadinessSchema.safeParse([{ step: "launch", field: "x", message: "y" }]).success, false);
  assert.equal(shared.reviewCycleReadinessSchema.safeParse([{ step: "kpi", field: "x" }]).success, false);
});

test("a cancellation needs a reason: trimmed, not blank, and at most 2000 characters", () => {
  assert.deepEqual(shared.cancelReviewCycleRequestSchema.parse({ reason: "  Budget freeze " }), { reason: "Budget freeze" });
  assert.equal(shared.cancelReviewCycleRequestSchema.safeParse({}).success, false);
  assert.equal(shared.cancelReviewCycleRequestSchema.safeParse({ reason: "   " }).success, false);
  assert.equal(shared.cancelReviewCycleRequestSchema.safeParse({ reason: "x".repeat(2001) }).success, false);
  assert.equal(shared.cancelReviewCycleRequestSchema.safeParse({ reason: "x".repeat(2000) }).success, true);
});

test("an option employee carries the employee ID and the manager, who may be unknown", () => {
  const [first] = OPTIONS.employees;
  const parsed = (employee) => shared.reviewCycleOptionsSchema.safeParse({ ...OPTIONS, employees: [employee] }).success;
  for (const field of ["employeeCode", "managerName", "managerId"]) {
    assert.equal(parsed({ ...first, [field]: undefined }), false, field);
  }
});

const PARTICIPANT = {
  participantId: "00000000-0000-0000-0000-000000000151",
  name: "Iging UserDotTech",
  position: "Software Engineer",
  department: "Engineering",
  assignments: [
    {
      assignmentId: "00000000-0000-0000-0000-000000000201",
      perspective: "self",
      evaluatorName: "Iging UserDotTech",
      state: "submitted",
      isOverdue: false,
      deadline: "2026-12-04T15:59:59.000Z",
    },
  ],
};

test("the participants of a cycle say who answers each stage and where each assignment stands", () => {
  assert.deepEqual(shared.reviewCycleParticipantsSchema.parse([PARTICIPANT]), [PARTICIPANT]);
  const unknown = { ...PARTICIPANT, position: null, department: null, assignments: [] };
  assert.equal(shared.reviewCycleParticipantsSchema.safeParse([unknown]).success, true);
  const badState = { ...PARTICIPANT, assignments: [{ ...PARTICIPANT.assignments[0], state: "done" }] };
  assert.equal(shared.reviewCycleParticipantsSchema.safeParse([badState]).success, false);
});

const STAGE_ID = "00000000-0000-0000-0000-000000000151";
const EXTENSION = { reason: "Holiday week", stages: [{ stageId: STAGE_ID, deadline: "2027-02-01T00:00:00+08:00" }] };

test("an extension takes a reason, the new stage deadlines, and the new verification deadline", () => {
  const body = { ...EXTENSION, verificationDeadline: "2027-02-10T00:00:00Z" };
  assert.deepEqual(shared.extendReviewCycleRequestSchema.parse(body), body);
  assert.deepEqual(shared.extendReviewCycleRequestSchema.parse({ reason: "x", verificationDeadline: body.verificationDeadline }).stages, []);
});

test("an extension refuses a blank or long reason, a bad stage id, a day with no time, and too many stages", () => {
  const refused = (body) => assert.equal(shared.extendReviewCycleRequestSchema.safeParse(body).success, false, JSON.stringify(body).slice(0, 80));
  refused({ ...EXTENSION, reason: "   " });
  refused({ ...EXTENSION, reason: "x".repeat(2001) });
  refused({ ...EXTENSION, stages: [{ stageId: "1", deadline: "2027-02-01T00:00:00Z" }] });
  refused({ ...EXTENSION, stages: [{ stageId: STAGE_ID, deadline: "2027-02-01" }] });
  refused({ ...EXTENSION, verificationDeadline: "soon" });
  refused({ ...EXTENSION, stages: Array.from({ length: 11 }, () => EXTENSION.stages[0]) });
});

const SLICE_5 = {
  name: "CY2027-Q1",
  reviewType: "standard",
  evaluationStart: "2027-01-01",
  evaluationEnd: "2027-03-31",
  assessmentStart: "2027-04-01T00:00:00+08:00",
  verificationDeadline: "2027-04-20T23:59:59+08:00",
  goalsWeight: 0.5,
  behavioralWeight: 0.5,
  stages: [{ perspective: "self", evaluatorRole: "employee", deadline: "2027-04-07T00:00:00+08:00" }],
};

test("a cycle takes a description and an accomplishment deadline, and both may be left out", () => {
  const empty = shared.createReviewCycleRequestSchema.parse(SLICE_5);
  assert.equal(empty.description, "");
  assert.equal(empty.accomplishmentDeadline, null);
  const full = shared.createReviewCycleRequestSchema.parse({
    ...SLICE_5,
    description: "  Yearly review  ",
    accomplishmentDeadline: "2027-04-10T23:59:59+08:00",
  });
  assert.equal(full.description, "Yearly review");
  assert.equal(full.accomplishmentDeadline, "2027-04-10T23:59:59+08:00");
});

test("the accomplishment deadline falls after the period in Manila, and not after the verification deadline", () => {
  const issuesOf = (accomplishmentDeadline) =>
    (shared.createReviewCycleRequestSchema.safeParse({ ...SLICE_5, accomplishmentDeadline }).error?.issues ?? []).map((issue) => issue.path.join("."));
  // The evaluation ends on March 31. The last instant of that day in Manila is too early.
  assert.deepEqual(issuesOf("2027-03-31T23:59:59+08:00"), ["accomplishmentDeadline"]);
  assert.deepEqual(issuesOf("2027-03-31T16:00:00Z"), []);
  assert.deepEqual(issuesOf("2027-04-20T23:59:59+08:00"), []);
  assert.deepEqual(issuesOf("2027-04-21T00:00:00+08:00"), ["accomplishmentDeadline"]);
});

test("a cycle description is at most 2000 storable characters", () => {
  for (const description of ["x".repeat(2001), "a\u0000b"]) {
    assert.equal(shared.createReviewCycleRequestSchema.safeParse({ ...SLICE_5, description }).success, false);
  }
});

test("a cycle response carries the description and the accomplishment deadline", () => {
  assert.equal("description" in shared.reviewCycleDtoSchema.shape, true);
  assert.equal("accomplishmentDeadline" in shared.reviewCycleDtoSchema.shape, true);
});

test("an extension may move the accomplishment deadline", () => {
  const body = { reason: "Late", accomplishmentDeadline: "2027-04-12T00:00:00Z" };
  assert.equal(shared.extendReviewCycleRequestSchema.parse(body).accomplishmentDeadline, body.accomplishmentDeadline);
});

const PEER = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

test("a participant takes the peers that HR names, each once, at most twenty", () => {
  const parse = (peerIds) => shared.createReviewCycleRequestSchema.safeParse({ ...SLICE_5, participants: [{ employeeId: PEER(1), ...(peerIds && { peerIds }) }] });
  assert.deepEqual(parse().data.participants[0].peerIds, []);
  assert.deepEqual(parse([PEER(2), PEER(3)]).data.participants[0].peerIds, [PEER(2), PEER(3)]);
  assert.equal(parse([PEER(2), PEER(2)]).success, false, "twice");
  assert.equal(parse([PEER(1)]).success, false, "themselves");
  assert.equal(parse(["x"]).success, false, "not a GUID");
  assert.equal(parse(Array.from({ length: 21 }, (_, index) => PEER(index + 2))).success, false, "too many");
});

test("a cycle response names the peers of each participant", () => {
  assert.equal("peerIds" in shared.reviewCycleDetailSchema.shape.participants.element.shape, true);
});

test("the manager assessment deadline is after the verification deadline while goals apply (D6)", () => {
  const issuesOf = (managerDeadline, goalsWeight = 0.5) =>
    (
      shared.createReviewCycleRequestSchema.safeParse({
        ...SLICE_5,
        goalsWeight,
        behavioralWeight: 1 - goalsWeight,
        stages: [SLICE_5.stages[0], { perspective: "manager", evaluatorRole: "manager", deadline: managerDeadline }],
      }).error?.issues ?? []
    ).map((issue) => issue.path.join("."));
  assert.deepEqual(issuesOf("2027-04-15T23:59:59+08:00"), ["stages.1.deadline"]);
  assert.deepEqual(issuesOf("2027-04-20T23:59:59+08:00"), ["stages.1.deadline"]);
  assert.deepEqual(issuesOf("2027-04-21T23:59:59+08:00"), []);
  assert.deepEqual(issuesOf("2027-04-15T23:59:59+08:00", 0), []);
});
