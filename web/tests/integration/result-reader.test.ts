import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
const get = vi.fn();
vi.mock("@/api/api-client", () => ({ apiClient: { get: (...args: unknown[]) => get(...args) } }));

import { getCycleResults, getResult, getResults } from "@/features/review-cycles/services/result-reader";

const ID = "00000000-0000-0000-0000-000000000151";
const ROW = {
  participantId: ID,
  cycleId: "00000000-0000-0000-0000-000000000141",
  cycleName: "ZZ demo",
  employeeName: "Ana Reyes",
  position: null,
  department: null,
  goalsScore: 4,
  behavioralScore: 4,
  overallScore: 4,
  finalizedAt: "2026-12-20T00:00:00.000Z",
  releasedAt: null,
};
const DETAIL = {
  ...ROW,
  evaluationStart: "2026-10-01",
  evaluationEnd: "2026-11-25",
  goalsWeight: 0.5,
  behavioralWeight: 0.5,
  goals: null,
  behavioral: null,
};

beforeEach(() => {
  vi.stubEnv("PMS_API_BASE_URL", "http://api.test");
  cookieGet.mockReset().mockReturnValue({ value: "token" });
  get.mockReset();
});

describe("the result reads", () => {
  it.each([
    ["the results of the caller", () => getResults(), "http://api.test/results", [ROW]],
    ["one result", () => getResult(ID), `http://api.test/results/${ID}`, DETAIL],
    ["the results of a cycle", () => getCycleResults(ROW.cycleId), `http://api.test/review-cycles/${ROW.cycleId}/results`, [ROW]],
  ])("reads %s with the session token and parses it", async (_what, read, url, data) => {
    get.mockResolvedValue({ status: 200, data });

    expect(await read()).toEqual({ kind: "ok", data });
    expect(get).toHaveBeenCalledWith(url, expect.objectContaining({ headers: { Authorization: "Bearer token" } }));
  });

  it("asks nothing for an id that is not a GUID", async () => {
    expect(await getResult("../me")).toEqual({ kind: "not_found" });
    expect(await getCycleResults("nope")).toEqual({ kind: "not_found" });
    expect(get).not.toHaveBeenCalled();
  });
});
