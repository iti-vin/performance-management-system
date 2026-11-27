import "server-only";

import { getAuthorized, postAuthorized, putAuthorized } from "@/api/authorized-requests";

export function fetchAccomplishments(accessToken: string) {
  return getAuthorized("accomplishments", accessToken);
}

export function fetchAccomplishment(accessToken: string, accomplishmentId: string) {
  return getAuthorized(`accomplishments/${accomplishmentId}`, accessToken);
}

/** Saves the report as it stands. */
export function putAccomplishmentActuals(accessToken: string, accomplishmentId: string, body: unknown) {
  return putAuthorized(`accomplishments/${accomplishmentId}/actuals`, accessToken, body);
}

/** Submits the report: its values lock until the manager decides. */
export function postAccomplishmentSubmission(accessToken: string, accomplishmentId: string, body: unknown) {
  return postAuthorized(`accomplishments/${accomplishmentId}/submission`, accessToken, body);
}

/** Verifies a submitted report, or returns it. */
export function postAccomplishmentDecision(accessToken: string, accomplishmentId: string, body: unknown) {
  return postAuthorized(`accomplishments/${accomplishmentId}/decision`, accessToken, body);
}
