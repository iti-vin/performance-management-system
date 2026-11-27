import { describe, expect, it } from "vitest";
import { launchConfirmation } from "@/features/review-cycles/services/launch-confirmation";

describe("launchConfirmation", () => {
  it("names the cycle, and says what a launch does that cannot be undone", () => {
    const { title, description, confirmLabel } = launchConfirmation("CY2027-Q1", 3);

    expect(title).toBe("Launch this cycle?");
    expect(confirmLabel).toBe("Launch Cycle");
    expect(description).toContain("CY2027-Q1");
    expect(description).toContain("3 participants");
    expect(description).toContain("assignments");
    expect(description).toContain("frozen");
    expect(description).toContain("cannot be edited");
    expect(description).toContain("cancelled");
  });

  it("names the resulting state of the cycle, as the PRD asks of a confirmation", () => {
    expect(launchConfirmation("CY2027-Q1", 3).description).toContain("It becomes Active.");
  });

  it("uses the singular for one participant", () => {
    expect(launchConfirmation("CY2027-Q1", 1).description).toContain("assignments of 1 participant.");
  });
});
