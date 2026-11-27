import type { ApiErrorDetail, ReviewAnswerDto, ReviewQuestionDto } from '@pms/shared-types';

/** The stored value of a rating question that the evaluator marked "Not observed". */
export const NOT_OBSERVED = 'not_observed';

/** `answers_json`: one value per answered question, keyed by question id. */
export type StoredAnswers = Record<string, number | string>;

const BLANK = { score: null, writtenAnswer: null, optionId: null, isNotObserved: false };

/** One stored value as an answer. The type of the frozen question says what the value means. */
function decodeOne(question: ReviewQuestionDto, value: number | string): ReviewAnswerDto {
  const answer = { ...BLANK, questionId: question.questionId };
  switch (question.questionType) {
    case 'rating_scale':
      return value === NOT_OBSERVED ? { ...answer, isNotObserved: true } : { ...answer, score: Number(value) };
    case 'multiple_choice':
      return { ...answer, optionId: String(value) };
    case 'short_answer':
    case 'paragraph':
      return { ...answer, writtenAnswer: String(value) };
  }
}

/** True when the answer holds a value. An empty one means that the question is not answered. */
function isAnswered(answer: ReviewAnswerDto): boolean {
  return answer.isNotObserved || answer.score !== null || Boolean(answer.writtenAnswer) || answer.optionId !== null;
}

const detail = (questionId: string, code: string, message: string): ApiErrorDetail => ({ field: `answers.${questionId}`, code, message });

/** The kinds of value that a question type takes. */
const TAKES: Record<ReviewQuestionDto['questionType'], (answer: ReviewAnswerDto) => boolean> = {
  rating_scale: (answer) => !answer.writtenAnswer && answer.optionId === null,
  multiple_choice: (answer) => !answer.writtenAnswer && answer.score === null && !answer.isNotObserved,
  short_answer: (answer) => answer.score === null && answer.optionId === null && !answer.isNotObserved,
  paragraph: (answer) => answer.score === null && answer.optionId === null && !answer.isNotObserved,
};

/** The one problem of an answer against its frozen question, or none. */
function fitIssue(answer: ReviewAnswerDto, question: ReviewQuestionDto | undefined): ApiErrorDetail[] {
  const { questionId } = answer;
  if (!question) return [detail(questionId, 'UNKNOWN_QUESTION', 'This question is not part of the review.')];
  if (!TAKES[question.questionType](answer)) {
    return [detail(questionId, 'WRONG_TYPE', `"${question.prompt}" does not take this kind of answer.`)];
  }
  if (answer.isNotObserved && !question.allowNotObserved) {
    return [detail(questionId, 'NOT_OBSERVED_NOT_ALLOWED', `"${question.prompt}" does not offer Not observed.`)];
  }
  if (answer.optionId !== null && !question.options.some((option) => option.optionId === answer.optionId)) {
    return [detail(questionId, 'UNKNOWN_OPTION', `Choose a listed option for "${question.prompt}".`)];
  }
  return [];
}

/** Answers that do not belong to the questions of the review. A partial set of answers is fine. */
export function fitIssues(questions: readonly ReviewQuestionDto[], answers: readonly ReviewAnswerDto[]): ApiErrorDetail[] {
  return answers.flatMap((answer) => fitIssue(answer, questions.find((question) => question.questionId === answer.questionId)));
}

/** The required questions with no answer: a submission needs all of them. */
export function missingRequired(questions: readonly ReviewQuestionDto[], answers: readonly ReviewAnswerDto[]): ApiErrorDetail[] {
  const answered = new Set(answers.filter(isAnswered).map((answer) => answer.questionId));
  return questions
    .filter((question) => question.isRequired && !answered.has(question.questionId))
    .map((question) => detail(question.questionId, 'REQUIRED', `Answer "${question.prompt}".`));
}

/** The filled answers as `answers_json` keeps them. */
export function encodeAnswers(answers: readonly ReviewAnswerDto[]): StoredAnswers {
  return Object.fromEntries(
    answers.filter(isAnswered).map((answer) => [
      answer.questionId,
      answer.isNotObserved ? NOT_OBSERVED : (answer.score ?? answer.optionId ?? String(answer.writtenAnswer)),
    ]),
  );
}

/** The stored answers in the order of the questions. A value of a question that the version does not hold is left out. */
export function decodeAnswers(questions: readonly ReviewQuestionDto[], stored: StoredAnswers): ReviewAnswerDto[] {
  return questions.flatMap((question) => {
    const value = stored[question.questionId];
    return value === undefined ? [] : [decodeOne(question, value)];
  });
}
