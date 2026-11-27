"use server";

import { cookies } from "next/headers";
import {
  authTokenResponseSchema,
  readApiError,
  type ApiErrorDetail,
} from "@pms/shared-types";

import { postCredentials } from "@/features/auth/api/auth-requests";
import { parseLogin } from "@/features/auth/services/auth-credentials";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/features/auth/services/session-cookie";

const NOT_CONFIGURED = "The authentication service is not configured.";
const COULD_NOT_COMPLETE = "Authentication could not be completed. Try again.";
const TOO_MANY = "Too many attempts. Wait a minute and try again.";

type SubmitResult = {
  message: string;
  isSuccess?: boolean;
  kind?: "invalidCredentials";
  details?: ApiErrorDetail[];
};

function backendFailure(data: unknown, fallback: string): SubmitResult {
  const error = readApiError(data);
  return error
    ? { message: error.message, ...(error.details.length && { details: error.details }) }
    : { message: fallback };
}

/** Logs in. "login" is the only mode: the backend has no sign-up or register route. */
export async function submitCredentials(
  mode: unknown,
  input: unknown,
): Promise<SubmitResult> {
  const body = mode === "login" ? parseLogin(input) : null;
  if (!body) {
    return { message: "Check your details and try again." };
  }

  let status: number;
  let data: unknown;
  try {
    const response = await postCredentials(body);
    if (!response) return { message: NOT_CONFIGURED };
    status = response.status;
    data = response.data;
  } catch {
    return { message: "The authentication service is unavailable. Try again." };
  }

  if (status === 400) {
    return backendFailure(data, COULD_NOT_COMPLETE);
  }
  if (status === 401) {
    return {
      kind: "invalidCredentials",
      message: "Email, username, or password is incorrect.",
    };
  }
  if (status === 429) {
    return { message: TOO_MANY };
  }
  if (status < 200 || status >= 300) {
    return { message: COULD_NOT_COMPLETE };
  }
  const token = authTokenResponseSchema.safeParse(data);
  if (!token.success) {
    return {
      message: "The authentication service returned an invalid response.",
    };
  }
  (await cookies()).set(
    SESSION_COOKIE,
    token.data.accessToken,
    sessionCookieOptions(token.data.expiresIn),
  );
  return { isSuccess: true, message: "Logged in." };
}
