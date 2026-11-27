import { loadPage } from "@/utils/load-page";

/** True after this document showed a signed-in page. Only a new document empties it. */
let hasShownWorkspace = false;

export function markWorkspaceShown(): void {
  hasShownWorkspace = true;
}

/**
 * For the login page. The router keeps earlier pages hidden in the document, so after a
 * sign-out or an ended session the page loads again in full.
 */
export function leaveSignedInDocument(): void {
  if (hasShownWorkspace) loadPage("/login");
}
