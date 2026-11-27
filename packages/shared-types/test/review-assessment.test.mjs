import assert from "node:assert/strict";
import { test } from "node:test";

import * as shared from "../dist/index.js";

const guid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const parse = (answers) => shared.submitBehavioralAssessmentRequestSchema.safeParse({ answers });
const one = (answer) => parse([{ questionId: guid(131), ...answer }]);

test("an answer is a rating, a text, an option, or Not observed, and nothing else is filled in", () => {
  const result = parse([
    { questionId: guid(131), score: 4 },
    { questionId: guid(132), writtenAnswer: "  Helps the team.  " },
    { questionId: guid(133), optionId: guid(901) },
    { questionId: guid(134), isNotObserved: true },
  ]);

  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  assert.deepEqual(result.data.answers[0], {
    questionId: guid(131),
    score: 4,
    writtenAnswer: null,
    optionId: null,
    isNotObserved: false,
  });
  assert.equal(result.data.answers[1].writtenAnswer, "Helps the team.");
});

test("a rating is a whole number from 1 to 5", () => {
  for (const score of [0, 6, 4.5]) {
    assert.equal(one({ score }).success, false, String(score));
  }
});

test("an answer holds one kind of value", () => {
  for (const [label, answer] of [
    ["score and text", { score: 4, writtenAnswer: "x" }],
    ["score and option", { score: 4, optionId: guid(901) }],
    ["text and option", { writtenAnswer: "x", optionId: guid(901) }],
    ["not observed and score", { isNotObserved: true, score: 4 }],
    ["not observed and text", { isNotObserved: true, writtenAnswer: "x" }],
    ["not observed and option", { isNotObserved: true, optionId: guid(901) }],
    ["an option that is not a GUID", { optionId: "first" }],
  ]) {
    assert.equal(one(answer).success, false, label);
  }
});

test("a response has limits: a text of 5000 characters, 500 answers, and one answer per question", () => {
  assert.equal(shared.REVIEW_TEXT_MAX_LENGTH, 5000);
  assert.equal(shared.MAX_REVIEW_ANSWERS, 500);
  assert.equal(one({ writtenAnswer: "x".repeat(5000) }).success, true);
  assert.equal(one({ writtenAnswer: "x".repeat(5001) }).success, false);
  assert.equal(parse(Array.from({ length: 501 }, (_, index) => ({ questionId: guid(index) }))).success, false);

  const twice = parse([{ questionId: guid(131), score: 4 }, { questionId: guid(131), score: 5 }]);
  assert.equal(twice.success, false);
  assert.deepEqual(twice.error.issues.map((issue) => issue.path.join(".")), ["answers.1.questionId"]);
});

const DETAIL = {
  assignmentId: guid(301),
  cycleId: guid(141),
  cycleName: "CY2026-Q4",
  cycleState: "active",
  subjectName: "Iging UserDotTech",
  subjectPosition: "Software Engineer",
  subjectDepartment: "IT",
  isAssignedToCaller: true,
  evaluatorName: "Iging ManagerDotTech",
  perspective: "manager",
  state: "locked",
  deadline: "2026-12-11T15:59:59.000Z",
  isOverdue: false,
  canEdit: false,
  isRestricted: false,
  waitingFor: "self",
  sections: [
    {
      sectionId: guid(121),
      title: "Collaboration",
      questions: [
        {
          questionId: guid(131),
          prompt: "Shares what they know.",
          questionType: "multiple_choice",
          isRequired: true,
          allowNotObserved: false,
          options: [{ optionId: guid(901), label: "Often" }],
        },
      ],
    },
  ],
  response: null,
  reopenReason: null,
  history: [],
  stages: [{ perspective: "manager", evaluatorName: "Iging ManagerDotTech", deadline: null, state: "locked", isCurrent: true }],
  goals: null,
  template: { name: "Quarterly Performance", description: "Reflect on observable behaviors.", version: 2 },
};

test("a review detail carries the assignment, the frozen questions, and the saved response", () => {
  assert.deepEqual(shared.reviewDetailSchema.parse(DETAIL), DETAIL);

  const response = {
    version: 1,
    status: "submitted",
    submittedAt: "2026-11-26T02:00:00.000Z",
    writtenFeedback: null,
    answers: [{ questionId: guid(131), score: null, writtenAnswer: null, optionId: guid(901), isNotObserved: false }],
  };
  assert.deepEqual(shared.reviewDetailSchema.parse({ ...DETAIL, response }).response, response);
});

test("a review detail names the frozen template, or none", () => {
  assert.deepEqual(shared.reviewDetailSchema.parse(DETAIL).template, DETAIL.template);
  assert.equal(shared.reviewDetailSchema.parse({ ...DETAIL, template: null }).template, null);
  assert.equal(shared.reviewDetailSchema.safeParse({ ...DETAIL, template: undefined }).success, false);
});

test("a review detail refuses an unknown state or question type, and a missing edit flag", () => {
  const bad = (change) => assert.equal(shared.reviewDetailSchema.safeParse({ ...DETAIL, ...change }).success, false);
  bad({ state: "done" });
  bad({ canEdit: undefined });
  bad({ waitingFor: "boss" });
  bad({ sections: [{ ...DETAIL.sections[0], questions: [{ ...DETAIL.sections[0].questions[0], questionType: "slider" }] }] });
});

test("a reopening takes a reason of at most 2000 characters", () => {
  assert.deepEqual(shared.reopenReviewRequestSchema.parse({ reason: "  Wrong ratings  " }), { reason: "Wrong ratings" });
  assert.equal(shared.reopenReviewRequestSchema.safeParse({ reason: "   " }).success, false);
  assert.equal(shared.reopenReviewRequestSchema.safeParse({ reason: "x".repeat(2001) }).success, false);
  assert.equal(shared.reopenReviewRequestSchema.safeParse({}).success, false);
});

test("a review detail says why HR reopened it, or null", () => {
  assert.equal("reopenReason" in shared.reviewDetailSchema.shape, true);
  assert.equal(shared.reviewDetailSchema.shape.reopenReason.safeParse(null).success, true);
  assert.equal(shared.reviewDetailSchema.shape.reopenReason.safeParse("Wrong ratings").success, true);
});

test("a review detail carries the earlier versions, each with why HR reopened it", () => {
  const history = [
    { version: 1, submittedAt: "2026-11-26T02:00:00.000Z", answers: [], writtenFeedback: null, reopenReason: "Wrong ratings" },
  ];
  assert.deepEqual(shared.reviewDetailSchema.parse({ ...DETAIL, history }).history, history);
  const refused = (change) => assert.equal(shared.reviewDetailSchema.safeParse({ ...DETAIL, ...change }).success, false);
  refused({ history: undefined });
  refused({ history: [{ ...history[0], reopenReason: undefined }] });
  refused({ history: [{ ...history[0], version: 0 }] });
});

test("a response may carry written feedback, trimmed, storable, and at most 5000 characters", () => {
  const parse = (writtenFeedback) => shared.submitBehavioralAssessmentRequestSchema.safeParse({ answers: [], ...(writtenFeedback !== undefined && { writtenFeedback }) });
  assert.equal(parse().data.writtenFeedback, "");
  assert.equal(parse("  Good quarter  ").data.writtenFeedback, "Good quarter");
  assert.equal(parse("x".repeat(5001)).success, false);
  assert.equal(parse("a\u0000b").success, false);
});

test("a review detail names its stages, the goals the reader may open, and the saved feedback", () => {
  for (const key of ["stages", "goals"]) assert.equal(key in shared.reviewDetailSchema.shape, true, key);
  const response = { version: 1, status: "draft", submittedAt: null, answers: [] };
  assert.equal(shared.reviewDetailSchema.safeParse({ ...DETAIL, response }).success, false);
});
