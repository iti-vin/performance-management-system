import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ReviewCycleDetailDto } from "@pms/shared-types";
import { CycleResultsTab } from "@/features/review-cycles/components/cycle-results-tab";

const cycle = { cycleId: "c", state: "completed", finalizedAt: "2026-11-26T00:00:00.000Z", releasedAt: null, employeeVisible: true, managerVisible: true } as ReviewCycleDetailDto;

describe("release, who reads the results", () => {
  async function release(untick: string[]) {
    const onRelease = vi.fn();
    const user = userEvent.setup();
    render(<CycleResultsTab cycle={cycle} results={[]} isPending={false} onFinalize={vi.fn()} onRelease={onRelease} />);
    for (const name of untick) await user.click(screen.getByRole("checkbox", { name }));
    await user.click(screen.getByRole("button", { name: "Release Results" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Release Results" }));
    return onRelease;
  }

  it("offers the employees and the managers, both chosen, and sends the choice", async () => {
    expect(await release([])).toHaveBeenCalledWith({ employeeVisible: true, managerVisible: true });
  });

  it("sends who is left out", async () => {
    expect(await release(["Employees read their own result"])).toHaveBeenCalledWith({ employeeVisible: false, managerVisible: true });
  });
});
