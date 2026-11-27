import {
  submitBehavioralAssessmentRequestSchema,
  type ReviewAnswerDto,
  type ReviewQuestionDto,
  type ReviewSectionDto,
} from "@pms/shared-types";

/** The value of the form for a rating that the evaluator marks "Not observed". */
export const NOT_OBSERVED = "not_observed";

/** One value of the form as the answer of its question. */
function toAnswer({ questionId, questionType }: ReviewQuestionDto, value: string) {
  switch (questionType) {
    case "rating_scale":
      return value === NOT_OBSERVED ? { questionId, isNotObserved: true } : { questionId, score: Number(value) };
    case "multiple_choice":
      return { questionId, optionId: value };
    case "short_answer":
    case "paragraph":
      return { questionId, writtenAnswer: value };
  }
}

/**
 * The form keeps one text value per question id. The API takes a score, "Not observed", the
 * chosen option, or a written text, by the type of the question. A blank question is left out:
 * a draft may be incomplete. The written feedback is a free text beside the questions.
 */
export function toSubmitBehavioralAssessmentRequest(
  sections: readonly ReviewSectionDto[],
  values: Readonly<Record<string, string>>,
  writtenFeedback = "",
) {
  const answers = sections.flatMap((section) =>
    section.questions.flatMap((question) => {
      const value = values[question.questionId]?.trim() ?? "";
      return value ? [toAnswer(question, value)] : [];
    }),
  );
  return submitBehavioralAssessmentRequestSchema.safeParse({ answers, writtenFeedback });
}

/** The saved answers as the values of the form. */
export function fromReviewAnswers(answers: readonly ReviewAnswerDto[]): Record<string, string> {
  return Object.fromEntries(
    answers.flatMap((answer) => {
      const value = answer.isNotObserved
        ? NOT_OBSERVED
        : (answer.score?.toString() ?? answer.optionId ?? answer.writtenAnswer);
      return value ? [[answer.questionId, value]] : [];
    }),
  );
}
