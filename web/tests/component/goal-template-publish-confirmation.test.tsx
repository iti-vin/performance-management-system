import type { GoalTemplateDetailResponseDto } from "@pms/shared-types";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoalTemplateDetailsView } from "@/features/review-templates/components/goal-template-details-view";
import { GoalTemplateEditForm } from "@/features/review-templates/components/goal-template-edit-form";
import {
  archiveGoalTemplate,
  publishGoalTemplate,
  saveGoalTemplateEdits,
} from "@/features/review-templates/services/manage-goal-template";

vi.mock("@/features/review-templates/services/manage-goal-template", () => ({
  publishGoalTemplate: vi.fn(),
  archiveGoalTemplate: vi.fn(),
  saveGoalTemplateEdits: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const ID = (suffix: string) => `3f2504e0-4f89-41d3-9a0c-0305e82c33${suffix}`;
const POSITIONS = [{ value: "Software Engineer", label: "Software Engineer" }];
const DIALOG_TEXT = "A published template is frozen. To change it later, you publish a new version.";

function detail(status: "draft" | "published" | "archived" = "draft"): GoalTemplateDetailResponseDto {
  return {
    template: {
      templateId: ID("01"),
      position: "Software Engineer",
      company: "Mayon Consolidated Inc.",
      name: "Engineering Performance Goals",
      description: "Position targets",
      status,
      currentVersion: 1,
      publishedBy: null,
      publishedAt: null,
      archivedAt: null,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-05T00:00:00.000Z",
    },
    version: null,
    indicators: [
      {
        indicatorId: ID("03"),
        versionId: ID("02"),
        name: "Delivery rate",
        description: null,
        unit: "Percentage",
        target: 90,
        direction: "higher_is_better",
        weight: 100,
        scoreTargetMet: 5,
        scoreBelowTarget: 3.5,
        matrixKind: "none",
        matrixTitle: null,
        scaleBound: null,
        useForScoring: false,
      },
    ],
    scales: [],
    matrixRows: [],
    matrixColumns: [],
    matrixCells: [],
  };
}

beforeEach(() => {
  vi.mocked(saveGoalTemplateEdits).mockReset().mockResolvedValue({ message: "" });
  vi.mocked(publishGoalTemplate).mockReset().mockResolvedValue({ message: "" });
  vi.mocked(archiveGoalTemplate).mockReset().mockResolvedValue({ message: "" });
});

describe("KPI edit form, Publish Template", () => {
  it("asks first, and sends the publish intent only after the user confirms", async () => {
    const user = userEvent.setup();
    render(<GoalTemplateEditForm detail={detail("draft")} positions={POSITIONS} />);

    await user.click(screen.getByRole("button", { name: "Publish Template" }));

    const dialog = await screen.findByRole("alertdialog", { name: "Publish this template?" });
    expect(dialog.textContent).toContain(DIALOG_TEXT);
    expect(saveGoalTemplateEdits).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Publish Template" }));

    expect(saveGoalTemplateEdits).toHaveBeenCalledWith(ID("01"), expect.anything(), "publish");
  });

  it("sends nothing when the user cancels", async () => {
    const user = userEvent.setup();
    render(<GoalTemplateEditForm detail={detail("draft")} positions={POSITIONS} />);

    await user.click(screen.getByRole("button", { name: "Publish Template" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));

    expect(saveGoalTemplateEdits).not.toHaveBeenCalled();
  });

  it("still asks before Update Template, and sends the update intent once the user confirms", async () => {
    const user = userEvent.setup();
    render(<GoalTemplateEditForm detail={detail("published")} positions={POSITIONS} />);

    await user.click(screen.getByRole("button", { name: "Update Template" }));

    const dialog = await screen.findByRole("alertdialog", { name: "Update this template?" });
    expect(dialog.textContent).toContain("This publishes version 2. Cycles that already use version 1 keep it.");
    expect(saveGoalTemplateEdits).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Update Template" }));

    expect(saveGoalTemplateEdits).toHaveBeenCalledWith(ID("01"), expect.anything(), "update");
  });

  it("saves a draft without asking", async () => {
    const user = userEvent.setup();
    render(<GoalTemplateEditForm detail={detail("draft")} positions={POSITIONS} />);

    await user.click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(saveGoalTemplateEdits).toHaveBeenCalledWith(ID("01"), expect.anything(), "draft");
  });
});

describe("KPI details view, Publish Template", () => {
  it("asks first, and publishes the draft with its id once the user confirms", async () => {
    const user = userEvent.setup();
    render(<GoalTemplateDetailsView detail={detail("draft")} positions={POSITIONS} />);

    await user.click(screen.getByRole("button", { name: "Publish Template" }));

    const dialog = await screen.findByRole("alertdialog", { name: "Publish this template?" });
    expect(publishGoalTemplate).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Publish Template" }));

    expect(publishGoalTemplate).toHaveBeenCalledWith(ID("01"));
  });

  it("publishes nothing when the user cancels", async () => {
    const user = userEvent.setup();
    render(<GoalTemplateDetailsView detail={detail("draft")} positions={POSITIONS} />);

    await user.click(screen.getByRole("button", { name: "Publish Template" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));

    expect(publishGoalTemplate).not.toHaveBeenCalled();
  });
});

describe("KPI details, Archive", () => {
  it.each(["draft", "published"] as const)("asks first, and archives a %s template once the user confirms", async (status) => {
    const user = userEvent.setup();
    render(<GoalTemplateDetailsView detail={detail(status)} positions={POSITIONS} />);

    await user.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Archive this template?" });
    expect(archiveGoalTemplate).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Archive Template" }));

    expect(archiveGoalTemplate).toHaveBeenCalledWith(ID("01"));
  });

  it("offers no Archive for an archived template", () => {
    const status = "archived" as const;
    render(<GoalTemplateDetailsView detail={detail(status)} positions={POSITIONS} />);

    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
  });
});
