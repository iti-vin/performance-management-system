"use server";

import {
  cancelReviewCycleRequestSchema,
  extendReviewCycleRequestSchema,
  idSchema,
  releaseResultsRequestSchema,
  reopenReviewRequestSchema,
} from "@pms/shared-types";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import {
  postCancelReviewCycle,
  postExtendReviewCycle,
  postFinalizeReviewCycle,
  postReleaseResults,
  postLaunchReviewCycle,
  postReopenReview,
  postScheduleReviewCycle,
  deleteCycleSchedule,
} from "@/features/review-cycles/api/review-cycle-requests";
import { sendForMessage, type RequestWords } from "@/services/api-send";

type ManageResult = { message: string };

const NOT_FOUND = "This cycle was not found.";

/**
 * Launches a draft. The API freezes its templates and creates the assignments, in one
 * transaction. It goes to the register on success, and returns a message when it cannot:
 * for a cycle that is not ready, the message lists the problems.
 */
export async function launchReviewCycle(cycleId: string): Promise<ManageResult> {
  if (!idSchema.safeParse(cycleId).success) return { message: NOT_FOUND };

  const message = await sendForMessage((accessToken) => postLaunchReviewCycle(accessToken, cycleId), {
    okStatus: 200,
    logInAgain: "Your session ended. Log in again to launch the cycle.",
    couldNot: "The cycle could not be launched. Try again.",
    byStatus: {
      403: "Only HR administrators can launch review cycles.",
      404: NOT_FOUND,
      409: "Only a draft cycle can be launched. Reload the register.",
      422: "The cycle is not ready to launch.",
    },
  });
  if (message !== null) return { message };

  // `redirect` throws, so it stays outside the try block.
  redirect("/review-cycles?saved=launched");
}

/** Cancels a cycle with its reason. The id and the reason are checked again here. */
export async function cancelReviewCycle(cycleId: string, input: unknown): Promise<ManageResult> {
  if (!idSchema.safeParse(cycleId).success) return { message: NOT_FOUND };
  const body = cancelReviewCycleRequestSchema.safeParse(input);
  if (!body.success) return { message: body.error.issues[0]?.message ?? "Enter the reason for the cancellation." };

  const message = await sendForMessage((accessToken) => postCancelReviewCycle(accessToken, cycleId, body.data), {
    okStatus: 200,
    logInAgain: "Your session ended. Log in again to cancel the cycle.",
    couldNot: "The cycle could not be cancelled. Try again.",
    byStatus: {
      403: "Only HR administrators can cancel review cycles.",
      404: NOT_FOUND,
      409: "This cycle can no longer be cancelled. Reload the register.",
    },
  });
  if (message !== null) return { message };

  redirect("/review-cycles?saved=cancelled");
}

/**
 * Gives an active cycle later deadlines. The body is checked again here. On success the page
 * reads the cycle again, and the message is empty.
 */
export async function extendReviewCycle(cycleId: string, input: unknown): Promise<ManageResult> {
  if (!idSchema.safeParse(cycleId).success) return { message: NOT_FOUND };
  const body = extendReviewCycleRequestSchema.safeParse(input);
  if (!body.success) return { message: "Check the dates and the reason, then try again." };

  const message = await sendForMessage((accessToken) => postExtendReviewCycle(accessToken, cycleId, body.data), {
    okStatus: 200,
    logInAgain: "Your session ended. Log in again to extend the deadlines.",
    couldNot: "The deadlines could not be extended. Try again.",
    byStatus: {
      403: "Only HR administrators can extend deadlines.",
      404: NOT_FOUND,
      409: "These deadlines can no longer be changed. Reload the page.",
    },
  });
  if (message !== null) return { message };

  refresh();
  return { message: "" };
}

const reopeningSchema = reopenReviewRequestSchema.extend({ assignmentId: idSchema });

/** Opens a submitted review of a cycle again, with its reason. */
export async function reopenReview(cycleId: string, input: unknown): Promise<ManageResult> {
  if (!idSchema.safeParse(cycleId).success) return { message: NOT_FOUND };
  const parsed = reopeningSchema.safeParse(input);
  if (!parsed.success) return { message: "Choose a review and enter the reason, then try again." };
  const { assignmentId, ...body } = parsed.data;

  const message = await sendForMessage((accessToken) => postReopenReview(accessToken, { cycleId, assignmentId }, body), {
    okStatus: 200,
    logInAgain: "Your session ended. Log in again to reopen the review.",
    couldNot: "The review could not be reopened. Try again.",
    byStatus: {
      403: "Only HR administrators can reopen reviews.",
      404: "This review was not found.",
      409: "This review can no longer be reopened. Reload the page.",
    },
  });
  if (message !== null) return { message };

  refresh();
  return { message: "" };
}

/** A change of a cycle that takes no body: on success the page reads the cycle again. */
async function changeCycle(cycleId: string, post: typeof postFinalizeReviewCycle, words: RequestWords): Promise<ManageResult> {
  if (!idSchema.safeParse(cycleId).success) return { message: NOT_FOUND };
  const message = await sendForMessage((accessToken) => post(accessToken, cycleId), words);
  if (message !== null) return { message };

  refresh();
  return { message: "" };
}

/** Finalizes a cycle. The API names each review or report that still holds it back. */
export async function finalizeReviewCycle(cycleId: string): Promise<ManageResult> {
  return changeCycle(cycleId, postFinalizeReviewCycle, {
    okStatus: 200,
    logInAgain: "Your session ended. Log in again to finalize the cycle.",
    couldNot: "The cycle could not be finalized. Try again.",
    byStatus: {
      403: "Only HR administrators can finalize review cycles.",
      404: NOT_FOUND,
      409: "This cycle can no longer be finalized. Reload the page.",
    },
  });
}

/** Releases the results of a finalized cycle. */
export async function releaseResults(cycleId: string, input: unknown = {}): Promise<ManageResult> {
  const readers = releaseResultsRequestSchema.safeParse(input);
  if (!readers.success) return { message: "Choose who reads the results, then try again." };
  return changeCycle(cycleId, (accessToken, id) => postReleaseResults(accessToken, id, readers.data), {
    okStatus: 200,
    logInAgain: "Your session ended. Log in again to release the results.",
    couldNot: "The results could not be released. Try again.",
    byStatus: {
      403: "Only HR administrators can release results.",
      404: NOT_FOUND,
      409: "These results can no longer be released. Reload the page.",
    },
  });
}

/** Schedules a ready draft. For a cycle that is not ready, the message lists the problems. */
export async function scheduleReviewCycle(cycleId: string): Promise<ManageResult> {
  if (!idSchema.safeParse(cycleId).success) return { message: NOT_FOUND };

  const message = await sendForMessage((accessToken) => postScheduleReviewCycle(accessToken, cycleId), {
    okStatus: 200,
    logInAgain: "Your session ended. Log in again to schedule the cycle.",
    couldNot: "The cycle could not be scheduled. Try again.",
    byStatus: {
      403: "Only HR administrators can schedule review cycles.",
      404: NOT_FOUND,
      409: "Only a draft cycle can be scheduled. Reload the register.",
      422: "The cycle is not ready to be scheduled.",
    },
  });
  if (message !== null) return { message };

  redirect("/review-cycles?saved=scheduled");
}

/** Returns a scheduled cycle to draft, and opens it in the wizard. */
export async function unscheduleReviewCycle(cycleId: string): Promise<ManageResult> {
  if (!idSchema.safeParse(cycleId).success) return { message: NOT_FOUND };

  const message = await sendForMessage((accessToken) => deleteCycleSchedule(accessToken, cycleId), {
    okStatus: 200,
    logInAgain: "Your session ended. Log in again to change the cycle.",
    couldNot: "The cycle could not return to draft. Try again.",
    byStatus: {
      403: "Only HR administrators can change review cycles.",
      404: NOT_FOUND,
      409: "This cycle is no longer scheduled. Reload the page.",
    },
  });
  if (message !== null) return { message };

  redirect(`/review-cycles/${cycleId}/edit`);
}
