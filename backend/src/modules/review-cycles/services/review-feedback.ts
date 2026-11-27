import type { StoredAnswers } from './review-answers.js';

/** The key of the written feedback inside `answers_json`. A question id is a GUID, so the two never meet. */
export const FEEDBACK_KEY = 'written_feedback';

export function withFeedback(answers: StoredAnswers, writtenFeedback: string): StoredAnswers {
  return writtenFeedback ? { ...answers, [FEEDBACK_KEY]: writtenFeedback } : answers;
}

export function feedbackIn(answers: StoredAnswers): string | null {
  const text = answers[FEEDBACK_KEY];
  return typeof text === 'string' && text !== '' ? text : null;
}
