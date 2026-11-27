import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const get = vi.fn();
vi.mock("@/api/api-client", () => ({ apiClient: { get: (...args: unknown[]) => get(...args) } }));

import { getAccomplishment, getAccomplishments } from "@/features/position-goals/services/accomplishment-reader";
import { accomplishmentDetail, ACCOMPLISHMENT_ID, accomplishmentRow } from "../utils/accomplishment";

beforeEach(() => {
  vi.stubEnv("PMS_API_BASE_URL", "http://api.test");
  cookieGet.mockReset().mockReturnValue({ value: "token" });
  get.mockReset();
});

describe("getAccomplishments", () => {
  it("reads the list with the session token and parses it", async () => {
    get.mockResolvedValue({ status: 200, data: [accomplishmentRow()] });

    expect(await getAccomplishments()).toEqual({ kind: "ok", data: [accomplishmentRow()] });
    expect(get).toHaveBeenCalledWith(
      "http://api.test/accomplishments",
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
    );
  });

  it("is signed out without a cookie, and makes no request", async () => {
    cookieGet.mockReturnValue(undefined);

    expect(await getAccomplishments()).toEqual({ kind: "signed_out" });
    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    [401, "signed_out"],
    [403, "forbidden"],
  ])("maps a %s to %s", async (status, kind) => {
    get.mockResolvedValue({ status, data: {} });

    expect(await getAccomplishments()).toEqual({ kind });
  });

  it("is unavailable for a body that breaks the contract", async () => {
    get.mockResolvedValue({ status: 200, data: [{ accomplishmentId: "x" }] });

    expect(await getAccomplishments()).toEqual({ kind: "unavailable" });
  });
});

describe("getAccomplishment", () => {
  it("reads one record and parses it", async () => {
    get.mockResolvedValue({ status: 200, data: accomplishmentDetail() });

    expect(await getAccomplishment(ACCOMPLISHMENT_ID)).toEqual({ kind: "ok", data: accomplishmentDetail() });
    expect(get.mock.calls[0]?.[0]).toBe(`http://api.test/accomplishments/${ACCOMPLISHMENT_ID}`);
  });

  it("sends no request for an id that is not a GUID", async () => {
    expect(await getAccomplishment("../review-cycles")).toEqual({ kind: "not_found" });
    expect(get).not.toHaveBeenCalled();
  });

  it("says not found for a 404", async () => {
    get.mockResolvedValue({ status: 404, data: {} });

    expect(await getAccomplishment(ACCOMPLISHMENT_ID)).toEqual({ kind: "not_found" });
  });
});
