"use server";

import {
  goalTemplateDetailResponseSchema,
  saveGoalTemplateRequestSchema,
} from "@pms/shared-types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/features/auth/services/session-cookie";
import {
  postCreateGoalTemplate,
  postPublishGoalTemplate,
} from "@/features/review-templates/api/goal-template-requests";
import { apiErrorText } from "@/utils/api-error-text";
import { GOAL_TEMPLATE_PATH } from "@/constants/goal-template-path";

type CreateResult = { message: string };

const LOG_IN_AGAIN = "Your session ended. Log in again to create a template.";
const NOT_HR = "Only HR administrators can create KPI goal templates.";
const COULD_NOT_SAVE = "The template could not be saved. Try again.";

async function createDraft(accessToken: string, body: unknown) {
  const response = await postCreateGoalTemplate(accessToken, body);
  if (!response) return { message: COULD_NOT_SAVE };
  if (response.status === 401) return { message: LOG_IN_AGAIN };
  if (response.status === 403) {
    // A 403 is the role, or an account with no linked company: show which.
    return { message: apiErrorText(response.data, NOT_HR) };
  }
  if (response.status !== 200) {
    return { message: apiErrorText(response.data, COULD_NOT_SAVE) };
  }

  const created = goalTemplateDetailResponseSchema.safeParse(response.data);
  return created.success
    ? { templateId: created.data.template.templateId }
    : { message: COULD_NOT_SAVE };
}

/**
 * Creates a draft KPI goal template, and publishes it when the intent is
 * "publish". It redirects to the template on success, and returns a message when
 * it cannot. The body is checked again here: the client check is a convenience.
 */
export async function createGoalTemplate(
  input: unknown,
  intent: unknown,
): Promise<CreateResult> {
  if (intent !== "draft" && intent !== "publish") {
    return { message: "Check the template and try again." };
  }
  const body = saveGoalTemplateRequestSchema.safeParse(input);
  if (!body.success) {
    return {
      message: body.error.issues[0]?.message ?? "Check the template and try again.",
    };
  }
  const accessToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!accessToken) return { message: LOG_IN_AGAIN };

  let draft: Awaited<ReturnType<typeof createDraft>>;
  try {
    draft = await createDraft(accessToken, body.data);
  } catch {
    // Keep request headers and addresses out of the message.
    return { message: COULD_NOT_SAVE };
  }
  if (!draft.templateId) return { message: draft.message ?? COULD_NOT_SAVE };
  const { templateId } = draft;

  // The draft exists now. A failed publish must not read as an unsaved template:
  // the user would save it again and create a duplicate.
  let saved = "draft";
  if (intent === "publish") {
    try {
      const published = await postPublishGoalTemplate(accessToken, templateId);
      saved = published?.status === 200 ? "published" : "publish_failed";
    } catch {
      saved = "publish_failed";
    }
  }

  // Like the legacy builder, go back to the list. The flag tells it what happened.
  // `redirect` throws, so it stays outside the try block.
  redirect(`${GOAL_TEMPLATE_PATH}?saved=${saved}`);
}
