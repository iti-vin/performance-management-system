import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReviewCyclesTable } from "@/features/review-cycles/components/review-cycles-table";

const DAY = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const ROW = {
  cycleId: "00000000-0000-0000-0000-000000000141",
  name: "CY2026-Q4",
  reviewType: "standard" as const,
  state: "active" as const,
  evaluationStart: "2026-11-04",
  evaluationEnd: "2026-12-31",
  deadline: "2026-12-15T00:00:00.000Z",
  participantCount: 3,
  assignmentCount: 9,
  submittedCount: 2,
  completedCount: 1,
  releasedAt: null,
};

describe("ReviewCyclesTable", () => {
  it("shows a cycle with its type and status as words, its period, deadline, participants, and progress", () => {
    render(<ReviewCyclesTable rows={[ROW]} />);

    const row = within(screen.getAllByRole("row")[1]!);
    expect(row.getByText("CY2026-Q4")).toBeTruthy();
    expect(row.getByText("Standard Performance Review")).toBeTruthy();
    expect(
      row.getByText(`${DAY.format(new Date("2026-11-04"))} to ${DAY.format(new Date("2026-12-31"))}`),
    ).toBeTruthy();
    expect(row.getByText(DAY.format(new Date("2026-12-15")))).toBeTruthy();
    expect(row.getByText("3")).toBeTruthy();
    expect(row.getByText(/1 \/ 9/)).toBeTruthy();
    expect(row.getByText("2 submitted")).toBeTruthy();
    expect(row.getByText("Active")).toBeTruthy();
    expect(row.queryByText("Results released")).toBeNull();
  });

  it.each([
    ["the share of completed assignments", {}, "11%", "11"],
    ["all of them", { completedCount: 9 }, "100%", "100"],
    ["nothing for a cycle with no assignment", { assignmentCount: 0, completedCount: 0, submittedCount: 0 }, "0%", "0"],
  ])("draws the progress as %s", (_what, change, words, now) => {
    render(<ReviewCyclesTable rows={[{ ...ROW, ...change }]} />);

    const row = within(screen.getAllByRole("row")[1]!);
    expect(row.getByRole("progressbar", { name: "Completed assignments of CY2026-Q4" })).toHaveAttribute("aria-valuenow", now);
    expect(row.getByText(words)).toBeTruthy();
  });

  it("says when results were released, and shows a missing deadline as not set", () => {
    render(
      <ReviewCyclesTable
        rows={[{ ...ROW, state: "completed", deadline: null, releasedAt: "2026-12-20T00:00:00.000Z" }]}
      />,
    );

    const row = within(screen.getAllByRole("row")[1]!);
    expect(row.getByText("Results released")).toBeTruthy();
    expect(row.getByText("Not set")).toBeTruthy();
    expect(row.getByText("Completed")).toBeTruthy();
  });

  it("links the name of a draft to its edit page", () => {
    render(<ReviewCyclesTable rows={[{ ...ROW, state: "draft" }]} />);

    expect(screen.getByRole("link", { name: "CY2026-Q4" }).getAttribute("href")).toBe(`/review-cycles/${ROW.cycleId}/edit`);
  });

  it.each(["scheduled", "active", "completed", "cancelled"] as const)("links the name of a %s cycle to its details", (state) => {
    render(<ReviewCyclesTable rows={[{ ...ROW, state }]} />);

    expect(screen.getByRole("link", { name: "CY2026-Q4" }).getAttribute("href")).toBe(`/review-cycles/${ROW.cycleId}`);
  });

  it("names every review type in words", () => {
    render(
      <ReviewCyclesTable
        rows={[
          { ...ROW, cycleId: "00000000-0000-0000-0000-000000000142", reviewType: "360" },
          { ...ROW, cycleId: "00000000-0000-0000-0000-000000000143", reviewType: "probationary" },
          { ...ROW, cycleId: "00000000-0000-0000-0000-000000000144", reviewType: "project_based" },
        ]}
      />,
    );

    expect(screen.getByText("360° Feedback")).toBeTruthy();
    expect(screen.getByText("Probationary Review")).toBeTruthy();
    expect(screen.getByText("Project-Based Review")).toBeTruthy();
  });

  it("does not say the register is empty while it loads", () => {
    render(<ReviewCyclesTable rows={[]} isLoading />);

    expect(screen.queryByText("No review cycles found.")).toBeNull();
  });

  it("says there is no cycle when the register is empty", () => {
    render(<ReviewCyclesTable rows={[]} />);

    expect(screen.getByText("No review cycles found.")).toBeTruthy();
  });
});
