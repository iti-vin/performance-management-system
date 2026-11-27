import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/cache", () => ({ refresh }));

const put = vi.fn();
const post = vi.fn();
vi.mock("@/api/api-client", () => ({
  apiClient: {
    put: (...args: unknown[]) => put(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import {
  decideAccomplishment,
  saveAccomplishment,
  submitAccomplishment,
} from "@/features/position-goals/services/accomplishment-response";
import { ACCOMPLISHMENT_ID as ID, SPRINT } from "../utils/accomplishment";

const REPORT = { actuals: [{ indicatorId: SPRINT, actualValue: 0, remarks: "" }] };
const SENT = { ...REPORT, remarks: "", correctionReason: "" };
const envelope = (message: string, details: unknown[] = []) => ({
  success: false,
  error: { code: "(422) BUSINESS_RULE", message, details, correlationId: "c-1" },
});

beforeEach(() => {
  vi.stubEnv("PMS_API_BASE_URL", "http://api.test");
  cookieGet.mockReset().mockReturnValue({ value: "token" });
  refresh.mockReset();
  put.mockReset().mockResolvedValue({ status: 200, data: {} });
  post.mockReset().mockResolvedValue({ status: 200, data: {} });
});

describe.each([
  ["saveAccomplishment", saveAccomplishment, () => put, "actuals", REPORT, SENT, "Your report could not be saved. Try again."],
  ["submitAccomplishment", submitAccomplishment, () => post, "submission", REPORT, SENT, "The report could not be submitted. Try again."],
  [
    "decideAccomplishment",
    decideAccomplishment,
    () => post,
    "decision",
    { outcome: "returned", reason: " Wrong count. " },
    { outcome: "returned", reason: "Wrong count." },
    "Your decision could not be saved. Try again.",
  ],
] as const)("%s", (_name, action, method, route, input, sent, couldNot) => {
  it("sends the checked body, refreshes the page, and reports no problem", async () => {
    expect(await action(ID, input)).toEqual({ message: null, fieldErrors: {} });
    expect(method()).toHaveBeenCalledWith(
      `http://api.test/accomplishments/${ID}/${route}`,
      sent,
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("sends nothing for a bad id or a bad body", async () => {
    expect((await action("../x", input)).message).toBe("This record was not found.");
    expect((await action(ID, { nonsense: true })).message).toBe("Check what you entered and try again.");
    expect(method()).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("asks to log in without a session", async () => {
    cookieGet.mockReturnValue(undefined);

    expect((await action(ID, input)).message).toBe("Your session ended. Log in again.");
    expect(method()).not.toHaveBeenCalled();
  });

  it("says what failed when the API cannot be reached", async () => {
    method().mockRejectedValue(new Error("connect ECONNREFUSED http://api.test token"));

    expect(await action(ID, input)).toEqual({ message: couldNot, fieldErrors: {} });
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([
    [404, "This record was not found."],
    [409, "This record can no longer be changed. Reload the page."],
  ])("explains a %s with no error body", async (status, message) => {
    method().mockResolvedValue({ status, data: {} });

    expect((await action(ID, input)).message).toBe(message);
  });
});

describe("the problems of fields", () => {
  it("puts each problem on its indicator or its field, and keeps the rest in the message", async () => {
    post.mockResolvedValue({
      status: 422,
      data: envelope("Complete the report before you submit.", [
        { field: `actuals.${SPRINT}`, code: "REQUIRED", message: "Report a value." },
        { field: "correctionReason", code: "REQUIRED", message: "Say what you corrected." },
        { field: "period", code: "RULE", message: "The period runs." },
      ]),
    });

    expect(await submitAccomplishment(ID, REPORT)).toEqual({
      message: "Complete the report before you submit. The period runs.",
      fieldErrors: { [SPRINT]: "Report a value.", correctionReason: "Say what you corrected." },
    });
  });

  it("puts a problem of the reason on the reason", async () => {
    post.mockResolvedValue({
      status: 400,
      data: envelope("The request contains invalid fields.", [{ field: "reason", code: "INVALID_BODY", message: "Too long." }]),
    });

    expect(await decideAccomplishment(ID, { outcome: "verified" })).toEqual({
      message: "The request contains invalid fields.",
      fieldErrors: { reason: "Too long." },
    });
  });
});
