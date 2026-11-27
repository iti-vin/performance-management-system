import type { BehavioralTemplateTreeResponseDto } from "@pms/shared-types";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BehavioralTemplateDetailsView } from "@/features/review-templates/components/behavioral-template-details-view";
import { archiveBehavioralTemplate, publishBehavioralTemplate } from "@/features/review-templates/services/manage-behavioral-template";

vi.mock("@/features/review-templates/services/manage-behavioral-template", () => ({
  publishBehavioralTemplate: vi.fn(),
  archiveBehavioralTemplate: vi.fn(),
  saveBehavioralTemplateEdits: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const id = (n: number) => `3f2504e0-4f89-41d3-9a0c-0305e82c33${String(n).padStart(2, "0")}`;
const PATH = "/reviews/templates/behavioral-assessment-template";

function tree(status: "draft" | "published" | "archived" = "draft"): BehavioralTemplateTreeResponseDto {
  return {
    template: {
      templateId: id(1),
      company: "Mayon Consolidated Inc.",
      name: "Quarterly Performance Review",
      description: "Reflect on behaviors.",
      category: "general_performance",
      reviewType: "hr",
      status,
      currentVersion: 1,
      publishedBy: null,
      publishedAt: null,
      archivedAt: null,
      createdAt: "2026-11-24T06:00:00.000Z",
      updatedAt: "2026-11-24T06:00:00.000Z",
    },
    version: null,
    sections: [{ sectionId: id(10), versionId: id(2), title: "Job Performance", sortOrder: 0 }],
    questions: [
      { questionId: id(21), sectionId: id(10), prompt: "Meets deadlines?", questionType: "rating_scale", isRequired: true, allowNotObserved: true, sortOrder: 0 },
      { questionId: id(22), sectionId: id(10), prompt: "How often?", questionType: "multiple_choice", isRequired: true, allowNotObserved: null, sortOrder: 1 },
    ],
    options: [
      { optionId: id(31), questionId: id(22), label: "Daily" },
      { optionId: id(32), questionId: id(22), label: "Weekly" },
    ],
  };
}

beforeEach(() => {
  vi.mocked(publishBehavioralTemplate).mockReset().mockResolvedValue({ message: "" });
  vi.mocked(archiveBehavioralTemplate).mockReset().mockResolvedValue({ message: "" });
});

describe("BehavioralTemplateDetailsView", () => {
  it("shows the template as text: name, status and version as words, category, review type, sections, questions, and options", () => {
    render(<BehavioralTemplateDetailsView tree={tree()} />);

    expect(screen.getByRole("heading", { name: "Behavioral Assessment Template Details" })).toBeTruthy();
    expect(screen.getByText("Quarterly Performance Review")).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.getByText("Version 1")).toBeTruthy();
    expect(screen.getByText(/General Performance/)).toBeTruthy();
    expect(screen.getByText(/HR review/)).toBeTruthy();
    expect(screen.getByText("Job Performance")).toBeTruthy();
    expect(screen.getByText("Meets deadlines?")).toBeTruthy();
    expect(screen.getByText("Daily")).toBeTruthy();
    expect(screen.getByRole("link", { name: /back to behavioral assessment templates/i }).getAttribute("href")).toBe(PATH);
  });

  it("has no input: a details page is read only", () => {
    render(<BehavioralTemplateDetailsView tree={tree()} />);

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("offers Edit Draft and Publish Template for a draft", () => {
    render(<BehavioralTemplateDetailsView tree={tree("draft")} />);

    expect(screen.getByRole("link", { name: "Edit Draft" }).getAttribute("href")).toBe(`${PATH}/${id(1)}/edit`);
    expect(screen.getByRole("button", { name: "Publish Template" })).toBeTruthy();
  });

  it("offers Edit Template for a published template: the edit publishes its next version", () => {
    render(<BehavioralTemplateDetailsView tree={tree("published")} />);

    expect(screen.getByText("Published")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Edit Template" }).getAttribute("href")).toBe(`${PATH}/${id(1)}/edit`);
    expect(screen.queryByRole("button", { name: "Publish Template" })).toBeNull();
    expect(screen.queryByText(/cannot be edited/i)).toBeNull();
  });

  it("offers no action for an archived template", () => {
    render(<BehavioralTemplateDetailsView tree={tree("archived")} />);

    expect(screen.queryByRole("link", { name: /edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /publish/i })).toBeNull();
  });

  it("asks first, and publishes the draft with its id once the user confirms", async () => {
    const user = userEvent.setup();
    render(<BehavioralTemplateDetailsView tree={tree("draft")} />);

    await user.click(screen.getByRole("button", { name: "Publish Template" }));

    const dialog = await screen.findByRole("alertdialog", { name: "Publish this template?" });
    expect(publishBehavioralTemplate).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Publish Template" }));

    expect(publishBehavioralTemplate).toHaveBeenCalledWith(id(1));
  });

  it("publishes nothing when the user cancels", async () => {
    const user = userEvent.setup();
    render(<BehavioralTemplateDetailsView tree={tree("draft")} />);

    await user.click(screen.getByRole("button", { name: "Publish Template" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));

    expect(publishBehavioralTemplate).not.toHaveBeenCalled();
  });

  it("shows the reason when the API refuses to publish", async () => {
    vi.mocked(publishBehavioralTemplate).mockResolvedValue({ message: "The template is already published." });
    const user = userEvent.setup();
    render(<BehavioralTemplateDetailsView tree={tree("draft")} />);

    await user.click(screen.getByRole("button", { name: "Publish Template" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Publish Template" }));

    expect(await screen.findByText("The template is already published.")).toBeTruthy();
  });
});

describe("BehavioralTemplateDetailsView, Archive", () => {
  it.each(["draft", "published"] as const)("asks first, and archives a %s template once the user confirms", async (status) => {
    const user = userEvent.setup();
    render(<BehavioralTemplateDetailsView tree={tree(status)} />);

    await user.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Archive this template?" });
    expect(archiveBehavioralTemplate).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Archive Template" }));

    expect(archiveBehavioralTemplate).toHaveBeenCalledWith(id(1));
  });

  it("offers no Archive for an archived template", () => {
    const status = "archived" as const;
    render(<BehavioralTemplateDetailsView tree={tree(status)} />);

    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
  });
});
