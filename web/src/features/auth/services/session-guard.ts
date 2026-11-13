import { z } from "zod";

/**
 * Route guard rules, kept apart from `proxy.ts` so they can be tested.
 *
 * The guard is a gate for pages, not authorization. It cannot check the token
 * signature, because the signing secret belongs to the backend alone. It reads
 * the `exp` claim only, so an expired cookie sends the user back to log in.
 * The backend checks the signature and the user on every API call.
 */

/** Pages for people who are not logged in. A logged-in user is sent away from them. */
const AUTH_PAGES = ["/login", "/sign-up", "/register"] as const;

const LOGIN_PATH = "/login";
const HOME_PATH = "/";

const tokenPayloadSchema = z.object({ exp: z.number() });

export type GuardDecision =
  | { action: "next"; clearSession: boolean }
  | { action: "redirect"; to: string; clearSession: boolean };

/** The `exp` claim of a JWT in seconds, or null when the token cannot be read. */
export function readTokenExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = tokenPayloadSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data.exp : null;
  } catch {
    return null;
  }
}

/** Refresh a token in its last ten minutes. The backend refuses an expired one. */
const REFRESH_WINDOW_SECONDS = 600;

/** True when the token is still valid and close enough to its end to renew. */
export function needsRefresh(token: string | undefined, nowSeconds: number) {
  const expiry = token ? readTokenExpiry(token) : null;
  if (expiry === null) return false;
  const remaining = expiry - nowSeconds;
  return remaining > 0 && remaining <= REFRESH_WINDOW_SECONDS;
}

export function isAuthPage(pathname: string) {
  return AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );
}

/**
 * What to do with a request. `clearSession` is true when the cookie exists but
 * cannot be used, so the browser drops it instead of sending it again.
 */
export function decideRoute(
  pathname: string,
  token: string | undefined,
  nowSeconds: number,
): GuardDecision {
  const expiry = token ? readTokenExpiry(token) : null;
  const hasSession = expiry !== null && expiry > nowSeconds;
  const clearSession = Boolean(token) && !hasSession;

  if (hasSession) {
    return isAuthPage(pathname)
      ? { action: "redirect", to: HOME_PATH, clearSession: false }
      : { action: "next", clearSession: false };
  }
  return isAuthPage(pathname)
    ? { action: "next", clearSession }
    : { action: "redirect", to: LOGIN_PATH, clearSession };
}
