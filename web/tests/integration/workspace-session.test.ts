import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/features/auth/services/current-user";
import { signOut } from "@/features/auth/services/sign-out";

const { get, readCookie, deleteCookie, redirect } = vi.hoisted(() => ({
  get: vi.fn(),
  readCookie: vi.fn(),
  deleteCookie: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(path);
  }),
}));

vi.mock("@/api/api-client", () => ({ apiClient: { get } }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: readCookie, delete: deleteCookie }),
}));
vi.mock("next/navigation", () => ({ redirect, RedirectType: { replace: "replace" } }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

describe("workspace session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PMS_API_BASE_URL", "http://localhost:4000/");
    readCookie.mockReturnValue({ value: "test-token" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads the current user using the session cookie as a bearer token", async () => {
    const user = {
      userId: "1",
      email: null,
      username: "janedoe",
      role: "MANAGER",
      employeeCode: "ITI-003",
      firstName: "Jane",
      lastName: "Doe",
    };
    get.mockResolvedValueOnce({ status: 200, data: user });

    await expect(getCurrentUser()).resolves.toEqual(user);
    expect(readCookie).toHaveBeenCalledWith("pms-session");
    expect(get).toHaveBeenCalledWith(
      "http://localhost:4000/auth/me",
      expect.objectContaining({
        headers: { Authorization: "Bearer test-token" },
      }),
    );
  });

  it("skips the backend when the session cookie is missing", async () => {
    readCookie.mockReturnValueOnce(undefined);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it("returns no user when the backend rejects the token", async () => {
    get.mockResolvedValueOnce({ status: 401 });

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("clears the session cookie and redirects to login on logout", async () => {
    await expect(signOut()).rejects.toThrow("/login");
    expect(deleteCookie).toHaveBeenCalledWith("pms-session");
    expect(redirect).toHaveBeenCalledWith("/login", "replace");
  });
});
