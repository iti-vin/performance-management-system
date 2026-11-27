import "server-only";

import { apiClient } from "@/api/api-client";
import { getApiUrl } from "@/api/api-url";

function getRequest(path: string, accessToken: string) {
  const url = getApiUrl(path);
  if (!url) return null;

  return apiClient.get<unknown>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: "json",
    signal: AbortSignal.timeout(10_000),
    validateStatus: (status) =>
      status === 200 || status === 401 || status === 403 || status === 404,
  });
}

export function fetchBehavioralTemplates(accessToken: string) {
  return getRequest("behavioral-assessment", accessToken);
}

export function fetchBehavioralTemplate(accessToken: string, templateId: string, version?: number) {
  const suffix = version ? `/versions/${version}` : "";
  return getRequest(`behavioral-assessment/${templateId}${suffix}`, accessToken);
}

export function fetchBehavioralTemplateVersions(accessToken: string, templateId: string) {
  return getRequest(`behavioral-assessment/${templateId}/versions`, accessToken);
}

function postRequest(path: string, accessToken: string, body?: unknown) {
  const url = getApiUrl(path);
  if (!url) return null;

  return apiClient.post<unknown>(url, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: "json",
    signal: AbortSignal.timeout(10_000),
    validateStatus: (status) => status === 200 || (status >= 400 && status < 500),
  });
}

export function postCreateBehavioralTemplate(accessToken: string, body: unknown) {
  return postRequest("behavioral-assessment/create", accessToken, body);
}

export function postUpdateBehavioralTemplate(
  accessToken: string,
  templateId: string,
  body: unknown,
) {
  return postRequest(`behavioral-assessment/${templateId}/update`, accessToken, body);
}

/** Editing a published template publishes its next version. */
export function postBehavioralTemplateVersion(
  accessToken: string,
  templateId: string,
  body: unknown,
) {
  return postRequest(`behavioral-assessment/${templateId}/versions`, accessToken, body);
}

export function postArchiveBehavioralTemplate(accessToken: string, templateId: string) {
  return postRequest(`behavioral-assessment/${templateId}/archived`, accessToken);
}

export function postPublishBehavioralTemplate(accessToken: string, templateId: string) {
  return postRequest(`behavioral-assessment/${templateId}/published`, accessToken);
}
