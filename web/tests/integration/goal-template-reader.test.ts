import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const fetchGoalTemplates = vi.fn();
const fetchGoalTemplate = vi.fn();
const fetchGoalTemplatePositions = vi.fn();
vi.mock("@/features/review-templates/api/goal-template-requests", () => ({
  fetchGoalTemplates: (...args: unknown[]) => fetchGoalTemplates(...args),
  fetchGoalTemplate: (...args: unknown[]) => fetchGoalTemplate(...args),
  fetchGoalTemplatePositions: (...args: unknown[]) =>
    fetchGoalTemplatePositions(...args),
}));

import {
  getGoalTemplate,
  getGoalTemplatePositions,
  getGoalTemplates,
} from "@/features/review-templates/services/goal-template-reader";

const TEMPLATE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const template = {
  templateId: TEMPLATE_ID,
  position: "Software Engineer",
  company: "Mayon Consolidated Inc.",
  name: "Software Engineer Performance Goals",
  description: null,
  status: "draft",
  currentVersion: 1,
  publishedBy: null,
  publishedAt: null,
  archivedAt: null,
  createdAt: "2026-11-13T08:00:00.000Z",
  updatedAt: "2026-11-13T08:00:00.000Z",
};

beforeEach(() => {
  cookieGet.mockReset().mockReturnValue({ value: "token" });
  fetchGoalTemplates.mockReset();
  fetchGoalTemplate.mockReset();
  fetchGoalTemplatePositions.mockReset();
});

describe("getGoalTemplates", () => {
  it("sends the session token and parses the list", async () => {
    fetchGoalTemplates.mockResolvedValue({
      status: 200,
      data: [{ ...template, indicatorCount: "4" }],
    });

    const result = await getGoalTemplates();

    expect(fetchGoalTemplates).toHaveBeenCalledWith("token");
    expect(result).toMatchObject({
      kind: "ok",
      data: [{ position: "Software Engineer", indicatorCount: 4 }],
    });
  });

  it("returns signed_out without a call when the cookie is missing", async () => {
    cookieGet.mockReturnValue(undefined);

    await expect(getGoalTemplates()).resolves.toEqual({ kind: "signed_out" });
    expect(fetchGoalTemplates).not.toHaveBeenCalled();
  });

  it.each([
    [401, "signed_out"],
    [403, "forbidden"],
  ])("maps status %i to %s", async (status, kind) => {
    fetchGoalTemplates.mockResolvedValue({ status, data: {} });

    await expect(getGoalTemplates()).resolves.toEqual({ kind });
  });

  it("returns unavailable for a body that fails the contract", async () => {
    fetchGoalTemplates.mockResolvedValue({ status: 200, data: [{ nope: 1 }] });

    await expect(getGoalTemplates()).resolves.toEqual({ kind: "unavailable" });
  });

  it("returns unavailable when the request throws", async () => {
    fetchGoalTemplates.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(getGoalTemplates()).resolves.toEqual({ kind: "unavailable" });
  });
});

describe("getGoalTemplate", () => {
  it("returns not_found for a 404 and for an id that is not a UUID", async () => {
    fetchGoalTemplate.mockResolvedValue({ status: 404, data: {} });

    await expect(getGoalTemplate(TEMPLATE_ID)).resolves.toEqual({
      kind: "not_found",
    });
    await expect(getGoalTemplate("not-a-uuid")).resolves.toEqual({
      kind: "not_found",
    });
    expect(fetchGoalTemplate).toHaveBeenCalledTimes(1);
  });

  it("parses the flat tree", async () => {
    fetchGoalTemplate.mockResolvedValue({
      status: 200,
      data: {
        template,
        version: null,
        indicators: [],
        scales: [],
        matrixRows: [],
        matrixColumns: [],
        matrixCells: [],
      },
    });

    const result = await getGoalTemplate(TEMPLATE_ID);

    expect(fetchGoalTemplate).toHaveBeenCalledWith("token", TEMPLATE_ID, undefined);
    expect(result).toMatchObject({
      kind: "ok",
      data: { template: { position: "Software Engineer" } },
    });
  });
});

describe("getGoalTemplatePositions", () => {
  it("sends the session token and parses the positions", async () => {
    fetchGoalTemplatePositions.mockResolvedValue({
      status: 200,
      data: ["Software Engineer"],
    });

    const result = await getGoalTemplatePositions();

    expect(fetchGoalTemplatePositions).toHaveBeenCalledWith("token");
    expect(result).toEqual({
      kind: "ok",
      data: ["Software Engineer"],
    });
  });

  it("maps a 403 to forbidden", async () => {
    fetchGoalTemplatePositions.mockResolvedValue({ status: 403, data: {} });

    await expect(getGoalTemplatePositions()).resolves.toEqual({ kind: "forbidden" });
  });
});
