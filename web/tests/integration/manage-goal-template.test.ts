import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));

class RedirectSignal extends Error {
  constructor(readonly to: string) {
    super(`redirect:${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectSignal(to);
  },
}));

const api = {
  postUpdateGoalTemplate: vi.fn(),
  postGoalTemplateVersion: vi.fn(),
  postPublishGoalTemplate: vi.fn(),
  postArchiveGoalTemplate: vi.fn(),
};
vi.mock("@/features/review-templates/api/goal-template-requests", () => ({
  postUpdateGoalTemplate: (...args: unknown[]) => api.postUpdateGoalTemplate(...args),
  postGoalTemplateVersion: (...args: unknown[]) => api.postGoalTemplateVersion(...args),
  postPublishGoalTemplate: (...args: unknown[]) => api.postPublishGoalTemplate(...args),
  postArchiveGoalTemplate: (...args: unknown[]) => api.postArchiveGoalTemplate(...args),
}));

import {
  archiveGoalTemplate,
  publishGoalTemplate,
  saveGoalTemplateEdits,
} from "@/features/review-templates/services/manage-goal-template";

const ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const LIST = "/reviews/templates/kpi-goal-template";
const OK = { status: 200, data: {} };
const BODY = {
  name: "Goals",
  description: "",
  position: "Software Engineer",
  indicators: [
    {
      name: "Delivery rate",
      description: "",
      unit: "Percentage",
      direction: "higher_is_better",
      target: 90,
      weight: 100,
      scoreTargetMet: 5,
      scoreBelowTarget: 2,
      matrixKind: "none",
      matrixTitle: null,
      scaleBound: null,
      useForScoring: false,
      scales: [],
      matrixColumns: [],
      matrixRows: [],
    },
  ],
};

async function redirectOf(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    if (error instanceof RedirectSignal) return error.to;
    throw error;
  }
  return null;
}

beforeEach(() => {
  cookieGet.mockReset().mockReturnValue({ value: "token" });
  for (const fn of Object.values(api)) fn.mockReset().mockResolvedValue(OK);
});

describe("an id that is not a template id", () => {
  it("is refused before any request, in both actions", async () => {
    const bad = "../users";

    expect(await publishGoalTemplate(bad)).toHaveProperty("message");
    expect(await saveGoalTemplateEdits(bad, BODY, "draft")).toHaveProperty("message");

    for (const fn of Object.values(api)) expect(fn).not.toHaveBeenCalled();
  });
});

describe("saveGoalTemplateEdits", () => {
  it("saves a draft, then goes to the list", async () => {
    expect(await redirectOf(() => saveGoalTemplateEdits(ID, BODY, "draft"))).toBe(`${LIST}?saved=draft`);
    expect(api.postUpdateGoalTemplate).toHaveBeenCalledWith("token", ID, expect.anything());
    expect(api.postPublishGoalTemplate).not.toHaveBeenCalled();
  });

  it("publishes a draft after it saves the edits", async () => {
    expect(await redirectOf(() => saveGoalTemplateEdits(ID, BODY, "publish"))).toBe(`${LIST}?saved=published`);
    expect(api.postPublishGoalTemplate).toHaveBeenCalledWith("token", ID);
  });

  it("says the draft stays a draft when only the publish fails", async () => {
    api.postPublishGoalTemplate.mockResolvedValue({ status: 409, data: {} });

    expect(await redirectOf(() => saveGoalTemplateEdits(ID, BODY, "publish"))).toBe(`${LIST}?saved=publish_failed`);
  });

  it("publishes the next version of a published template, with no draft update", async () => {
    expect(await redirectOf(() => saveGoalTemplateEdits(ID, BODY, "update"))).toBe(`${LIST}?saved=updated`);
    expect(api.postGoalTemplateVersion).toHaveBeenCalledWith("token", ID, expect.anything());
    expect(api.postUpdateGoalTemplate).not.toHaveBeenCalled();
    expect(api.postPublishGoalTemplate).not.toHaveBeenCalled();
  });

  it("returns a message for a refused update, and does not redirect", async () => {
    api.postGoalTemplateVersion.mockResolvedValue({ status: 400, data: {} });

    expect(await saveGoalTemplateEdits(ID, BODY, "update")).toHaveProperty("message");
  });

  it("asks the user to log in again with no session", async () => {
    cookieGet.mockReturnValue(undefined);

    const result = await saveGoalTemplateEdits(ID, BODY, "draft");

    expect(result).toMatchObject({ message: expect.stringMatching(/log in again/i) });
  });

  it("refuses an unknown intent and a bad body", async () => {
    expect(await saveGoalTemplateEdits(ID, BODY, "delete")).toHaveProperty("message");
    expect(await saveGoalTemplateEdits(ID, { name: "" }, "draft")).toHaveProperty("message");
    expect(api.postUpdateGoalTemplate).not.toHaveBeenCalled();
  });
});

describe("publishGoalTemplate", () => {
  it("publishes the draft, then goes to the list", async () => {
    expect(await redirectOf(() => publishGoalTemplate(ID))).toBe(`${LIST}?saved=published`);
    expect(api.postPublishGoalTemplate).toHaveBeenCalledWith("token", ID);
  });

  it("returns a message when the publish is refused", async () => {
    api.postPublishGoalTemplate.mockResolvedValue({ status: 409, data: {} });

    expect(await publishGoalTemplate(ID)).toHaveProperty("message");
  });

  it("refuses an id that is not a template id", async () => {
    expect(await publishGoalTemplate("../x")).toHaveProperty("message");
    expect(api.postPublishGoalTemplate).not.toHaveBeenCalled();
  });
});

describe("archiveGoalTemplate", () => {
  beforeEach(() => {
    cookieGet.mockReturnValue({ value: "token" });
    api.postArchiveGoalTemplate.mockReset().mockResolvedValue(OK);
  });

  it("archives the template, then goes to the list", async () => {
    expect(await redirectOf(() => archiveGoalTemplate(ID))).toBe(`${LIST}?saved=archived`);
    expect(api.postArchiveGoalTemplate).toHaveBeenCalledWith("token", ID);
  });

  it("returns a message when the archive is refused, and refuses a bad id without a request", async () => {
    api.postArchiveGoalTemplate.mockResolvedValue({ status: 409, data: {} });
    expect(await archiveGoalTemplate(ID)).toHaveProperty("message");
    api.postArchiveGoalTemplate.mockClear();

    expect(await archiveGoalTemplate("../x")).toHaveProperty("message");
    expect(api.postArchiveGoalTemplate).not.toHaveBeenCalled();
  });
});
