"use server";

import { createReviewCycleRequestSchema, idSchema } from "@pms/shared-types";
import { redirect } from "next/navigation";

import {
  postCreateReviewCycle,
  putUpdateReviewCycle,
} from "@/features/review-cycles/api/review-cycle-requests";
import { sendForMessage, type RequestWords } from "@/services/api-send";

type SaveResult = { message: string };

const LOG_IN_AGAIN = "Your session ended. Log in again to save the cycle.";
const COULD_NOT_SAVE = "The cycle could not be saved. Try again.";

const CREATE_WORDS: Omit<RequestWords, "okStatus"> = {
  logInAgain: LOG_IN_AGAIN,
  couldNot: COULD_NOT_SAVE,
  byStatus: { 403: "Only HR administrators can create review cycles." },
};
const UPDATE_WORDS: Omit<RequestWords, "okStatus"> = {
  logInAgain: LOG_IN_AGAIN,
  couldNot: COULD_NOT_SAVE,
  byStatus: {
    403: "Only HR administrators can edit review cycles.",
    404: "This cycle was not found.",
    409: "Only a draft cycle can be edited. Reload the register.",
  },
};

/**
 * Creates a draft cycle. It goes to the register on success, and returns a message
 * when it cannot. The body is checked again here: the client check is a convenience.
 */
export async function createReviewCycle(input: unknown): Promise<SaveResult> {
  const body = createReviewCycleRequestSchema.safeParse(input);
  if (!body.success) {
    return { message: body.error.issues[0]?.message ?? "Check the cycle and try again." };
  }

  const message = await sendForMessage((accessToken) => postCreateReviewCycle(accessToken, body.data), {
    ...CREATE_WORDS,
    okStatus: 201,
  });
  if (message !== null) return { message };

  // `redirect` throws, so it stays outside the try block.
  redirect("/review-cycles?saved=draft");
}

/** Replaces a draft: the same checks as the create, and the id is checked too. */
export async function updateReviewCycle(cycleId: string, input: unknown): Promise<SaveResult> {
  if (!idSchema.safeParse(cycleId).success) return { message: "This cycle was not found." };
  const body = createReviewCycleRequestSchema.safeParse(input);
  if (!body.success) {
    return { message: body.error.issues[0]?.message ?? "Check the cycle and try again." };
  }

  const message = await sendForMessage((accessToken) => putUpdateReviewCycle(accessToken, cycleId, body.data), {
    ...UPDATE_WORDS,
    okStatus: 200,
  });
  if (message !== null) return { message };

  redirect("/review-cycles?saved=updated");
}
