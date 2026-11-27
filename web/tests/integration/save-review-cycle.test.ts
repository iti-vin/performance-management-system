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

const postCreateReviewCycle = vi.fn();
const putUpdateReviewCycle = vi.fn();
vi.mock("@/features/review-cycles/api/review-cycle-requests", () => ({
  postCreateReviewCycle: (...args: unknown[]) => postCreateReviewCycle(...args),
  putUpdateReviewCycle: (...args: unknown[]) => putUpdateReviewCycle(...args),
}));

import { createReviewCycle, updateReviewCycle } from "@/features/review-cycles/services/save-review-cycle";

const BODY = {
  name: "CY2027-Q1",
  reviewType: "standard",
  evaluationStart: "2027-01-01",
  evaluationEnd: "2027-03-31",
  assessmentStart: "2027-04-01T00:00:00+08:00",
  verificationDeadline: "2027-04-30T23:59:59+08:00",
  goalsWeight: 0.5,
  behavioralWeight: 0.5,
  anonymityThreshold: null,
  stages: [{ perspective: "self", evaluatorRole: "employee", deadline: "2027-04-07T23:59:59+08:00" }],
  participants: [],
};

async function redirectTarget(run: Promise<unknown>) {
  try {
    await run;
  } catch (error) {
    if (error instanceof RedirectSignal) return error.to;
    throw error;
  }
  return null;
}

beforeEach(() => {
  cookieGet.mockReset().mockReturnValue({ value: "token" });
  postCreateReviewCycle.mockReset();
  putUpdateReviewCycle.mockReset();
});

describe("createReviewCycle", () => {
  it("saves the draft with the session token, then goes to the register with a saved flag", async () => {
    postCreateReviewCycle.mockResolvedValue({ status: 201, data: { cycleId: "00000000-0000-0000-0000-000000000141" } });

    const target = await redirectTarget(createReviewCycle(BODY));

    expect(postCreateReviewCycle).toHaveBeenCalledWith("token", expect.objectContaining({ name: "CY2027-Q1", goalsWeight: 0.5 }));
    expect(target).toBe("/review-cycles?saved=draft");
  });

  it("checks the body again, and sends nothing when it breaks the shared rules", async () => {
    const result = await createReviewCycle({ ...BODY, name: "   " });

    expect(result.message).toBeTruthy();
    expect(postCreateReviewCycle).not.toHaveBeenCalled();
  });

  it("asks the user to log in again without a cookie, and sends nothing", async () => {
    cookieGet.mockReturnValue(undefined);

    expect(await createReviewCycle(BODY)).toEqual({ message: "Your session ended. Log in again to save the cycle." });
    expect(postCreateReviewCycle).not.toHaveBeenCalled();
  });

  it("shows the reason of a refusal, with the field messages, and keeps the user on the page", async () => {
    postCreateReviewCycle.mockResolvedValue({
      status: 400,
      data: {
        success: false,
        error: {
          code: "(400) VALIDATION_ERROR",
          message: "Some selected employees are not active employees of your company.",
          details: [],
          correlationId: "c-1",
        },
      },
    });

    expect(await createReviewCycle(BODY)).toEqual({
      message: "Some selected employees are not active employees of your company.",
    });
  });

  it.each([
    [401, "Your session ended. Log in again to save the cycle."],
    [403, "Only HR administrators can create review cycles."],
  ])("maps a %s to its own message", async (status, message) => {
    postCreateReviewCycle.mockResolvedValue({ status, data: {} });

    expect(await createReviewCycle(BODY)).toEqual({ message });
  });

  it("says the cycle could not be saved when the API is unreachable, with no address or header in the text", async () => {
    postCreateReviewCycle.mockRejectedValue(new Error("connect ECONNREFUSED http://secret:4000"));
    expect(await createReviewCycle(BODY)).toEqual({ message: "The cycle could not be saved. Try again." });

    postCreateReviewCycle.mockReturnValue(null);
    expect(await createReviewCycle(BODY)).toEqual({ message: "The cycle could not be saved. Try again." });
  });
});

describe("updateReviewCycle", () => {
  const CYCLE_ID = "7d47ea3a-ec86-4120-abde-c13b7b14dbf4";

  it("replaces the draft with the session token, then goes to the register with an updated flag", async () => {
    putUpdateReviewCycle.mockResolvedValue({ status: 200, data: { cycleId: CYCLE_ID } });

    const target = await redirectTarget(updateReviewCycle(CYCLE_ID, BODY));

    expect(putUpdateReviewCycle).toHaveBeenCalledWith("token", CYCLE_ID, expect.objectContaining({ name: "CY2027-Q1" }));
    expect(target).toBe("/review-cycles?saved=updated");
  });

  it("checks the id and the body again, and sends nothing when either breaks a rule", async () => {
    expect((await updateReviewCycle("not-a-guid", BODY)).message).toBeTruthy();
    expect((await updateReviewCycle(CYCLE_ID, { ...BODY, name: "  " })).message).toBeTruthy();
    expect(putUpdateReviewCycle).not.toHaveBeenCalled();
  });

  it("asks the user to log in again without a cookie, and sends nothing", async () => {
    cookieGet.mockReturnValue(undefined);

    expect(await updateReviewCycle(CYCLE_ID, BODY)).toEqual({ message: "Your session ended. Log in again to save the cycle." });
    expect(putUpdateReviewCycle).not.toHaveBeenCalled();
  });

  it.each([
    [401, "Your session ended. Log in again to save the cycle."],
    [403, "Only HR administrators can edit review cycles."],
    [404, "This cycle was not found."],
    [409, "Only a draft cycle can be edited. Reload the register."],
  ])("maps a %s to its own message", async (status, message) => {
    putUpdateReviewCycle.mockResolvedValue({ status, data: {} });

    expect(await updateReviewCycle(CYCLE_ID, BODY)).toEqual({ message });
  });

  it("shows the reason of a refusal with the field messages, and says nothing of the address when the API is unreachable", async () => {
    putUpdateReviewCycle.mockResolvedValue({
      status: 400,
      data: { success: false, error: { code: "(400) VALIDATION_ERROR", message: "A KPI goal template is not published, or does not match the position of the employee.", details: [], correlationId: "c-1" } },
    });
    expect((await updateReviewCycle(CYCLE_ID, BODY)).message).toContain("does not match the position");

    putUpdateReviewCycle.mockRejectedValue(new Error("connect ECONNREFUSED http://secret:4000"));
    expect(await updateReviewCycle(CYCLE_ID, BODY)).toEqual({ message: "The cycle could not be saved. Try again." });
  });
});
