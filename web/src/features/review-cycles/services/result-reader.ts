import "server-only";

import { idSchema, resultDetailSchema, resultListSchema, type ResultDetailDto, type ResultRowDto } from "@pms/shared-types";

import { fetchCycleResults, fetchResult, fetchResults } from "@/features/review-cycles/api/review-cycle-requests";
import { readApi, type ApiReadResult } from "@/services/api-read";

export function getResults(): Promise<ApiReadResult<ResultRowDto[]>> {
  return readApi(fetchResults, resultListSchema);
}

/** A route id that is not a GUID is a result that does not exist: no request goes out for it. */
export async function getResult(participantId: string): Promise<ApiReadResult<ResultDetailDto>> {
  if (!idSchema.safeParse(participantId).success) return { kind: "not_found" };
  return readApi((accessToken) => fetchResult(accessToken, participantId), resultDetailSchema);
}

export async function getCycleResults(cycleId: string): Promise<ApiReadResult<ResultRowDto[]>> {
  if (!idSchema.safeParse(cycleId).success) return { kind: "not_found" };
  return readApi((accessToken) => fetchCycleResults(accessToken, cycleId), resultListSchema);
}
