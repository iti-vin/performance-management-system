import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const fetchReviewCycles = vi.fn();
const fetchReviewCycleOptions = vi.fn();
const fetchReviewCycle = vi.fn();
const fetchReviewCycleReadiness = vi.fn();
const fetchReviewCycleParticipants = vi.fn();
vi.mock("@/features/review-cycles/api/review-cycle-requests", () => ({
  fetchReviewCycle: (...args: unknown[]) => fetchReviewCycle(...args),
  fetchReviewCycleReadiness: (...args: unknown[]) => fetchReviewCycleReadiness(...args),
  fetchReviewCycleParticipants: (...args: unknown[]) => fetchReviewCycleParticipants(...args),
  fetchReviewCycles: (...args: unknown[]) => fetchReviewCycles(...args),
  fetchReviewCycleOptions: (...args: unknown[]) => fetchReviewCycleOptions(...args),
}));

import {
  getReviewCycle,
  getReviewCycleOptions,
  getReviewCycleParticipants,
  getReviewCycleReadiness,
  getReviewCycles,
} from "@/features/review-cycles/services/review-cycle-reader";

const ROW = {
  cycleId: "00000000-0000-0000-0000-000000000141",
  name: "CY2026-Q4",
  reviewType: "standard",
  state: "active",
  evaluationStart: "2026-11-04",
  evaluationEnd: "2026-12-31",
  deadline: "2026-12-15T00:00:00.000Z",
  participantCount: 3,
  assignmentCount: 9,
  submittedCount: 2,
  completedCount: 1,
  releasedAt: null,
  description: null,
  accomplishmentDeadline: null,
};

beforeEach(() => {
  cookieGet.mockReset().mockReturnValue({ value: "token" });
  fetchReviewCycles.mockReset();
  fetchReviewCycleOptions.mockReset();
  fetchReviewCycle.mockReset();
  fetchReviewCycleReadiness.mockReset();
});

describe("getReviewCycles", () => {
  it("sends the session token and parses the register", async () => {
    fetchReviewCycles.mockResolvedValue({ status: 200, data: [ROW] });

    const result = await getReviewCycles();

    expect(fetchReviewCycles).toHaveBeenCalledWith("token");
    expect(result).toMatchObject({ kind: "ok", data: [{ cycleId: ROW.cycleId, state: "active" }] });
  });

  it("is signed out without a cookie, and makes no request", async () => {
    cookieGet.mockReturnValue(undefined);

    expect(await getReviewCycles()).toEqual({ kind: "signed_out" });
    expect(fetchReviewCycles).not.toHaveBeenCalled();
  });

  it.each([
    [401, "signed_out"],
    [403, "forbidden"],
    [404, "not_found"],
  ])("maps a %s to %s", async (status, kind) => {
    fetchReviewCycles.mockResolvedValue({ status, data: {} });

    expect(await getReviewCycles()).toEqual({ kind });
  });

  it("is unavailable when the API url is not set, the body breaks the contract, or the request throws", async () => {
    fetchReviewCycles.mockReturnValue(null);
    expect(await getReviewCycles()).toEqual({ kind: "unavailable" });

    fetchReviewCycles.mockResolvedValue({ status: 200, data: [{ cycleId: "x" }] });
    expect(await getReviewCycles()).toEqual({ kind: "unavailable" });

    fetchReviewCycles.mockRejectedValue(new Error("boom"));
    expect(await getReviewCycles()).toEqual({ kind: "unavailable" });
  });
});

describe("getReviewCycleOptions", () => {
  const OPTIONS = {
    employees: [{ employeeId: "284ddc9e-ebe4-468d-945f-fb18af72e622", name: "Iging DotTech", position: "Software Engineer", department: "Engineering", employeeCode: "EMP-001", managerId: null, managerName: null }],
    kpiTemplates: [],
    behavioralTemplates: [],
    hrEvaluators: [],
  };

  it("sends the session token and parses the options", async () => {
    fetchReviewCycleOptions.mockResolvedValue({ status: 200, data: OPTIONS });

    const result = await getReviewCycleOptions();

    expect(fetchReviewCycleOptions).toHaveBeenCalledWith("token");
    expect(result).toEqual({ kind: "ok", data: OPTIONS });
  });

  it("is signed out without a cookie, and makes no request", async () => {
    cookieGet.mockReturnValue(undefined);

    expect(await getReviewCycleOptions()).toEqual({ kind: "signed_out" });
    expect(fetchReviewCycleOptions).not.toHaveBeenCalled();
  });

  it.each([
    [401, "signed_out"],
    [403, "forbidden"],
  ])("maps a %s to %s", async (status, kind) => {
    fetchReviewCycleOptions.mockResolvedValue({ status, data: {} });

    expect(await getReviewCycleOptions()).toEqual({ kind });
  });

  it("is unavailable when the body breaks the contract", async () => {
    fetchReviewCycleOptions.mockResolvedValue({ status: 200, data: { employees: "none" } });

    expect(await getReviewCycleOptions()).toEqual({ kind: "unavailable" });
  });
});

describe("getReviewCycle", () => {
  const CYCLE_ID = "7d47ea3a-ec86-4120-abde-c13b7b14dbf4";
  const DETAIL = {
    cycleId: CYCLE_ID,
    company: "Mayon Consolidated Inc.",
    name: "ZZ wizard check",
    reviewType: "standard",
    state: "draft",
    evaluationStart: "2027-01-01",
    evaluationEnd: "2027-03-31",
    assessmentStart: "2027-03-31T16:00:00.000Z",
    verificationDeadline: "2027-04-30T15:59:59.000Z",
    activationDate: null,
    goalsWeight: 0.5,
    behavioralWeight: 0.5,
    anonymityThreshold: null,
    cancelledReason: null,
    finalizedAt: null,
    releasedAt: null,
    description: null,
    accomplishmentDeadline: null,
    idempotencyKey: null,
    employeeVisible: true,
    managerVisible: true,
    earlierAnswersVisible: true,
    createdAt: "2026-11-25T06:00:00.000Z",
    updatedAt: "2026-11-25T06:00:00.000Z",
    stages: [],
    participants: [],
  };

  it("sends the session token and the id, and parses the detail", async () => {
    fetchReviewCycle.mockResolvedValue({ status: 200, data: DETAIL });

    const result = await getReviewCycle(CYCLE_ID);

    expect(fetchReviewCycle).toHaveBeenCalledWith("token", CYCLE_ID);
    expect(result).toMatchObject({ kind: "ok", data: { cycleId: CYCLE_ID, state: "draft" } });
  });

  it("is not found for an id that is not a GUID, and makes no request", async () => {
    expect(await getReviewCycle("not-a-guid")).toEqual({ kind: "not_found" });
    expect(fetchReviewCycle).not.toHaveBeenCalled();
  });

  it.each([
    [401, "signed_out"],
    [403, "forbidden"],
    [404, "not_found"],
  ])("maps a %s to %s", async (status, kind) => {
    fetchReviewCycle.mockResolvedValue({ status, data: {} });

    expect(await getReviewCycle(CYCLE_ID)).toEqual({ kind });
  });

  it("is unavailable when the body breaks the contract", async () => {
    fetchReviewCycle.mockResolvedValue({ status: 200, data: { cycleId: CYCLE_ID } });

    expect(await getReviewCycle(CYCLE_ID)).toEqual({ kind: "unavailable" });
  });
});

describe("getReviewCycleReadiness", () => {
  const CYCLE_ID = "7d47ea3a-ec86-4120-abde-c13b7b14dbf4";

  it("sends the session token and the id, and parses the problems", async () => {
    const issues = [{ step: "kpi", field: "participants.x.kpi", message: "Choose a template." }];
    fetchReviewCycleReadiness.mockResolvedValue({ status: 200, data: issues });

    expect(await getReviewCycleReadiness(CYCLE_ID)).toEqual({ kind: "ok", data: issues });
    expect(fetchReviewCycleReadiness).toHaveBeenCalledWith("token", CYCLE_ID);
  });

  it("is not found for an id that is not a GUID, and makes no request", async () => {
    expect(await getReviewCycleReadiness("x")).toEqual({ kind: "not_found" });
    expect(fetchReviewCycleReadiness).not.toHaveBeenCalled();
  });

  it("maps a 403 to forbidden, and a body outside the contract to unavailable", async () => {
    fetchReviewCycleReadiness.mockResolvedValue({ status: 403, data: {} });
    expect(await getReviewCycleReadiness(CYCLE_ID)).toEqual({ kind: "forbidden" });

    fetchReviewCycleReadiness.mockResolvedValue({ status: 200, data: [{ step: "launch" }] });
    expect(await getReviewCycleReadiness(CYCLE_ID)).toEqual({ kind: "unavailable" });
  });
});

describe("getReviewCycleParticipants", () => {
  const PERSON = { participantId: ROW.cycleId, name: "Iging", position: null, department: null, assignments: [] };

  beforeEach(() => cookieGet.mockReset().mockReturnValue({ value: "token" }));

  it("reads the participants with the session token and parses them", async () => {
    fetchReviewCycleParticipants.mockResolvedValue({ status: 200, data: [PERSON] });

    expect(await getReviewCycleParticipants(ROW.cycleId)).toEqual({ kind: "ok", data: [PERSON] });
    expect(fetchReviewCycleParticipants).toHaveBeenCalledWith("token", ROW.cycleId);
  });

  it("sends no request for an id that is not a GUID", async () => {
    fetchReviewCycleParticipants.mockReset();

    expect(await getReviewCycleParticipants("../options")).toEqual({ kind: "not_found" });
    expect(fetchReviewCycleParticipants).not.toHaveBeenCalled();
  });
});
