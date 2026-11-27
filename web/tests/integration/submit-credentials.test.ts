import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitCredentials } from "@/features/auth/services/submit-credentials";

const { post, setCookie } = vi.hoisted(() => ({
  post: vi.fn(),
  setCookie: vi.fn(),
}));

vi.mock("@/api/api-client", () => ({ apiClient: { post } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: setCookie }) }));

const password = "example-password";

describe("submitCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PMS_API_BASE_URL", "http://localhost:4000/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("logs in and saves the token in an HttpOnly cookie", async () => {
    post.mockResolvedValueOnce({
      status: 200,
      data: { accessToken: "test-token", expiresIn: 3600 },
    });

    await expect(
      submitCredentials("login", { identifier: "janedoe", password }),
    ).resolves.toMatchObject({ isSuccess: true });
    expect(post).toHaveBeenCalledWith(
      "http://localhost:4000/auth/login",
      { identifier: "janedoe", password },
      expect.any(Object),
    );
    expect(setCookie).toHaveBeenCalledWith(
      "pms-session",
      "test-token",
      expect.objectContaining({ httpOnly: true, maxAge: 3600 }),
    );
  });

  it("identifies rejected login credentials without setting a session", async () => {
    post.mockResolvedValueOnce({ status: 401, data: {} });

    await expect(
      submitCredentials("login", { identifier: "janedoe", password }),
    ).resolves.toMatchObject({ kind: "invalidCredentials" });
    expect(setCookie).not.toHaveBeenCalled();
  });

  it("says to wait when the API limits the requests, and saves no session", async () => {
    post.mockResolvedValueOnce({ status: 429, data: {} });

    await expect(submitCredentials("login", { identifier: "janedoe", password })).resolves.toEqual({
      message: "Too many attempts. Wait a minute and try again.",
    });
    expect(setCookie).not.toHaveBeenCalled();
  });

  it.each(["sign-up", "register"])(
    "refuses the removed %s mode and sends no request",
    async (mode) => {
      const body = {
        employeeCode: "E001",
        username: "janedoe",
        password,
        confirmPassword: password,
      };

      await expect(submitCredentials(mode, body)).resolves.toEqual({
        message: "Check your details and try again.",
      });
      expect(post).not.toHaveBeenCalled();
      expect(setCookie).not.toHaveBeenCalled();
    },
  );
});
