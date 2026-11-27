import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CycleAttention } from "@/features/review-cycles/components/cycle-attention";

const item = (change: object) => ({
  cycleId: "00000000-0000-0000-0000-000000000141",
  name: "ZZ demo",
  state: "active" as const,
  activationDate: null,
  problems: [] as string[],
  overdueReviews: 0,
  overdueReports: 0,
  ...change,
});

describe("CycleAttention", () => {
  it("says what blocks a scheduled cycle and what is overdue, with a way to the cycle", () => {
    render(
      <CycleAttention
        items={[
          item({ overdueReviews: 2, overdueReports: 1 }),
          item({ cycleId: "00000000-0000-0000-0000-000000000142", name: "ZZ next", state: "scheduled", activationDate: "2026-12-01", problems: ["Ana has no manager."] }),
        ]}
      />,
    );

    const region = within(screen.getByRole("region", { name: "Needs attention" }));
    expect(region.getByRole("link", { name: "ZZ demo" }).getAttribute("href")).toBe("/review-cycles/00000000-0000-0000-0000-000000000141?tab=progress");
    expect(region.getByText("Overdue reviews: 2. Overdue KPI reports: 1.")).toBeTruthy();
    expect(region.getByRole("link", { name: "ZZ next" }).getAttribute("href")).toBe("/review-cycles/00000000-0000-0000-0000-000000000142");
    expect(region.getByText("Blocked: activates Dec 1, 2026 only without these problems.")).toBeTruthy();
    expect(region.getByText("Ana has no manager.")).toBeTruthy();
  });

  it("shows nothing when nothing needs attention", () => {
    render(<CycleAttention items={[]} />);

    expect(screen.queryByRole("region")).toBeNull();
  });

  it("says when the list could not be read", () => {
    render(<CycleAttention items={null} />);

    expect(screen.getByText("The attention list could not be loaded. Reload the page.")).toBeTruthy();
  });
});
