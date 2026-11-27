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

export function fetchGoalTemplates(accessToken: string) {
  return getRequest("kpi-goals", accessToken);
}

export function fetchGoalTemplate(accessToken: string, templateId: string, version?: number) {
  const suffix = version ? `/versions/${version}` : "";
  return getRequest(`kpi-goals/${templateId}${suffix}`, accessToken);
}

export function fetchGoalTemplateVersions(accessToken: string, templateId: string) {
  return getRequest(`kpi-goals/${templateId}/versions`, accessToken);
}

export function fetchGoalTemplatePositions(accessToken: string) {
  return getRequest("kpi-goals/positions", accessToken);
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

export function postCreateGoalTemplate(accessToken: string, body: unknown) {
  return postRequest("kpi-goals/create", accessToken, body);
}

export function postArchiveGoalTemplate(accessToken: string, templateId: string) {
  return postRequest(`kpi-goals/${templateId}/archived`, accessToken);
}

export function postPublishGoalTemplate(accessToken: string, templateId: string) {
  return postRequest(`kpi-goals/${templateId}/published`, accessToken);
}

export function postUpdateGoalTemplate(accessToken: string, templateId: string, body: unknown) {
  return postRequest(`kpi-goals/${templateId}/update`, accessToken, body);
}

/** Editing a published template publishes its next version. */
export function postGoalTemplateVersion(accessToken: string, templateId: string, body: unknown) {
  return postRequest(`kpi-goals/${templateId}/versions`, accessToken, body);
}

