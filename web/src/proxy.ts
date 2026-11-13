import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { refreshAccessToken } from "@/features/auth/services/refresh-session";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/features/auth/services/session-cookie";
import {
  decideRoute,
  needsRefresh,
} from "@/features/auth/services/session-guard";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const now = Math.floor(Date.now() / 1000);
  const decision = decideRoute(request.nextUrl.pathname, token, now);

  const response =
    decision.action === "redirect"
      ? NextResponse.redirect(new URL(decision.to, request.url))
      : NextResponse.next();
  if (decision.clearSession) response.cookies.delete(SESSION_COOKIE);

  // Sliding session: renew a token that is about to end, so an active user is
  // not sent back to log in. A cookie can be written here, not in a page render.
  // The current request still carries the old token, which is valid until it ends.
  if (token && needsRefresh(token, now)) {
    const renewed = await refreshAccessToken(token);
    if (renewed) {
      response.cookies.set(
        SESSION_COOKIE,
        renewed.accessToken,
        sessionCookieOptions(renewed.expiresIn),
      );
    }
  }
  return response;
}

export const config = {
  // Every page. Not Next internals, files in public/, or any path with a file extension.
  matcher: ["/((?!_next/static|_next/image|assets/|logo/|favicon.ico|.*\\..*).*)"],
};
