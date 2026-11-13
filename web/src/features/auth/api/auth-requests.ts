import "server-only";

import type {
  LoginRequestDto,
  RegisterRequestDto,
  SignUpRequestDto,
} from "@pms/shared-types";
import { apiClient } from "@/api/api-client";
import { getApiUrl } from "@/api/api-url";

export function postCredentials(
  mode: "login" | "sign-up" | "register",
  body: LoginRequestDto | SignUpRequestDto | RegisterRequestDto,
) {
  const url = getApiUrl(`auth/${mode}`);
  if (!url) return null;

  return apiClient.post<unknown>(url, body, {
    responseType: "json",
    transitional: { silentJSONParsing: false },
    signal: AbortSignal.timeout(10_000),
    validateStatus: (code) => code < 300 || code >= 400,
  });
}

export function fetchCurrentUser(accessToken: string) {
  const url = getApiUrl("auth/me");
  if (!url) return null;

  return apiClient.get<unknown>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: "json",
    signal: AbortSignal.timeout(10_000),
    validateStatus: (status) => status === 200 || status === 401,
  });
}

export function postRefreshToken(accessToken: string) {
  const url = getApiUrl("auth/refresh-token");
  if (!url) return null;

  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accessToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
}
