"use server";

import { idSchema, submitBehavioralAssessmentRequestSchema } from "@pms/shared-types";
import { refresh } from "next/cache";

import { postReviewSubmission, putReviewDraft } from "@/features/review-cycles/api/review-cycle-requests";
import { sendForRefusal, type Refusal, type RequestWords } from "@/services/api-send";
import type { FormActionResult } from "@/types/form-action";

/** A field of the API that names one question: `answers.<questionId>`. */
const ANSWER_FIELD = /^answers\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const BY_STATUS = {
  404: "This review was not found.",
  409: "This review can no longer be changed. Reload the page.",
};

const SAVE_WORDS: RequestWords = {
  okStatus: 200,
  logInAgain: "Your session ended. Log in again to save your answers.",
  couldNot: "Your answers could not be saved. Try again.",
  byStatus: BY_STATUS,
};
const SUBMIT_WORDS: RequestWords = {
  okStatus: 200,
  logInAgain: "Your session ended. Log in again to submit the review.",
  couldNot: "The review could not be submitted. Try again.",
  byStatus: BY_STATUS,
};

const failed = (message: string): FormActionResult => ({ message, fieldErrors: {} });

/** The problems that name a question go to that question. Everything else stays in the message. */
function toResult({ text, error }: Refusal): FormActionResult {
  if (!error) return failed(text);
  const fieldErrors: Record<string, string> = {};
  const rest: string[] = [];
  for (const { field, message } of error.details) {
    const questionId = ANSWER_FIELD.exec(field ?? "")?.[1];
    if (questionId) fieldErrors[questionId] = message;
    else rest.push(message);
  }
  return { message: [error.message, ...rest].join(" "), fieldErrors };
}

/** Checks the id and the body again here: the check of the form is a convenience. */
async function sendAnswers(
  assignmentId: string,
  input: unknown,
  post: typeof putReviewDraft,
  words: RequestWords,
): Promise<FormActionResult> {
  if (!idSchema.safeParse(assignmentId).success) return failed(BY_STATUS[404]);
  const body = submitBehavioralAssessmentRequestSchema.safeParse(input);
  if (!body.success) return failed("Check your answers and try again.");

  const refusal = await sendForRefusal((accessToken) => post(accessToken, assignmentId, body.data), words);
  if (refusal) return toResult(refusal);

  // The page reads the review again: its state, and the answers as the API stored them.
  refresh();
  return { message: null, fieldErrors: {} };
}

export async function saveReviewDraft(assignmentId: string, input: unknown): Promise<FormActionResult> {
  return sendAnswers(assignmentId, input, putReviewDraft, SAVE_WORDS);
}

export async function submitReview(assignmentId: string, input: unknown): Promise<FormActionResult> {
  return sendAnswers(assignmentId, input, postReviewSubmission, SUBMIT_WORDS);
}
