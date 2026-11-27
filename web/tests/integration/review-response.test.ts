import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/cache", () => ({ refresh }));

const get = vi.fn();
const put = vi.fn();
const post = vi.fn();
vi.mock("@/api/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    put: (...args: unknown[]) => put(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { getReview } from "@/features/review-cycles/services/review-cycle-reader";
import { saveReviewDraft, submitReview } from "@/features/review-cycles/services/review-response";

const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const ID = guid(301);
const QUESTION = guid(131);
const BODY = { answers: [{ questionId: QUESTION, score: 4 }] };
const SENT = { writtenFeedback: "", answers: [{ questionId: QUESTION, score: 4, writtenAnswer: null, optionId: null, isNotObserved: false }] };
const DETAIL = {
  assignmentId: ID,
  cycleId: guid(141),
  cycleName: "ZZ demo",
  cycleState: "active",
  subjectName: "Iging UserDotTech",
  subjectPosition: "Software Engineer",
  subjectDepartment: "IT",
  isAssignedToCaller: false,
  evaluatorName: "Iging UserDotTech",
  perspective: "self",
  state: "not_started",
  deadline: null,
  isOverdue: false,
  canEdit: true,
  isRestricted: false,
  waitingFor: null,
  reopenReason: null,
  history: [],
  stages: [],
  goals: null,
  sections: [],
  response: null,
  template: null,
};
const envelope = (message: string, details: unknown[] = []) => ({
  success: false,
  error: { code: "(422) BUSINESS_RULE", message, details, correlationId: "c-1" },
});

beforeEach(() => {
  vi.stubEnv("PMS_API_BASE_URL", "http://api.test");
  cookieGet.mockReset().mockReturnValue({ value: "token" });
  refresh.mockReset();
  get.mockReset().mockResolvedValue({ status: 200, data: DETAIL });
  put.mockReset().mockResolvedValue({ status: 200, data: DETAIL });
  post.mockReset().mockResolvedValue({ status: 200, data: DETAIL });
});

describe("getReview", () => {
  it("reads one review with the session token", async () => {
    expect(await getReview(ID)).toEqual({ kind: "ok", data: DETAIL });
    expect(get).toHaveBeenCalledWith(
      `http://api.test/reviews/${ID}`,
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
    );
  });

  it("sends no request for an id that is not a GUID", async () => {
    expect(await getReview("../review-cycles")).toEqual({ kind: "not_found" });
    expect(get).not.toHaveBeenCalled();
  });

  it("says not found for a 404, and unavailable for a body that breaks the contract", async () => {
    get.mockResolvedValue({ status: 404, data: {} });
    expect(await getReview(ID)).toEqual({ kind: "not_found" });

    get.mockResolvedValue({ status: 200, data: { assignmentId: "x" } });
    expect(await getReview(ID)).toEqual({ kind: "unavailable" });
  });
});

describe.each([
  ["saveReviewDraft", saveReviewDraft, () => put, `http://api.test/reviews/${ID}/response`, "Your answers could not be saved. Try again."],
  ["submitReview", submitReview, () => post, `http://api.test/reviews/${ID}/submission`, "The review could not be submitted. Try again."],
] as const)("%s", (_name, action, method, url, couldNot) => {
  it("sends the checked answers, refreshes the page, and reports no problem", async () => {
    expect(await action(ID, BODY)).toEqual({ message: null, fieldErrors: {} });
    expect(method()).toHaveBeenCalledWith(url, SENT, expect.objectContaining({ headers: { Authorization: "Bearer token" } }));
    expect(refresh).toHaveBeenCalled();
  });

  it("sends nothing for a bad id or a bad body", async () => {
    expect((await action("x", BODY)).message).toBe("This review was not found.");
    expect((await action(ID, { answers: [{ questionId: QUESTION, score: 9 }] })).message).toBe("Check your answers and try again.");
    expect(method()).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("puts the problem of an answer on its question, and the rest in the message", async () => {
    method().mockResolvedValue({
      status: 422,
      data: envelope("Answer every required question before you submit.", [
        { field: `answers.${QUESTION}`, code: "REQUIRED", message: 'Answer "Shares what they know."' },
        { field: "answers.0.score", code: "INVALID_BODY", message: "Too big" },
      ]),
    });

    expect(await action(ID, BODY)).toEqual({
      message: "Answer every required question before you submit. Too big",
      fieldErrors: { [QUESTION]: 'Answer "Shares what they know."' },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows the reason of the API for a refusal", async () => {
    method().mockResolvedValue({ status: 409, data: envelope("This review is already submitted.") });

    expect(await action(ID, BODY)).toEqual({ message: "This review is already submitted.", fieldErrors: {} });
  });

  it("asks to log in again, and hides the error of a failed request", async () => {
    method().mockResolvedValue({ status: 401, data: {} });
    expect((await action(ID, BODY)).message).toContain("Log in again");

    method().mockRejectedValue(new Error("socket hang up http://api.test token"));
    expect((await action(ID, BODY)).message).toBe(couldNot);

    cookieGet.mockReturnValue(undefined);
    expect((await action(ID, BODY)).message).toContain("Log in again");
  });
});
