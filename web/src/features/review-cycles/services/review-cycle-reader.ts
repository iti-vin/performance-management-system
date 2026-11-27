import "server-only";

import {
  cycleHistoryResponseSchema,
  type CycleHistoryEntryDto,
  idSchema,
  reviewCycleDetailSchema,
  reviewCycleListRowSchema,
  reviewCycleOptionsSchema,
  reviewCycleParticipantsSchema,
  reviewCycleReadinessSchema,
  reviewDetailSchema,
  reviewListResponseSchema,
  type ReviewCycleDetailDto,
  type ReviewCycleListRowDto,
  type ReviewCycleOptionsDto,
  type ReviewCycleParticipantDto,
  type ReviewCycleReadinessDto,
  type ReviewDetailDto,
  type ReviewListQueryDto,
  type ReviewListResponseDto,
} from "@pms/shared-types";
import { z } from "zod";
import {
  fetchReview,
  fetchReviewCycle,
  fetchReviewCycleOptions,
  fetchReviewCycleParticipants,
  fetchReviewCycleReadiness,
  fetchReviewCycles,
  fetchReviews,
  fetchCycleHistory,
} from "@/features/review-cycles/api/review-cycle-requests";
import { toReviewSearch } from "@/features/review-cycles/services/review-list-params";
import { readApi, type ApiReadResult } from "@/services/api-read";

const reviewCycleListSchema = z.array(reviewCycleListRowSchema);

export function getReviewCycles(): Promise<ApiReadResult<ReviewCycleListRowDto[]>> {
  return readApi(fetchReviewCycles, reviewCycleListSchema);
}

export function getReviewCycleOptions(): Promise<ApiReadResult<ReviewCycleOptionsDto>> {
  return readApi(fetchReviewCycleOptions, reviewCycleOptionsSchema);
}

/** A route id that is not a GUID is a cycle that does not exist: no request goes out for it. */
export async function getReviewCycle(cycleId: string): Promise<ApiReadResult<ReviewCycleDetailDto>> {
  if (!idSchema.safeParse(cycleId).success) return { kind: "not_found" };
  return readApi((accessToken) => fetchReviewCycle(accessToken, cycleId), reviewCycleDetailSchema);
}

export async function getReviewCycleReadiness(cycleId: string): Promise<ApiReadResult<ReviewCycleReadinessDto>> {
  if (!idSchema.safeParse(cycleId).success) return { kind: "not_found" };
  return readApi((accessToken) => fetchReviewCycleReadiness(accessToken, cycleId), reviewCycleReadinessSchema);
}

export function getReviews(params: ReviewListQueryDto): Promise<ApiReadResult<ReviewListResponseDto>> {
  return readApi((accessToken) => fetchReviews(accessToken, toReviewSearch(params)), reviewListResponseSchema);
}

export async function getReviewCycleParticipants(cycleId: string): Promise<ApiReadResult<ReviewCycleParticipantDto[]>> {
  if (!idSchema.safeParse(cycleId).success) return { kind: "not_found" };
  return readApi((accessToken) => fetchReviewCycleParticipants(accessToken, cycleId), reviewCycleParticipantsSchema);
}

/** A route id that is not a GUID is a review that does not exist: no request goes out for it. */
export async function getReview(assignmentId: string): Promise<ApiReadResult<ReviewDetailDto>> {
  if (!idSchema.safeParse(assignmentId).success) return { kind: "not_found" };
  return readApi((accessToken) => fetchReview(accessToken, assignmentId), reviewDetailSchema);
}

export async function getCycleHistory(cycleId: string): Promise<ApiReadResult<CycleHistoryEntryDto[]>> {
  if (!idSchema.safeParse(cycleId).success) return { kind: "not_found" };
  return readApi((accessToken) => fetchCycleHistory(accessToken, cycleId), cycleHistoryResponseSchema);
}
