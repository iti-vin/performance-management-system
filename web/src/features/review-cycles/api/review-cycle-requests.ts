import "server-only";

import { apiClient } from "@/api/api-client";
import { getApiUrl } from "@/api/api-url";
import { deleteAuthorized, getAuthorized, postAuthorized, putAuthorized } from "@/api/authorized-requests";

export function fetchReviewCycles(accessToken: string) {
  return getAuthorized("review-cycles", accessToken);
}

/** One page of the All Reviews list. `search` is "" or starts with "?". */
export function fetchReviews(accessToken: string, search: string) {
  return getAuthorized(`reviews${search}`, accessToken);
}

export function fetchReview(accessToken: string, assignmentId: string) {
  return getAuthorized(`reviews/${assignmentId}`, accessToken);
}

/** Saves the draft answers of one review. */
export function putReviewDraft(accessToken: string, assignmentId: string, body: unknown) {
  return putAuthorized(`reviews/${assignmentId}/response`, accessToken, body);
}

/** Submits one review: its answers become read-only. */
export function postReviewSubmission(accessToken: string, assignmentId: string, body: unknown) {
  return postAuthorized(`reviews/${assignmentId}/submission`, accessToken, body);
}

/** What the wizard offers: employees, published templates, HR evaluators. */
export function fetchReviewCycleOptions(accessToken: string) {
  return getAuthorized("review-cycles/options", accessToken);
}

/** A create answers 201, unlike the other writes. */
export function postCreateReviewCycle(accessToken: string, body: unknown) {
  const url = getApiUrl("review-cycles");
  if (!url) return null;

  return apiClient.post<unknown>(url, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: "json",
    signal: AbortSignal.timeout(10_000),
    validateStatus: (status) => status === 201 || (status >= 400 && status < 500),
  });
}

export function fetchReviewCycle(accessToken: string, cycleId: string) {
  return getAuthorized(`review-cycles/${cycleId}`, accessToken);
}

export function fetchReviewCycleReadiness(accessToken: string, cycleId: string) {
  return getAuthorized(`review-cycles/${cycleId}/readiness`, accessToken);
}

/** Who takes part in a cycle, with their assignments. */
export function fetchReviewCycleParticipants(accessToken: string, cycleId: string) {
  return getAuthorized(`review-cycles/${cycleId}/participants`, accessToken);
}

/** Replaces the details, the stages, and the participants of a draft. */
export function putUpdateReviewCycle(accessToken: string, cycleId: string, body: unknown) {
  return putAuthorized(`review-cycles/${cycleId}`, accessToken, body);
}

/** Launches a draft: the API freezes its templates and creates the assignments. */
export function postLaunchReviewCycle(accessToken: string, cycleId: string) {
  return postAuthorized(`review-cycles/${cycleId}/launch`, accessToken);
}

/** Gives an active cycle later deadlines. */
export function postExtendReviewCycle(accessToken: string, cycleId: string, body: unknown) {
  return postAuthorized(`review-cycles/${cycleId}/extension`, accessToken, body);
}

/** Opens a submitted review of a cycle again. */
export function postReopenReview(accessToken: string, ids: { cycleId: string; assignmentId: string }, body: unknown) {
  return postAuthorized(`review-cycles/${ids.cycleId}/assignments/${ids.assignmentId}/reopening`, accessToken, body);
}

export function postCancelReviewCycle(accessToken: string, cycleId: string, body: unknown) {
  return postAuthorized(`review-cycles/${cycleId}/cancellation`, accessToken, body);
}

/** The cycles that wait for HR. */
export function fetchCycleAttention(accessToken: string) {
  return getAuthorized("review-cycle-attention", accessToken);
}

/** The recorded changes of one cycle. */
export function fetchCycleHistory(accessToken: string, cycleId: string) {
  return getAuthorized(`review-cycles/${cycleId}/history`, accessToken);
}

/** The finalized results of one cycle. */
export function fetchCycleResults(accessToken: string, cycleId: string) {
  return getAuthorized(`review-cycles/${cycleId}/results`, accessToken);
}

/** Freezes a draft, to activate on the day the assessment starts. */
export function postScheduleReviewCycle(accessToken: string, cycleId: string) {
  return postAuthorized(`review-cycles/${cycleId}/schedule`, accessToken);
}

/** Returns a scheduled cycle to draft. */
export function deleteCycleSchedule(accessToken: string, cycleId: string) {
  return deleteAuthorized(`review-cycles/${cycleId}/schedule`, accessToken);
}

/** Scores every participant and locks the work of the cycle. */
export function postFinalizeReviewCycle(accessToken: string, cycleId: string) {
  return postAuthorized(`review-cycles/${cycleId}/finalization`, accessToken);
}

/** Makes the results of a finalized cycle visible. */
export function postReleaseResults(accessToken: string, cycleId: string, body?: unknown) {
  return postAuthorized(`review-cycles/${cycleId}/release`, accessToken, body);
}

/** Every result that the caller may read. */
export function fetchResults(accessToken: string) {
  return getAuthorized("results", accessToken);
}

export function fetchResult(accessToken: string, participantId: string) {
  return getAuthorized(`results/${participantId}`, accessToken);
}
