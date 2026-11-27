import { describe, expect, it } from "vitest";
import {
  buildReviewListHref,
  parseReviewListParams,
  scopeReviewParams,
  toReviewSearch,
} from "@/features/review-cycles/services/review-list-params";

const CYCLE_ID = "00000000-0000-0000-0000-000000000141";
const ALL = {
  cycleId: CYCLE_ID,
  cycleState: "active" as const,
  perspective: "hr" as const,
  state: "locked" as const,
  q: "maria",
  page: 3,
  pageSize: 50,
};

describe("parseReviewListParams", () => {
  it("asks for the first page of 10 when the URL carries nothing", () => {
    expect(parseReviewListParams({})).toEqual({ page: 1, pageSize: 10 });
  });

  it("reads every filter, the trimmed search, and the numbers", () => {
    const raw = {
      cycleId: CYCLE_ID,
      cycleState: "active",
      perspective: "hr",
      state: "locked",
      q: " maria ",
      page: "3",
      pageSize: "50",
    };

    expect(parseReviewListParams(raw)).toEqual(ALL);
  });

  it("drops an unknown key and every bad value, so the API never refuses a stale link", () => {
    const raw = {
      saved: "launched",
      tab: "all",
      cycleId: "x",
      cycleState: "paused",
      perspective: ["hr", "self"],
      state: "done",
      q: "x".repeat(121),
      page: "0",
      pageSize: "1000",
    };

    expect(parseReviewListParams(raw)).toEqual({ page: 1, pageSize: 10 });
  });

  it("keeps the good values next to a bad one", () => {
    expect(parseReviewListParams({ state: "submitted", page: "two" })).toEqual({
      state: "submitted",
      page: 1,
      pageSize: 10,
    });
  });
});

describe("scopeReviewParams", () => {
  it("keeps every filter of an administrator", () => {
    expect(scopeReviewParams(ALL, "ADMIN")).toEqual(ALL);
  });

  it("drops the cycle state of anyone else, because their page shows no control to clear it", () => {
    expect(scopeReviewParams(ALL, "USER")).toEqual({
      cycleId: CYCLE_ID,
      perspective: "hr",
      state: "locked",
      q: "maria",
      page: 3,
      pageSize: 50,
    });
  });
});

describe("toReviewSearch and buildReviewListHref", () => {
  it("leaves the defaults and the empty search out", () => {
    expect(toReviewSearch({ q: "", page: 1, pageSize: 10 })).toBe("");
    expect(buildReviewListHref({ page: 1, pageSize: 10 })).toBe("/reviews");
  });

  it("writes every filter that is set", () => {
    const search = `?cycleId=${CYCLE_ID}&cycleState=active&perspective=hr&state=locked&q=maria&page=3&pageSize=50`;

    expect(toReviewSearch(ALL)).toBe(search);
    expect(buildReviewListHref(ALL)).toBe(`/reviews${search}`);
  });

  it("reads and writes the tab and the department", () => {
    const raw = { view: "completed", department: "Human Resources", state: "overdue" };

    expect(parseReviewListParams(raw)).toEqual({ ...raw, page: 1, pageSize: 10 });
    expect(toReviewSearch(parseReviewListParams(raw))).toBe("?state=overdue&view=completed&department=Human+Resources");
  });

  it("encodes the search text", () => {
    expect(toReviewSearch({ q: "a&state=done", page: 1, pageSize: 10 })).toBe("?q=a%26state%3Ddone");
  });

  it("keeps the team tab for a manager only, who is the one with that tab (D3)", () => {
    const team = { ...ALL, view: "team" as const };

    expect(scopeReviewParams(team, "MANAGER").view).toBe("team");
    expect(scopeReviewParams(team, "USER").view).toBeUndefined();
    expect(scopeReviewParams(team, "ADMIN").view).toBeUndefined();
    expect(scopeReviewParams(team, undefined).view).toBeUndefined();
  });
});
