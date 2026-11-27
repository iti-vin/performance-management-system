import assert from "node:assert/strict";
import { test } from "node:test";

import * as shared from "../dist/index.js";

const ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const DETAILS = { name: "Quarterly Review", category: "general_performance", reviewType: "self" };
const SECTIONS = [
  {
    title: "S",
    questions: [{ prompt: "Say", questionType: "paragraph", isRequired: false }],
  },
];

test("save request needs a name, a category, and a review type, and defaults the description to empty", () => {
  const body = shared.saveBehavioralTemplateRequestSchema.parse({ ...DETAILS, name: "  Quarterly Review ", sections: SECTIONS });
  assert.equal(body.name, "Quarterly Review");
  assert.equal(body.description, "");
  for (const missing of ["name", "category", "reviewType"]) {
    const input = { ...DETAILS, sections: SECTIONS };
    delete input[missing];
    assert.equal(shared.saveBehavioralTemplateRequestSchema.safeParse(input).success, false, missing);
  }
});

test("save request limits the name to 120 characters and the description to 2000", () => {
  const base = { ...DETAILS, sections: SECTIONS };
  assert.equal(shared.saveBehavioralTemplateRequestSchema.safeParse({ ...base, name: "x".repeat(121) }).success, false);
  assert.equal(shared.saveBehavioralTemplateRequestSchema.safeParse({ ...base, description: "x".repeat(2001) }).success, false);
});

test("category and review type each accept Others as a label, and refuse a code outside the list", () => {
  const base = { ...DETAILS, sections: SECTIONS };
  assert.equal(shared.saveBehavioralTemplateRequestSchema.safeParse({ ...base, category: "others", reviewType: "others" }).success, true);
  assert.equal(shared.saveBehavioralTemplateRequestSchema.safeParse({ ...base, category: "Payroll" }).success, false);
  assert.equal(shared.saveBehavioralTemplateRequestSchema.safeParse({ ...base, reviewType: "Self" }).success, false);
});

test("save request sends allowNotObserved for rating questions only", () => {
  const body = shared.saveBehavioralTemplateRequestSchema.parse({
    ...DETAILS,
    sections: [
      {
        title: "Leadership",
        questions: [
          { prompt: "A", questionType: "rating_scale", isRequired: true, allowNotObserved: true },
          { prompt: "B", questionType: "short_answer", isRequired: true, allowNotObserved: true },
        ],
      },
    ],
  });
  assert.equal(body.sections[0].questions[0].allowNotObserved, true);
  assert.equal(body.sections[0].questions[1].allowNotObserved, null);
});

test("save request sends choice options for multiple choice only, trimmed", () => {
  const body = shared.saveBehavioralTemplateRequestSchema.parse({
    ...DETAILS,
    sections: [
      {
        title: "S",
        questions: [
          { prompt: "Pick", questionType: "multiple_choice", isRequired: true, choiceOptions: [{ label: " Yes " }, { label: "No" }] },
          { prompt: "Say", questionType: "paragraph", isRequired: false, choiceOptions: [{ label: "x" }] },
        ],
      },
    ],
  });
  assert.deepEqual(body.sections[0].questions[0].choiceOptions, [{ label: "Yes" }, { label: "No" }]);
  assert.equal("choiceOptions" in body.sections[0].questions[1], false);
});

test("template tree response accepts what the API sends: allowNotObserved, not canMarkNotObserved", () => {
  const tree = shared.behavioralTemplateTreeResponseSchema.parse({
    template: {
      templateId: ID,
      company: "Mayon Consolidated Inc.",
      name: "Quarterly Performance Review",
      description: null,
      category: "general_performance",
      reviewType: "self",
      status: "draft",
      currentVersion: 1,
      publishedBy: null,
      publishedAt: null,
      archivedAt: null,
      createdAt: "2026-11-24T06:00:00.000Z",
      updatedAt: "2026-11-24T06:00:00.000Z",
    },
    version: { versionId: ID, templateId: ID, version: 1, frozenAt: null, createdBy: null, createdAt: "2026-11-24T06:00:00.000Z" },
    sections: [{ sectionId: ID, versionId: ID, title: "Leadership", sortOrder: 0 }],
    questions: [
      { questionId: ID, sectionId: ID, prompt: "Meets deadlines?", questionType: "rating_scale", isRequired: true, allowNotObserved: false, sortOrder: 0 },
    ],
    options: [],
  });
  assert.equal(tree.questions[0].allowNotObserved, false);
  assert.equal(tree.template.status, "draft");
});

test("template list response is a list of template rows", () => {
  const list = shared.behavioralTemplateListResponseSchema.parse([
    {
      templateId: ID,
      company: "Mayon Consolidated Inc.",
      name: "Quarterly Performance Review",
      description: null,
      category: "general_performance",
      reviewType: "self",
      status: "published",
      currentVersion: 2,
      questionCount: 5,
      publishedBy: ID,
      publishedAt: "2026-11-24T06:00:00.000Z",
      archivedAt: null,
      createdAt: "2026-11-24T06:00:00.000Z",
      updatedAt: "2026-11-24T06:00:00.000Z",
    },
  ]);
  assert.equal(list[0].currentVersion, 2);
});

test("review types list HR right after Upward, and Others last", () => {
  assert.deepEqual([...shared.BEHAVIORAL_REVIEW_TYPES], ["self", "manager", "peer", "upward", "hr", "others"]);
});

test("a template list row says how many questions its current version has", () => {
  const row = {
    templateId: ID,
    company: "Mayon Consolidated Inc.",
    name: null,
    description: null,
    category: null,
    reviewType: null,
    status: "draft",
    currentVersion: 1,
    publishedBy: null,
    publishedAt: null,
    archivedAt: null,
    createdAt: "2026-11-24T06:00:00.000Z",
    updatedAt: "2026-11-24T06:00:00.000Z",
  };
  assert.equal(shared.behavioralTemplateListResponseSchema.safeParse([{ ...row, questionCount: 0 }]).success, true);
  for (const questionCount of [undefined, -1, 1.5]) {
    assert.equal(shared.behavioralTemplateListResponseSchema.safeParse([{ ...row, questionCount }]).success, false, String(questionCount));
  }
});
