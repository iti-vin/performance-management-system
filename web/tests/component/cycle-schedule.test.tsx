import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CycleManage } from "@/features/review-cycles/components/cycle-manage";

const onSchedule = vi.fn();
const run = vi.fn((job: () => Promise<unknown>) => void job());

function renderManage(assessmentStart: string, change: { problemCount?: number; isDirty?: boolean } = {}) {
  render(
    <CycleManage
      cycleName="CY2027-Q1"
      participantCount={2}
      problemCount={change.problemCount ?? 0}
      isDirty={change.isDirty ?? false}
      isPending={false}
      assessmentStart={assessmentStart}
      onLaunch={vi.fn()}
      onSchedule={onSchedule}
      onCancel={vi.fn()}
      run={run}
    />,
  );
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}
const button = () => screen.queryByRole("button", { name: "Schedule Cycle" });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // 20:00 UTC on November 25 is November 26 in Manila.
  vi.setSystemTime(new Date("2026-11-25T20:00:00Z"));
  onSchedule.mockReset().mockResolvedValue({ message: "" });
});
afterEach(() => vi.useRealTimers());

describe("Schedule Cycle", () => {
  it("asks first, with the day the cycle starts and what freezes", async () => {
    const user = renderManage("2027-01-05");

    await user.click(screen.getByRole("button", { name: "Schedule Cycle" }));
    const dialog = within(await screen.findByRole("alertdialog"));
    expect(dialog.getByText(/on 2027-01-05/)).toBeTruthy();
    expect(dialog.getByText(/templates are frozen/)).toBeTruthy();
    expect(onSchedule).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Schedule Cycle" }));

    expect(onSchedule).toHaveBeenCalledTimes(1);
  });

  it.each(["", "2026-11-26", "2026-11-01"])("is not offered for the assessment start %o: that day is not ahead", (day) => {
    renderManage(day);

    expect(button()).toBeNull();
  });

  it.each([{ problemCount: 1 }, { isDirty: true }])("waits like a launch does: %o", (change) => {
    renderManage("2027-01-05", change);

    expect(button()).toBeDisabled();
  });
});
