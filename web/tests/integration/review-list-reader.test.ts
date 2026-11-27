import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const get = vi.fn();
vi.mock("@/api/api-client", () => ({ apiClient: { get: (...args: unknown[]) => get(...args) } }));

import { getReviews } from "@/features/review-cycles/services/review-cycle-reader";

const PAGE = {
  items: [
    {
      assignmentId: "17d1d193-0fc3-41e1-a13f-a45217488d5d",
      cycleId: "00000000-0000-0000-0000-000000000141",
      cycleName: "CY2026-Q4",
      cycleState: "active",
      subjectName: "Iging DotTech",
      subjectPosition: "Software Engineer",
      subjectDepartment: "IT",
      isAssignedToCaller: false,
      evaluatorName: "Maria Santos",
      perspective: "manager",
      state: "not_started",
      deadline: "2026-12-05T00:00:00.000Z",
      isOverdue: false,
    },
  ],
  page: 1,
  pageSize: 10,
  totalItems: 1,
  cycles: [],
  departments: [],
};

beforeEach(() => {
  vi.stubEnv("PMS_API_BASE_URL", "http://api.test");
  cookieGet.mockReset().mockReturnValue({ value: "token" });
  get.mockReset().mockResolvedValue({ status: 200, data: PAGE });
});

describe("getReviews", () => {
  it("sends the session token and the filters to /reviews, and parses the page", async () => {
    const result = await getReviews({ state: "locked", q: "maria", page: 2, pageSize: 10 });

    expect(get).toHaveBeenCalledWith(
      "http://api.test/reviews?state=locked&q=maria&page=2",
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
    );
    expect(result).toEqual({ kind: "ok", data: PAGE });
  });

  it("asks for /reviews with no query when nothing is set", async () => {
    await getReviews({ page: 1, pageSize: 10 });

    expect(get.mock.calls[0]?.[0]).toBe("http://api.test/reviews");
  });

  it("is signed out without a cookie, and makes no request", async () => {
    cookieGet.mockReturnValue(undefined);

    expect(await getReviews({ page: 1, pageSize: 10 })).toEqual({ kind: "signed_out" });
    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    [401, "signed_out"],
    [403, "forbidden"],
    [404, "not_found"],
  ])("maps a %s to %s", async (status, kind) => {
    get.mockResolvedValue({ status, data: {} });

    expect(await getReviews({ page: 1, pageSize: 10 })).toEqual({ kind });
  });

  it("is unavailable when the body breaks the contract or the request throws", async () => {
    get.mockResolvedValue({ status: 200, data: { items: [{ assignmentId: "x" }] } });
    expect(await getReviews({ page: 1, pageSize: 10 })).toEqual({ kind: "unavailable" });

    get.mockRejectedValue(new Error("boom"));
    expect(await getReviews({ page: 1, pageSize: 10 })).toEqual({ kind: "unavailable" });
  });
});
