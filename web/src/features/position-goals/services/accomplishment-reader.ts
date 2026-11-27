import "server-only";

import {
  accomplishmentDetailSchema,
  accomplishmentListSchema,
  idSchema,
  type AccomplishmentDetailDto,
  type AccomplishmentListRowDto,
} from "@pms/shared-types";

import { fetchAccomplishment, fetchAccomplishments } from "@/features/position-goals/api/accomplishment-requests";
import { readApi, type ApiReadResult } from "@/services/api-read";

export function getAccomplishments(): Promise<ApiReadResult<AccomplishmentListRowDto[]>> {
  return readApi(fetchAccomplishments, accomplishmentListSchema);
}

/** A route id that is not a GUID is a record that does not exist: no request goes out for it. */
export async function getAccomplishment(accomplishmentId: string): Promise<ApiReadResult<AccomplishmentDetailDto>> {
  if (!idSchema.safeParse(accomplishmentId).success) return { kind: "not_found" };
  return readApi((accessToken) => fetchAccomplishment(accessToken, accomplishmentId), accomplishmentDetailSchema);
}
