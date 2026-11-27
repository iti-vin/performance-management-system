import "server-only";

import { apiClient } from "./api-client";
import { getApiUrl } from "./api-url";

/** Every call carries the session token, reads JSON, and gives up after ten seconds. */
function config(accessToken: string, answers: (status: number) => boolean) {
  return {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: "json" as const,
    signal: AbortSignal.timeout(10_000),
    validateStatus: answers,
  };
}

const isRead = (status: number) => status === 200 || status === 401 || status === 403 || status === 404;
const isWrite = (status: number) => status === 200 || (status >= 400 && status < 500);

/** A read of the API, or null when the API address is not configured. */
export function getAuthorized(path: string, accessToken: string) {
  const url = getApiUrl(path);
  return url ? apiClient.get<unknown>(url, config(accessToken, isRead)) : null;
}

/** A write that answers 200, or the refusal of the API. */
export function putAuthorized(path: string, accessToken: string, body: unknown) {
  const url = getApiUrl(path);
  return url ? apiClient.put<unknown>(url, body, config(accessToken, isWrite)) : null;
}

export function postAuthorized(path: string, accessToken: string, body?: unknown) {
  const url = getApiUrl(path);
  return url ? apiClient.post<unknown>(url, body, config(accessToken, isWrite)) : null;
}

export function deleteAuthorized(path: string, accessToken: string) {
  const url = getApiUrl(path);
  return url ? apiClient.delete<unknown>(url, config(accessToken, isWrite)) : null;
}
