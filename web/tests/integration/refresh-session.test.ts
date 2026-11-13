import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { refreshAccessToken } from "@/features/auth/services/refresh-session";
import {
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "@/features/auth/services/session-cookie";
import { needsRefresh } from "@/features/auth/services/session-guard";

const NOW = 1_800_000_000;

function tokenExpiringIn(seconds: number) {
  const payload = btoa(JSON.stringify({ sub: "1", exp: NOW + seconds }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
}

describe("needsRefresh", () => {
  it("is true in the last ten minutes of a live token", () => {
    expect(needsRefresh(tokenExpiringIn(600), NOW)).toBe(true);
    expect(needsRefresh(tokenExpiringIn(1), NOW)).toBe(true);
  });

  it("is false for a fresh token, an expired token, and no token", () => {
    expect(needsRefresh(tokenExpiringIn(601), NOW)).toBe(false);
    expect(needsRefresh(tokenExpiringIn(0), NOW)).toBe(false);
    expect(needsRefresh("garbage", NOW)).toBe(false);
    expect(needsRefresh(undefined, NOW)).toBe(false);
  });
});

describe("sessionCookieOptions", () => {
  it("is httpOnly and caps the lifetime", () => {
    expect(sessionCookieOptions(3600)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
    expect(sessionCookieOptions(999_999).maxAge).toBe(SESSION_MAX_AGE_SECONDS);
  });
});

describe("refreshAccessToken", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("PMS_API_BASE_URL", "http://localhost:4000/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it("posts the current token and returns the new one", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ accessToken: "new-token", expiresIn: 7200 }),
    );

    await expect(refreshAccessToken("old-token")).resolves.toEqual({
      accessToken: "new-token",
      expiresIn: 7200,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/auth/refresh-token",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ accessToken: "old-token" }),
      }),
    );
  });

  it("returns null when the backend rejects the token", async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 401 }));

    await expect(refreshAccessToken("old-token")).resolves.toBeNull();
  });

  it("returns null when the body is not a token response", async () => {
    fetchMock.mockResolvedValue(Response.json({ accessToken: "" }));

    await expect(refreshAccessToken("old-token")).resolves.toBeNull();
  });

  it("returns null when the backend is unreachable or not configured", async () => {
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));
    await expect(refreshAccessToken("old-token")).resolves.toBeNull();

    vi.stubEnv("PMS_API_BASE_URL", "");
    await expect(refreshAccessToken("old-token")).resolves.toBeNull();
  });
});
