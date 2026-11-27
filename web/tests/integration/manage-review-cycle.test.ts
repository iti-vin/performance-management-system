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

const refresh = vi.fn();
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

const postScheduleReviewCycle = vi.fn();
const deleteCycleSchedule = vi.fn();
const postFinalizeReviewCycle = vi.fn();
const postReleaseResults = vi.fn();
const postExtendReviewCycle = vi.fn();
const postReopenReview = vi.fn();
const postLaunchReviewCycle = vi.fn();
const postCancelReviewCycle = vi.fn();
vi.mock("@/features/review-cycles/api/review-cycle-requests", () => ({
  postLaunchReviewCycle: (...args: unknown[]) => postLaunchReviewCycle(...args),
  postCancelReviewCycle: (...args: unknown[]) => postCancelReviewCycle(...args),
  postExtendReviewCycle: (...args: unknown[]) => postExtendReviewCycle(...args),
  postReopenReview: (...args: unknown[]) => postReopenReview(...args),
  postFinalizeReviewCycle: (...args: unknown[]) => postFinalizeReviewCycle(...args),
  postReleaseResults: (...args: unknown[]) => postReleaseResults(...args),
  postScheduleReviewCycle: (...args: unknown[]) => postScheduleReviewCycle(...args),
  deleteCycleSchedule: (...args: unknown[]) => deleteCycleSchedule(...args),
}));

import { cancelReviewCycle, extendReviewCycle, finalizeReviewCycle, releaseResults, scheduleReviewCycle, unscheduleReviewCycle, launchReviewCycle, reopenReview } from "@/features/review-cycles/services/manage-review-cycle";

const CYCLE_ID = "7d47ea3a-ec86-4120-abde-c13b7b14dbf4";

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
  postLaunchReviewCycle.mockReset();
  postCancelReviewCycle.mockReset();
  postExtendReviewCycle.mockReset();
  postReopenReview.mockReset();
  refresh.mockReset();
  postFinalizeReviewCycle.mockReset();
  postReleaseResults.mockReset();
  postScheduleReviewCycle.mockReset();
  deleteCycleSchedule.mockReset();
});

describe("launchReviewCycle", () => {
  it("launches with the session token, then goes to the register with a launched flag", async () => {
    postLaunchReviewCycle.mockResolvedValue({ status: 200, data: { cycleId: CYCLE_ID } });

    const target = await redirectTarget(launchReviewCycle(CYCLE_ID));

    expect(postLaunchReviewCycle).toHaveBeenCalledWith("token", CYCLE_ID);
    expect(target).toBe("/review-cycles?saved=launched");
  });

  it("checks the id again, and sends nothing for one that is not a GUID", async () => {
    expect(await launchReviewCycle("not-a-guid")).toEqual({ message: "This cycle was not found." });
    expect(postLaunchReviewCycle).not.toHaveBeenCalled();
  });

  it("asks the user to log in again without a cookie, and sends nothing", async () => {
    cookieGet.mockReturnValue(undefined);

    expect(await launchReviewCycle(CYCLE_ID)).toEqual({ message: "Your session ended. Log in again to launch the cycle." });
    expect(postLaunchReviewCycle).not.toHaveBeenCalled();
  });

  it.each([
    [401, "Your session ended. Log in again to launch the cycle."],
    [403, "Only HR administrators can launch review cycles."],
    [404, "This cycle was not found."],
    [409, "Only a draft cycle can be launched. Reload the register."],
  ])("maps a %s to its own message", async (status, message) => {
    postLaunchReviewCycle.mockResolvedValue({ status, data: {} });

    expect(await launchReviewCycle(CYCLE_ID)).toEqual({ message });
  });

  it("shows why the cycle is not ready: the message of the API and the first problems, each once", async () => {
    postLaunchReviewCycle.mockResolvedValue({
      status: 422,
      data: {
        success: false,
        error: {
          code: "(422) BUSINESS_RULE",
          message: "The cycle is not ready to launch.",
          details: [
            { field: "participants.x.manager", code: "STAGES", message: "Maria Santos has no manager assigned yet." },
            { field: "stages.2.evaluatorId", code: "STAGES", message: "Choose the HR evaluator of stage 3." },
          ],
          correlationId: "c-1",
        },
      },
    });

    const { message } = await launchReviewCycle(CYCLE_ID);

    expect(message).toContain("The cycle is not ready to launch.");
    expect(message).toContain("Maria Santos has no manager assigned yet.");
    expect(message).toContain("Choose the HR evaluator of stage 3.");
  });

  it("says the cycle could not be launched when the API is unreachable, with no address in the text", async () => {
    postLaunchReviewCycle.mockRejectedValue(new Error("connect ECONNREFUSED http://secret:4000"));
    expect(await launchReviewCycle(CYCLE_ID)).toEqual({ message: "The cycle could not be launched. Try again." });

    postLaunchReviewCycle.mockReturnValue(null);
    expect(await launchReviewCycle(CYCLE_ID)).toEqual({ message: "The cycle could not be launched. Try again." });
  });
});

describe("cancelReviewCycle", () => {
  it("cancels with the reason, trimmed, then goes to the register with a cancelled flag", async () => {
    postCancelReviewCycle.mockResolvedValue({ status: 200, data: { cycleId: CYCLE_ID } });

    const target = await redirectTarget(cancelReviewCycle(CYCLE_ID, { reason: "  Budget freeze " }));

    expect(postCancelReviewCycle).toHaveBeenCalledWith("token", CYCLE_ID, { reason: "Budget freeze" });
    expect(target).toBe("/review-cycles?saved=cancelled");
  });

  it("checks the id and the reason again, and sends nothing when either breaks a rule", async () => {
    expect((await cancelReviewCycle("x", { reason: "Budget freeze" })).message).toBe("This cycle was not found.");
    expect((await cancelReviewCycle(CYCLE_ID, { reason: "   " })).message).toBeTruthy();
    expect(postCancelReviewCycle).not.toHaveBeenCalled();
  });

  it.each([
    [401, "Your session ended. Log in again to cancel the cycle."],
    [403, "Only HR administrators can cancel review cycles."],
    [404, "This cycle was not found."],
    [409, "This cycle can no longer be cancelled. Reload the register."],
  ])("maps a %s to its own message", async (status, message) => {
    postCancelReviewCycle.mockResolvedValue({ status, data: {} });

    expect(await cancelReviewCycle(CYCLE_ID, { reason: "Budget freeze" })).toEqual({ message });
  });

  it("says the cycle could not be cancelled when the API fails, and asks to log in again without a cookie", async () => {
    postCancelReviewCycle.mockRejectedValue(new Error("boom"));
    expect(await cancelReviewCycle(CYCLE_ID, { reason: "Budget freeze" })).toEqual({ message: "The cycle could not be cancelled. Try again." });

    cookieGet.mockReturnValue(undefined);
    expect(await cancelReviewCycle(CYCLE_ID, { reason: "Budget freeze" })).toEqual({ message: "Your session ended. Log in again to cancel the cycle." });
  });
});

const ASSIGNMENT_ID = "00000000-0000-0000-0000-000000000301";
const STAGE_ID = "00000000-0000-0000-0000-000000000151";
const EXTENSION = { reason: "Holiday week", stages: [{ stageId: STAGE_ID, deadline: "2027-01-20T23:59:59+08:00" }] };

describe("extendReviewCycle", () => {
  it("sends the checked body, reads the page again, and answers with no message", async () => {
    postExtendReviewCycle.mockResolvedValue({ status: 200, data: {} });

    expect(await extendReviewCycle(CYCLE_ID, { ...EXTENSION, reason: "  Holiday week  ", state: "draft" })).toEqual({ message: "" });
    expect(postExtendReviewCycle).toHaveBeenCalledWith("token", CYCLE_ID, EXTENSION);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a bad id", "nope", EXTENSION],
    ["a blank reason", CYCLE_ID, { ...EXTENSION, reason: " " }],
    ["a bad date", CYCLE_ID, { ...EXTENSION, verificationDeadline: "soon" }],
  ])("sends nothing for %s", async (_what, cycleId, body) => {
    const result = await extendReviewCycle(cycleId, body);

    expect(result.message).not.toBe("");
    expect(postExtendReviewCycle).not.toHaveBeenCalled();
  });

  it("says the reason and the problems of a refusal, and does not read the page again", async () => {
    postExtendReviewCycle.mockResolvedValue({
      status: 422,
      data: {
        success: false,
        error: {
          code: "(422) BUSINESS_RULE",
          message: "The deadlines cannot be extended.",
          details: [{ field: "stages.0.deadline", code: "INVALID_DEADLINE", message: "The deadline of stage 1 cannot move earlier." }],
          correlationId: "c-2",
        },
      },
    });

    const { message } = await extendReviewCycle(CYCLE_ID, EXTENSION);

    expect(message).toContain("The deadlines cannot be extended.");
    expect(message).toContain("The deadline of stage 1 cannot move earlier.");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("reopenReview", () => {
  const input = { assignmentId: ASSIGNMENT_ID, reason: "Wrong ratings" };

  it("sends the reason for that review of that cycle, and reads the page again", async () => {
    postReopenReview.mockResolvedValue({ status: 200, data: {} });

    expect(await reopenReview(CYCLE_ID, input)).toEqual({ message: "" });
    expect(postReopenReview).toHaveBeenCalledWith("token", { cycleId: CYCLE_ID, assignmentId: ASSIGNMENT_ID }, { reason: "Wrong ratings" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a bad cycle id", "nope", input],
    ["a bad review id", CYCLE_ID, { ...input, assignmentId: "../launch" }],
    ["a blank reason", CYCLE_ID, { ...input, reason: " " }],
    ["no input", CYCLE_ID, null],
  ])("sends nothing for %s", async (_what, cycleId, body) => {
    const result = await reopenReview(cycleId, body);

    expect(result.message).not.toBe("");
    expect(postReopenReview).not.toHaveBeenCalled();
  });

  it("names the rule of a conflict", async () => {
    postReopenReview.mockResolvedValue({ status: 409, data: {} });

    expect(await reopenReview(CYCLE_ID, input)).toEqual({ message: "This review can no longer be reopened. Reload the page." });
  });
});

describe.each([
  ["finalizeReviewCycle", finalizeReviewCycle, postFinalizeReviewCycle, "This cycle can no longer be finalized. Reload the page."],
  ["releaseResults", releaseResults, postReleaseResults, "These results can no longer be released. Reload the page."],
] as const)("%s", (_name, action, post, conflict) => {
  it("sends the request of the cycle, reads the page again, and answers with no message", async () => {
    post.mockResolvedValue({ status: 200, data: [] });

    expect(await action(CYCLE_ID)).toEqual({ message: "" });
    // A release sends the choice of the caller. Without one the API keeps that of the cycle.
    const readers = post === postReleaseResults ? [{}] : [];
    expect(post).toHaveBeenCalledWith("token", CYCLE_ID, ...readers);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("sends nothing for a bad id", async () => {
    expect((await action("nope")).message).not.toBe("");
    expect(post).not.toHaveBeenCalled();
  });

  it("names the rule of a conflict, and does not read the page again", async () => {
    post.mockResolvedValue({ status: 409, data: {} });

    expect(await action(CYCLE_ID)).toEqual({ message: conflict });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("scheduleReviewCycle", () => {
  it("schedules, then goes to the register with a scheduled flag", async () => {
    postScheduleReviewCycle.mockResolvedValue({ status: 200, data: {} });

    expect(await redirectTarget(scheduleReviewCycle(CYCLE_ID))).toBe("/review-cycles?saved=scheduled");
    expect(postScheduleReviewCycle).toHaveBeenCalledWith("token", CYCLE_ID);
  });

  it("says why it cannot, and sends nothing for a bad id", async () => {
    postScheduleReviewCycle.mockResolvedValue({ status: 409, data: {} });

    expect(await scheduleReviewCycle(CYCLE_ID)).toEqual({ message: "Only a draft cycle can be scheduled. Reload the register." });
    expect((await scheduleReviewCycle("nope")).message).toBe("This cycle was not found.");
    expect(postScheduleReviewCycle).toHaveBeenCalledTimes(1);
  });
});

describe("unscheduleReviewCycle", () => {
  it("returns the cycle to draft, then opens it in the wizard", async () => {
    deleteCycleSchedule.mockResolvedValue({ status: 200, data: {} });

    expect(await redirectTarget(unscheduleReviewCycle(CYCLE_ID))).toBe(`/review-cycles/${CYCLE_ID}/edit`);
    expect(deleteCycleSchedule).toHaveBeenCalledWith("token", CYCLE_ID);
  });

  it("says why it cannot", async () => {
    deleteCycleSchedule.mockResolvedValue({ status: 409, data: {} });

    expect(await unscheduleReviewCycle(CYCLE_ID)).toEqual({ message: "This cycle is no longer scheduled. Reload the page." });
  });
});
