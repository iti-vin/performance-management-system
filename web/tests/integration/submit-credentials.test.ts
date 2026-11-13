import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiError } from "@pms/shared-types";
import { submitCredentials } from "@/features/auth/services/submit-credentials";

const { post, setCookie, redirect } = vi.hoisted(() => ({
  post: vi.fn(),
  setCookie: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(path);
  }),
}));

vi.mock("@/api/api-client", () => ({ apiClient: { post } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: setCookie }) }));
vi.mock("next/navigation", () => ({ redirect }));

const account = {
  employeeCode: "E001",
  password: "example-password",
  confirmPassword: "example-password",
};
const created = {
  message: "Account created",
  data: {
    code: "E001",
    firstName: "Jane",
    lastName: "Doe",
    company: "",
    department: "",
    position: "",
    status: "active",
  },
};

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
      submitCredentials("login", {
        identifier: "janedoe",
        password: account.password,
      }),
    ).resolves.toMatchObject({ isSuccess: true });
    expect(post).toHaveBeenCalledWith(
      "http://localhost:4000/auth/login",
      { identifier: "janedoe", password: account.password },
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
      submitCredentials("login", {
        identifier: "janedoe",
        password: account.password,
      }),
    ).resolves.toMatchObject({ kind: "invalidCredentials" });
    expect(setCookie).not.toHaveBeenCalled();
  });

  it("creates a login for an existing PMS employee", async () => {
    post.mockResolvedValueOnce({ status: 200, data: created });

    const signUp = { ...account, username: "janedoe" };
    await expect(submitCredentials("sign-up", signUp)).resolves.toMatchObject({
      isSuccess: true,
    });
    expect(post).toHaveBeenCalledWith(
      "http://localhost:4000/auth/sign-up",
      signUp,
      expect.any(Object),
    );
    expect(setCookie).not.toHaveBeenCalled();
  });

  it("registers an HRDotNet employee with nullable employment fields and redirects to login", async () => {
    post.mockResolvedValueOnce({
      status: 200,
      data: {
        ...created,
        data: {
          ...created.data,
          company: null,
          department: null,
          position: null,
        },
      },
    });

    await expect(submitCredentials("register", account)).rejects.toThrow(
      "/login",
    );
    expect(post).toHaveBeenCalledWith(
      "http://localhost:4000/auth/register",
      account,
      expect.any(Object),
    );
    expect(setCookie).not.toHaveBeenCalled();
  });

  it("shows the backend message when the HRDotNet employee is missing", async () => {
    post.mockResolvedValueOnce({
      status: 404,
      data: createApiError({
        status: 404,
        message: "Employee not found",
        correlationId: "test",
      }),
    });

    await expect(submitCredentials("register", account)).resolves.toEqual({
      message: "Employee not found",
    });
  });
});
