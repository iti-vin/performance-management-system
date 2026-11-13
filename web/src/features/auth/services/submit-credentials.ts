"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  accountCreatedResponseSchema,
  authTokenResponseSchema,
  readApiError,
  type ApiErrorDetail,
} from "@pms/shared-types";

import { postCredentials } from "@/features/auth/api/auth-requests";
import {
  parseLogin,
  parseRegister,
  parseSignUp,
} from "@/features/auth/services/auth-credentials";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/features/auth/services/session-cookie";

const AUTH_REQUESTS = {
  login: parseLogin,
  "sign-up": parseSignUp,
  register: parseRegister,
} as const;

const NOT_CONFIGURED = "The authentication service is not configured.";
const COULD_NOT_COMPLETE = "Authentication could not be completed. Try again.";

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

export async function submitCredentials(
  mode: unknown,
  input: unknown,
): Promise<SubmitResult> {
  if (mode !== "login" && mode !== "sign-up" && mode !== "register") {
    return { message: "Check your details and try again." };
  }
  const body = AUTH_REQUESTS[mode](input);
  if (!body) {
    return { message: "Check your details and try again." };
  }

  let status: number;
  let data: unknown;
  try {
    const response = await postCredentials(mode, body);
    if (!response) return { message: NOT_CONFIGURED };
    status = response.status;
    data = response.data;
  } catch {
    return { message: "The authentication service is unavailable. Try again." };
  }

  if (status === 400) {
    return backendFailure(data, COULD_NOT_COMPLETE);
  }
  if (mode === "login") {
    if (status === 401) {
      return {
        kind: "invalidCredentials",
        message: "Email, username, or password is incorrect.",
      };
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

  // Account creation returns a profile. Login issues the token.
  // 409 has two causes: the employee has an account, or the username is taken.
  if (status === 409) {
    return backendFailure(data, "This employee already has an account. Log in instead.");
  }
  if (mode === "register" && status === 404) {
    return backendFailure(data, COULD_NOT_COMPLETE);
  }
  if (status < 200 || status >= 300) {
    return { message: COULD_NOT_COMPLETE };
  }
  const created = accountCreatedResponseSchema.safeParse(data);
  if (!created.success) {
    return {
      message: "The authentication service returned an invalid response.",
    };
  }
  if (mode === "register") {
    redirect("/login");
  }
  return {
    message: "Your account is ready. Log in to continue.",
    isSuccess: true,
  };
}
