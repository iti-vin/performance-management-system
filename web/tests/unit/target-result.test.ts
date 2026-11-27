import { describe, expect, it } from "vitest";

import { targetResult } from "@/features/position-goals/services/target-result";

const higher = (target: number | null) => ({ target, direction: "higher_is_better" as const });
const lower = (target: number | null) => ({ target, direction: "lower_is_better" as const });

describe("targetResult", () => {
  it.each([
    ["more than a target to exceed", higher(90), 91, "met"],
    ["exactly a target to exceed", higher(90), 90, "met"],
    ["less than a target to exceed", higher(90), 89.99, "below"],
    ["less than a target to stay under", lower(2), 1, "met"],
    ["exactly a target to stay under", lower(2), 2, "met"],
    ["more than a target to stay under", lower(2), 3, "below"],
    ["zero against a zero target to stay under", lower(0), 0, "met"],
    ["one against a zero target to stay under", lower(0), 1, "below"],
    ["zero against a zero target to exceed", higher(0), 0, "met"],
  ])("compares %s", (_what, indicator, actual, expected) => {
    expect(targetResult("submitted", indicator, actual)).toBe(expected);
    expect(targetResult("verified", indicator, actual)).toBe(expected);
  });

  it.each(["draft", "returned"] as const)("says nothing about a %s report", (status) => {
    expect(targetResult(status, higher(90), 10)).toBeNull();
  });

  it("says nothing with no actual result", () => {
    expect(targetResult("verified", higher(90), null)).toBeNull();
  });

  it("says nothing with no target", () => {
    expect(targetResult("verified", higher(null), 10)).toBeNull();
  });
});
