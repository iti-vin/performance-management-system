import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ReviewCycleDetailDto } from "@pms/shared-types";
import { CycleDetailsForm } from "@/features/review-cycles/components/cycle-details-form";
import { CycleResultsTab } from "@/features/review-cycles/components/cycle-results-tab";
import { newCycleDraft } from "@/features/review-cycles/services/cycle-draft";

describe("result visibility in the wizard (Cyc-001)", () => {
  it("starts with both readers, and says what HR unticks", async () => {
    const onChange = vi.fn();
    expect(newCycleDraft()).toMatchObject({ employeeVisible: true, managerVisible: true });
    render(<CycleDetailsForm values={newCycleDraft()} onChange={onChange} />);

    const group = within(screen.getByRole("group", { name: "Result Visibility" }));
    await userEvent.setup().click(group.getByRole("checkbox", { name: "Managers read the results of their team" }));

    expect(group.getByRole("checkbox", { name: "Employees read their own result" })).toBeChecked();
    expect(onChange).toHaveBeenCalledWith({ managerVisible: false });
  });

  it("lets later reviewers read earlier answers on a new cycle, and HR can turn that off (D5)", async () => {
    const onChange = vi.fn();
    expect(newCycleDraft()).toMatchObject({ earlierAnswersVisible: true });
    render(<CycleDetailsForm values={newCycleDraft()} onChange={onChange} />);

    const earlier = screen.getByRole("checkbox", { name: "Reviewers read the answers of earlier stages" });
    expect(earlier).toBeChecked();
    await userEvent.setup().click(earlier);

    expect(onChange).toHaveBeenCalledWith({ earlierAnswersVisible: false });
  });

  it("does not offer that choice at the release: it is about the running cycle (D5)", () => {
    const cycle = { cycleId: "c", state: "completed", finalizedAt: "2026-11-26T00:00:00.000Z", releasedAt: null, employeeVisible: true, managerVisible: true, earlierAnswersVisible: true };
    render(<CycleResultsTab cycle={cycle as ReviewCycleDetailDto} results={[]} isPending={false} onFinalize={vi.fn()} onRelease={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: "Managers read the results of their team" })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Reviewers read the answers of earlier stages" })).toBeNull();
  });

  it("starts a release from the choice of the cycle", async () => {
    const onRelease = vi.fn();
    const user = userEvent.setup();
    const cycle = { cycleId: "c", state: "completed", finalizedAt: "2026-11-26T00:00:00.000Z", releasedAt: null, employeeVisible: false, managerVisible: true };
    render(<CycleResultsTab cycle={cycle as ReviewCycleDetailDto} results={[]} isPending={false} onFinalize={vi.fn()} onRelease={onRelease} />);

    expect(screen.getByRole("checkbox", { name: "Employees read their own result" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Release Results" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Release Results" }));

    expect(onRelease).toHaveBeenCalledWith({ employeeVisible: false, managerVisible: true });
  });
});
