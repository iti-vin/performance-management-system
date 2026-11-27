"use server";

import {
  idSchema,
  saveGoalTemplateRequestSchema,
} from "@pms/shared-types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/features/auth/services/session-cookie";
import {
  postGoalTemplateVersion,
  postArchiveGoalTemplate,
  postPublishGoalTemplate,
  postUpdateGoalTemplate,
} from "@/features/review-templates/api/goal-template-requests";
import { apiErrorText } from "@/utils/api-error-text";
import { GOAL_TEMPLATE_PATH } from "@/constants/goal-template-path";

type ActionResult = { message: string };
type Response = { status: number; data: unknown } | null;

const LOG_IN_AGAIN = "Your session ended. Log in again to change this template.";
const COULD_NOT_SAVE = "The template could not be saved. Try again.";
const CHECK_TEMPLATE = "Check the template and try again.";

/** The words for a response that is not a success, with no raw error in them. */
function failureOf(response: Response, fallback = COULD_NOT_SAVE): string | null {
  if (!response) return fallback;
  if (response.status === 200) return null;
  if (response.status === 401) return LOG_IN_AGAIN;
  return apiErrorText(response.data, fallback);
}

/** A server action takes any string from the client, and the id goes into a request path. */
function isTemplateId(value: unknown): value is string {
  return idSchema.safeParse(value).success;
}

async function getAccessToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Saves a draft, publishes a draft, or publishes the next version of a published template. */
async function saveEdits(
  accessToken: string,
  templateId: string,
  body: unknown,
  intent: "draft" | "publish" | "update",
): Promise<{ message: string } | { saved: string }> {
  if (intent === "update") {
    const message = failureOf(await postGoalTemplateVersion(accessToken, templateId, body));
    return message ? { message } : { saved: "updated" };
  }

  const message = failureOf(await postUpdateGoalTemplate(accessToken, templateId, body));
  if (message) return { message };
  if (intent === "draft") return { saved: "draft" };

  // The edits are saved now. A failed publish leaves a draft, and says so.
  const published = failureOf(await postPublishGoalTemplate(accessToken, templateId));
  return { saved: published ? "publish_failed" : "published" };
}

/**
 * Saves the edits of a template. The body is checked again here: the client check
 * is a convenience. It redirects to the list on success and returns a message on failure.
 */
export async function saveGoalTemplateEdits(
  templateId: string,
  input: unknown,
  intent: unknown,
): Promise<ActionResult> {
  if (!isTemplateId(templateId)) return { message: CHECK_TEMPLATE };
  if (intent !== "draft" && intent !== "publish" && intent !== "update") {
    return { message: CHECK_TEMPLATE };
  }
  const body = saveGoalTemplateRequestSchema.safeParse(input);
  if (!body.success) return { message: body.error.issues[0]?.message ?? CHECK_TEMPLATE };
  const accessToken = await getAccessToken();
  if (!accessToken) return { message: LOG_IN_AGAIN };

  let outcome: Awaited<ReturnType<typeof saveEdits>>;
  try {
    outcome = await saveEdits(accessToken, templateId, body.data, intent);
  } catch {
    return { message: COULD_NOT_SAVE };
  }
  if ("message" in outcome) return outcome;
  // `redirect` throws, so it stays outside the try block.
  redirect(`${GOAL_TEMPLATE_PATH}?saved=${outcome.saved}`);
}

/** Publishes a saved draft as it is. The API checks the weights, and its message comes back. */
export async function publishGoalTemplate(templateId: string): Promise<ActionResult> {
  if (!isTemplateId(templateId)) return { message: CHECK_TEMPLATE };
  const accessToken = await getAccessToken();
  if (!accessToken) return { message: LOG_IN_AGAIN };

  let message: string | null;
  try {
    message = failureOf(
      await postPublishGoalTemplate(accessToken, templateId),
      "The template could not be published. Try again.",
    );
  } catch {
    message = "The template could not be published. Try again.";
  }
  if (message) return { message };
  redirect(`${GOAL_TEMPLATE_PATH}?saved=published`);
}

/** Archives a draft or a published template. It cannot be undone from the app. */
export async function archiveGoalTemplate(templateId: string): Promise<ActionResult> {
  if (!isTemplateId(templateId)) return { message: CHECK_TEMPLATE };
  const accessToken = await getAccessToken();
  if (!accessToken) return { message: LOG_IN_AGAIN };

  const fallback = "The template could not be archived. Try again.";
  let message: string | null;
  try {
    message = failureOf(await postArchiveGoalTemplate(accessToken, templateId), fallback);
  } catch {
    message = fallback;
  }
  if (message) return { message };
  redirect(`${GOAL_TEMPLATE_PATH}?saved=archived`);
}
