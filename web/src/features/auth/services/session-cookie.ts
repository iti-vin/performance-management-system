/** Name of the httpOnly cookie that holds the backend access token. */
export const SESSION_COOKIE = "pms-session";

/** The longest token the backend issues: two hours, from auth/refresh-token. */
export const SESSION_MAX_AGE_SECONDS = 7200;

/** Cookie options for a token that lasts `expiresIn` seconds. Used by login and by refresh. */
export function sessionCookieOptions(expiresIn: number) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.min(expiresIn, SESSION_MAX_AGE_SECONDS),
  } as const;
}
