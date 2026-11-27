import "server-only";

import {
  goalTemplateDetailResponseSchema,
  goalTemplateListResponseSchema,
  goalTemplatePositionListResponseSchema,
  idSchema,
  templateVersionListResponseSchema,
  type TemplateVersionDto,
  type GoalTemplateDetailResponseDto,
  type GoalTemplateListResponseDto,
} from "@pms/shared-types";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { z, ZodType } from "zod";
import { SESSION_COOKIE } from "@/features/auth/services/session-cookie";
import {
  fetchGoalTemplate,
  fetchGoalTemplateVersions,
  fetchGoalTemplatePositions,
  fetchGoalTemplates,
} from "@/features/review-templates/api/goal-template-requests";

/** What a page needs to know about a read, with no raw error or header in it. */
export type GoalTemplateReadResult<Data> =
  | { kind: "ok"; data: Data }
  | { kind: "signed_out" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "unavailable" };

type TemplateResponse = { status: number; data: unknown } | null;

async function readTemplates<Data>(
  request: (
    accessToken: string,
  ) => Promise<TemplateResponse> | TemplateResponse,
  schema: ZodType<Data>,
): Promise<GoalTemplateReadResult<Data>> {
  const accessToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!accessToken) return { kind: "signed_out" };

  // The HTTP client reads the clock: mark the render as request-time first.
  await connection();

  try {
    const response = await request(accessToken);
    if (!response) return { kind: "unavailable" };
    if (response.status === 401) return { kind: "signed_out" };
    if (response.status === 403) return { kind: "forbidden" };
    if (response.status === 404) return { kind: "not_found" };

    const parsed = schema.safeParse(response.data);
    return parsed.success
      ? { kind: "ok", data: parsed.data }
      : { kind: "unavailable" };
  } catch {
    // Keep request headers out of the error.
    return { kind: "unavailable" };
  }
}

export function getGoalTemplates(): Promise<
  GoalTemplateReadResult<GoalTemplateListResponseDto>
> {
  return readTemplates(fetchGoalTemplates, goalTemplateListResponseSchema);
}

export function getGoalTemplatePositions(): Promise<
  GoalTemplateReadResult<z.infer<typeof goalTemplatePositionListResponseSchema>>
> {
  return readTemplates(
    fetchGoalTemplatePositions,
    goalTemplatePositionListResponseSchema,
  );
}

export async function getGoalTemplateVersions(templateId: string): Promise<GoalTemplateReadResult<TemplateVersionDto[]>> {
  if (!idSchema.safeParse(templateId).success) return { kind: "not_found" };

  return readTemplates((accessToken) => fetchGoalTemplateVersions(accessToken, templateId), templateVersionListResponseSchema);
}

export async function getGoalTemplate(
  templateId: string,
  version?: number,
): Promise<GoalTemplateReadResult<GoalTemplateDetailResponseDto>> {
  if (!idSchema.safeParse(templateId).success) return { kind: "not_found" };

  return readTemplates(
    (accessToken) => fetchGoalTemplate(accessToken, templateId, version),
    goalTemplateDetailResponseSchema,
  );
}
