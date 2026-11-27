import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const fetchBehavioralTemplates = vi.fn();
const fetchBehavioralTemplate = vi.fn();
vi.mock("@/features/review-templates/api/behavioral-template-requests", () => ({
  fetchBehavioralTemplates: (...args: unknown[]) => fetchBehavioralTemplates(...args),
  fetchBehavioralTemplate: (...args: unknown[]) => fetchBehavioralTemplate(...args),
}));

import {
  getBehavioralTemplate,
  getBehavioralTemplates,
} from "@/features/review-templates/services/behavioral-template-reader";

const TEMPLATE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const ROW = {
  templateId: TEMPLATE_ID,
  company: "Mayon Consolidated Inc.",
  name: "Quarterly Performance Review",
  description: null,
  category: "general_performance",
  reviewType: "self",
  status: "draft",
  currentVersion: 1,
  publishedBy: null,
  publishedAt: null,
  archivedAt: null,
  createdAt: "2026-11-24T06:00:00.000Z",
  updatedAt: "2026-11-24T06:00:00.000Z",
  questionCount: 6,
};

beforeEach(() => {
  cookieGet.mockReset().mockReturnValue({ value: "token" });
  fetchBehavioralTemplates.mockReset();
  fetchBehavioralTemplate.mockReset();
});

describe("getBehavioralTemplates", () => {
  it("sends the session token and parses the list", async () => {
    fetchBehavioralTemplates.mockResolvedValue({ status: 200, data: [ROW] });

    const result = await getBehavioralTemplates();

    expect(fetchBehavioralTemplates).toHaveBeenCalledWith("token");
    expect(result).toMatchObject({ kind: "ok", data: [{ templateId: TEMPLATE_ID, status: "draft" }] });
  });

  it("is signed out without a cookie, and makes no request", async () => {
    cookieGet.mockReturnValue(undefined);

    expect(await getBehavioralTemplates()).toEqual({ kind: "signed_out" });
    expect(fetchBehavioralTemplates).not.toHaveBeenCalled();
  });

  it.each([
    [401, "signed_out"],
    [403, "forbidden"],
    [404, "not_found"],
  ])("maps a %s to %s", async (status, kind) => {
    fetchBehavioralTemplates.mockResolvedValue({ status, data: {} });

    expect(await getBehavioralTemplates()).toEqual({ kind });
  });

  it("is unavailable when the body does not match the contract, or the request throws", async () => {
    fetchBehavioralTemplates.mockResolvedValue({ status: 200, data: [{ templateId: "x" }] });
    expect(await getBehavioralTemplates()).toEqual({ kind: "unavailable" });

    fetchBehavioralTemplates.mockRejectedValue(new Error("boom"));
    expect(await getBehavioralTemplates()).toEqual({ kind: "unavailable" });
  });
});

describe("getBehavioralTemplate", () => {
  it("is not found for an id that is not a uuid, with no request", async () => {
    expect(await getBehavioralTemplate("not-a-uuid")).toEqual({ kind: "not_found" });
    expect(fetchBehavioralTemplate).not.toHaveBeenCalled();
  });

  it("parses the template tree the API sends", async () => {
    fetchBehavioralTemplate.mockResolvedValue({
      status: 200,
      data: { template: ROW, version: null, sections: [], questions: [], options: [] },
    });

    const result = await getBehavioralTemplate(TEMPLATE_ID);

    expect(fetchBehavioralTemplate).toHaveBeenCalledWith("token", TEMPLATE_ID, undefined);
    expect(result).toMatchObject({ kind: "ok", data: { template: { templateId: TEMPLATE_ID } } });
  });
});
