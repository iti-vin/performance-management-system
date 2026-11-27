import { describe, expect, it } from "vitest";
import type { ReviewSectionDto } from "@pms/shared-types";
import {
  NOT_OBSERVED,
  fromReviewAnswers,
  toSubmitBehavioralAssessmentRequest,
} from "@/features/evaluations/services/assessment-request";

const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [RATE, STRICT, NOTE, CHOICE, SHORT] = [guid(131), guid(132), guid(133), guid(134), guid(135)] as const;
const OPTION = guid(901);

const question = (questionId: string, questionType: ReviewSectionDto["questions"][number]["questionType"]) => ({
  questionId,
  prompt: "Question",
  questionType,
  isRequired: false,
  allowNotObserved: questionType === "rating_scale",
  options: [],
});
const SECTIONS: ReviewSectionDto[] = [
  { sectionId: guid(121), title: "One", questions: [question(RATE, "rating_scale"), question(STRICT, "rating_scale"), question(NOTE, "paragraph")] },
  { sectionId: guid(122), title: "Two", questions: [question(CHOICE, "multiple_choice"), question(SHORT, "short_answer")] },
];
const blank = { score: null, writtenAnswer: null, optionId: null, isNotObserved: false };

describe("toSubmitBehavioralAssessmentRequest", () => {
  it("sends a rating as a score, Not observed as its flag, a choice as its option, and a text as text", () => {
    const result = toSubmitBehavioralAssessmentRequest(SECTIONS, {
      [RATE]: NOT_OBSERVED,
      [STRICT]: "4",
      [NOTE]: "  Steady.  ",
      [CHOICE]: OPTION,
      [SHORT]: "Mentoring",
    });

    expect(result.success).toBe(true);
    expect(result.data?.answers).toEqual([
      { ...blank, questionId: RATE, isNotObserved: true },
      { ...blank, questionId: STRICT, score: 4 },
      { ...blank, questionId: NOTE, writtenAnswer: "Steady." },
      { ...blank, questionId: CHOICE, optionId: OPTION },
      { ...blank, questionId: SHORT, writtenAnswer: "Mentoring" },
    ]);
  });

  it("leaves out a blank answer, and a value of a question that the review does not hold", () => {
    const result = toSubmitBehavioralAssessmentRequest(SECTIONS, { [STRICT]: "", [NOTE]: "   ", [guid(999)]: "5" });

    expect(result.data?.answers).toEqual([]);
  });

  it("refuses a rating outside 1 to 5", () => {
    expect(toSubmitBehavioralAssessmentRequest(SECTIONS, { [STRICT]: "9" }).success).toBe(false);
  });
});

describe("fromReviewAnswers", () => {
  it("turns saved answers into the values of the form", () => {
    expect(
      fromReviewAnswers([
        { ...blank, questionId: RATE, isNotObserved: true },
        { ...blank, questionId: STRICT, score: 4 },
        { ...blank, questionId: CHOICE, optionId: OPTION },
        { ...blank, questionId: NOTE, writtenAnswer: "Steady." },
        { ...blank, questionId: SHORT },
      ]),
    ).toEqual({ [RATE]: NOT_OBSERVED, [STRICT]: "4", [CHOICE]: OPTION, [NOTE]: "Steady." });
  });
});

describe("the written feedback", () => {
  it("goes with the answers, trimmed, and blank when none is typed", () => {
    expect(toSubmitBehavioralAssessmentRequest([], {}, "  Good quarter.  ").data?.writtenFeedback).toBe("Good quarter.");
    expect(toSubmitBehavioralAssessmentRequest([], {}).data?.writtenFeedback).toBe("");
  });
});
