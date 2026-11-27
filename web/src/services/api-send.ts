import "server-only";

import { readApiError, type ApiError } from "@pms/shared-types";
import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/features/auth/services/session-cookie";
import { apiErrorText } from "@/utils/api-error-text";

type ApiResponse = { status: number; data: unknown } | null;

/** The words of an action: what each status says, what a failure says, and what an ended session says. */
export interface RequestWords {
  /** The status that means the API took the request. */
  okStatus: number;
  logInAgain: string;
  couldNot: string;
  /** Words by status for the refusals that the API explains with a short rule. */
  byStatus: Readonly<Record<number, string>>;
}

/** A refusal or a failure: the words to show, and the error of the API when it sent one. */
export interface Refusal {
  text: string;
  error: ApiError | null;
}

function refusalOf(response: ApiResponse, words: RequestWords): Refusal | null {
  if (!response) return { text: words.couldNot, error: null };
  if (response.status === 401) return { text: words.logInAgain, error: null };
  if (response.status === words.okStatus) return null;
  // The reason of the API, with the messages of the fields (for example the problems of a cycle that is not ready).
  const text = apiErrorText(response.data, words.byStatus[response.status] ?? words.couldNot);
  return { text, error: readApiError(response.data) };
}

/** Sends the request with the session token, and returns the refusal, or null on success. */
export async function sendForRefusal(
  request: (accessToken: string) => Promise<ApiResponse> | ApiResponse,
  words: RequestWords,
): Promise<Refusal | null> {
  const accessToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!accessToken) return { text: words.logInAgain, error: null };
  try {
    return refusalOf(await request(accessToken), words);
  } catch {
    // Keep request headers and addresses out of the message.
    return { text: words.couldNot, error: null };
  }
}

/** Sends the request with the session token, and returns the message of a refusal, or null on success. */
export async function sendForMessage(
  request: (accessToken: string) => Promise<ApiResponse> | ApiResponse,
  words: RequestWords,
): Promise<string | null> {
  return (await sendForRefusal(request, words))?.text ?? null;
}
