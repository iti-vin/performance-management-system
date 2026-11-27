import "server-only";

import { cycleAttentionResponseSchema, type CycleAttentionDto } from "@pms/shared-types";

import { fetchCycleAttention } from "@/features/review-cycles/api/review-cycle-requests";
import { readApi, type ApiReadResult } from "@/services/api-read";

export function getCycleAttention(): Promise<ApiReadResult<CycleAttentionDto[]>> {
  return readApi(fetchCycleAttention, cycleAttentionResponseSchema);
}
