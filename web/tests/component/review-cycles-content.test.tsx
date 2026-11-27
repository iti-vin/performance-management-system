import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The reader file imports "server-only" and next/headers: the content takes only its result type.
vi.mock("@/features/review-cycles/services/review-cycle-reader", () => ({}));

import { ReviewCycleNotice, ReviewCyclesContent } from "@/features/review-cycles/components/review-cycles-content";

const ROW = {
  cycleId: "00000000-0000-0000-0000-000000000141",
  name: "CY2026-Q4",
  reviewType: "standard" as const,
  state: "active" as const,
  evaluationStart: "2026-11-04",
  evaluationEnd: "2026-12-31",
  deadline: null,
  participantCount: 1,
  assignmentCount: 3,
  submittedCount: 0,
  completedCount: 0,
  releasedAt: null,
};

describe("ReviewCyclesContent", () => {
  it("shows the register when the read worked", () => {
    render(<ReviewCyclesContent result={{ kind: "ok", data: [ROW] }} />);

    expect(screen.getByRole("table", { name: "Review cycle register" })).toBeTruthy();
    expect(screen.getByText("CY2026-Q4")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows an empty register as a table with no cycle, not as an error", () => {
    render(<ReviewCyclesContent result={{ kind: "ok", data: [] }} />);

    expect(screen.getByText("No review cycles found.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    [{ kind: "signed_out" }, "Session ended", "Log in again to see review cycles."],
    [{ kind: "forbidden" }, "HR access required", "Only HR administrators"],
    [{ kind: "unavailable" }, "Review cycles are unavailable", "We could not load review cycles."],
    [{ kind: "not_found" }, "Review cycles are unavailable", "We could not load review cycles."],
  ] as const)("shows a notice for %j, and no table", (result, title, text) => {
    render(<ReviewCyclesContent result={result} />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(title);
    expect(alert.textContent).toContain(text);
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("ReviewCycleNotice", () => {
  it("says that only a draft can be edited, and points back to the register", () => {
    render(<ReviewCycleNotice kind="not_draft" />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Only a draft cycle can be edited");
    expect(alert.textContent).toContain("register");
  });
});
