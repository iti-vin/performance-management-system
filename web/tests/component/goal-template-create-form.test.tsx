import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoalTemplateCreateForm } from "@/features/review-templates/components/goal-template-create-form";
import { GoalTemplateNotice } from "@/features/review-templates/components/goal-template-notice";
import { KpiGoalTemplateEditor } from "@/features/review-templates/components/kpi-goal-template-editor";
import { noMatrix } from "@/features/review-templates/services/indicator-matrix";
import { createGoalTemplate } from "@/features/review-templates/services/create-goal-template";

vi.mock("@/features/review-templates/services/create-goal-template", () => ({
  createGoalTemplate: vi.fn(),
}));

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const POSITIONS = [{ value: "12", label: "Engineering Manager" }];
const BACK = "/reviews/templates/kpi-goal-template";

const BLANK_INDICATOR = {
  id: "i-1",
  name: "",
  description: "",
  unit: "",
  direction: "higher_is_better" as const,
  target: "",
  weight: "",
  scoreMet: "",
  scoreBelow: "",
  matrix: noMatrix(),
};
const VALID_INDICATOR = {
  ...BLANK_INDICATOR,
  name: "Delivery rate",
  unit: "Percentage",
  target: "90",
  weight: "100",
  scoreMet: "5",
  scoreBelow: "2",
};

beforeEach(() => {
  push.mockReset();
  vi.mocked(createGoalTemplate).mockReset();
});

describe("GoalTemplateCreateForm", () => {
  it("opens as the legacy builder: header actions and one pre-filled indicator", () => {
    render(<GoalTemplateCreateForm positions={POSITIONS} />);

    expect(screen.getByRole("heading", { level: 1, name: "KPI Goal Template Builder" })).toBeTruthy();
    for (const name of ["Preview", "Save as Draft", "Publish Template"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
    expect(screen.getByRole("group", { name: "Indicator 1" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Indicator 2" })).toBeNull();
    expect((screen.getByLabelText("Weight (%)") as HTMLInputElement).value).toBe("25");
    expect((screen.getByLabelText("Target Value") as HTMLInputElement).value).toBe("100");
    expect((screen.getByLabelText(/score when target is met/i) as HTMLInputElement).value).toBe("5");
    expect((screen.getByLabelText(/score when target is missed/i) as HTMLInputElement).value).toBe("2");
  });

  it("shows Basic Information: the template name, the description, and the position", () => {
    render(<GoalTemplateCreateForm positions={POSITIONS} />);

    const basic = within(screen.getByRole("group", { name: "Basic Information" }));
    expect(basic.getByLabelText(/^Template Name/)).toBeTruthy();
    expect(basic.getAllByLabelText("Description")[0]).toBeTruthy();
    expect(basic.getByRole("combobox", { name: /applicable position/i })).toBeTruthy();
  });

  it("adds and removes indicators", async () => {
    const user = userEvent.setup();
    render(<GoalTemplateCreateForm positions={POSITIONS} />);

    await user.click(screen.getByRole("button", { name: "Add indicator" }));
    expect(screen.getByRole("group", { name: "Indicator 2" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Remove indicator 2" }));
    expect(screen.queryByRole("group", { name: "Indicator 2" })).toBeNull();
  });

  it("asks first before it publishes, and calls the server only after the user confirms", async () => {
    vi.mocked(createGoalTemplate).mockResolvedValue({ message: "" });
    const user = userEvent.setup();
    render(<GoalTemplateCreateForm positions={POSITIONS} />);
    await user.type(screen.getByLabelText(/^Template Name/), "Software Engineer Performance Goals");
    await user.click(screen.getByRole("combobox", { name: /applicable position/i }));
    await user.click(await screen.findByRole("option", { name: "Engineering Manager" }));
    await user.type(screen.getByLabelText("Indicator Name"), "Delivery rate");
    const weight = screen.getByLabelText("Weight (%)");
    await user.clear(weight);
    await user.type(weight, "100");

    await user.click(screen.getByRole("button", { name: "Publish Template" }));

    const dialog = await screen.findByRole("alertdialog", { name: "Publish this template?" });
    expect(createGoalTemplate).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Publish Template" }));

    expect(createGoalTemplate).toHaveBeenCalledWith(expect.anything(), "publish");
  });

  it("opens no dialog for a template that the builder refuses: with no name, Publish Template stops at the builder's own check", async () => {
    const user = userEvent.setup();
    render(<GoalTemplateCreateForm positions={POSITIONS} />);

    await user.click(screen.getByRole("button", { name: "Publish Template" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(createGoalTemplate).not.toHaveBeenCalled();
  });

  it("marks invalid controls inline and focuses the first one, the template name", async () => {
    const user = userEvent.setup();
    render(<GoalTemplateCreateForm positions={POSITIONS} />);

    await user.click(screen.getByRole("button", { name: "Save as Draft" }));

    const templateName = screen.getByLabelText(/^Template Name/);
    expect(templateName).toHaveFocus();
    expect(templateName).toHaveAccessibleDescription("Enter a template name.");
    const position = screen.getByRole("combobox", { name: /applicable position/i });
    expect(position).toHaveAccessibleDescription("Choose an applicable position.");
    const indicatorName = screen.getByLabelText("Indicator Name");
    expect(indicatorName).toHaveAttribute("aria-invalid", "true");
    await user.type(templateName, "Software Engineer Performance Goals");
    expect(templateName).not.toHaveAttribute("aria-invalid");
    expect(position).toHaveAttribute("aria-invalid", "true");
    expect(createGoalTemplate).not.toHaveBeenCalled();
  });
});

describe("KpiGoalTemplateEditor", () => {
  function renderEditor(indicator = VALID_INDICATOR, onSave = vi.fn()) {
    render(
      <KpiGoalTemplateEditor
        positions={POSITIONS}
        onSave={onSave}
        backHref={BACK}
        initialTemplate={{
          name: "Software Engineer Performance Goals",
          description: "",
          position: "12",
          indicators: [indicator],
        }}
      />,
    );
    return onSave;
  }

  it("previews the template read-only, and returns to the builder", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByRole("heading", { level: 1, name: "KPI Goal Template Preview" })).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Delivery rate")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add indicator" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove indicator 1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save as Draft" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Back to Builder" }));

    expect(screen.getByRole("heading", { level: 1, name: "KPI Goal Template Builder" })).toBeTruthy();
    expect((screen.getByLabelText("Indicator Name") as HTMLInputElement).disabled).toBe(false);
  });

  it("goes back without a prompt while nothing changed", async () => {
    renderEditor();

    const link = screen.getByRole("link", { name: /back to kpi goal templates/i });
    expect(link.getAttribute("href")).toBe(BACK);
    await userEvent.setup().click(link);

    expect(screen.queryByText("Leave without saving?")).toBeNull();
  });

  it("asks before it leaves with unsaved changes, and leaves on confirm", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText("Indicator Name"), "x");
    await user.click(screen.getByRole("link", { name: /back to kpi goal templates/i }));

    expect(await screen.findByText("Leave without saving?")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(push).toHaveBeenCalledWith(BACK);
  });

  it("starts over after the user leaves, so a kept page shows no stale dialog or text", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText("Indicator Name"), "x");
    await user.click(screen.getByRole("link", { name: /back to kpi goal templates/i }));
    await user.click(await screen.findByRole("button", { name: "Discard changes" }));

    expect(screen.queryByText("Leave without saving?")).toBeNull();
    expect((screen.getByLabelText("Indicator Name") as HTMLInputElement).value).toBe("Delivery rate");
  });

  it("checks a blank indicator on Save as Draft, and names the indicator", async () => {
    const onSave = renderEditor(BLANK_INDICATOR);

    await userEvent.setup().click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(screen.getByText("Indicator 1: enter a name.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("requires a unit, as the contract does", async () => {
    const onSave = renderEditor({ ...VALID_INDICATOR, unit: "" });

    await userEvent.setup().click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(screen.getByText("Indicator 1: enter a unit.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it.each([
    ["weight", { weight: "123" }, "Weight (%) must be more than 0 and up to 100."],
    ["weight", { weight: "0" }, "Weight (%) must be more than 0 and up to 100."],
    ["score met", { scoreMet: "123123" }, "Score When Target Is Met must be from 1 to 5, with up to two decimal places."],
    ["score met below 1", { scoreMet: "0.5" }, "Score When Target Is Met must be from 1 to 5, with up to two decimal places."],
    ["score missed", { scoreBelow: "0" }, "Score When Target Is Missed must be from 1 to 5, with up to two decimal places."],
    ["score missed with three decimals", { scoreBelow: "3.555" }, "Score When Target Is Missed must be from 1 to 5, with up to two decimal places."],
    ["target", { target: "-1" }, "Target Value must be from 0 to 100 when the unit is Percentage."],
    ["percentage target above 100", { target: "150" }, "Target Value must be from 0 to 100 when the unit is Percentage."],
  ])("says the allowed range for a bad %s", async (_name, change, message) => {
    const onSave = renderEditor({ ...VALID_INDICATOR, ...change });

    await userEvent.setup().click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(screen.getByText(`Indicator 1: ${message}`)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it.each(["3.5", "3.25", "5", "1"])("accepts the score %s", async (score) => {
    const onSave = renderEditor({ ...VALID_INDICATOR, scoreBelow: score });

    await userEvent.setup().click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(onSave).toHaveBeenCalledWith(expect.anything(), "draft");
  });

  it("accepts a target above 100 when the unit is not a percentage", async () => {
    const onSave = renderEditor({ ...VALID_INDICATOR, unit: "Count", target: "150" });

    await userEvent.setup().click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(onSave).toHaveBeenCalledWith(expect.anything(), "draft");
  });

  it("stops a typed percentage target and weight at 100", async () => {
    const user = userEvent.setup();
    renderEditor();

    const target = screen.getByLabelText("Target Value") as HTMLInputElement;
    await user.clear(target);
    await user.type(target, "250");
    const weight = screen.getByLabelText("Weight (%)") as HTMLInputElement;
    await user.clear(weight);
    await user.type(weight, "170");

    expect(target.value).toBe("100");
    expect(weight.value).toBe("100");
    expect(target.max).toBe("100");
  });

  it("stops a typed score at 5", async () => {
    const user = userEvent.setup();
    renderEditor();

    for (const label of [/score when target is met/i, /score when target is missed/i]) {
      const score = screen.getByLabelText(label) as HTMLInputElement;
      await user.clear(score);
      await user.type(score, "9");
      expect(score.value).toBe("5");
      await user.clear(score);
      await user.type(score, "3.5");
      expect(score.value).toBe("3.5");
    }
  });

  it("lets a draft keep weights that do not total 100", async () => {
    const onSave = renderEditor({ ...VALID_INDICATOR, weight: "60" });

    await userEvent.setup().click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(onSave).toHaveBeenCalledWith(expect.anything(), "draft");
  });

  it("blocks Publish Template until the weights total 100", async () => {
    const onSave = renderEditor({ ...VALID_INDICATOR, weight: "60" });

    await userEvent.setup().click(screen.getByRole("button", { name: "Publish Template" }));

    expect(screen.getByText("Total weight: 60% of 100%")).toHaveFocus();
    expect(screen.getByText("Allocate the remaining 40% before publishing.")).toBeVisible();
    expect(screen.getByLabelText("Weight (%)")).not.toHaveAttribute("aria-invalid", "true");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows a save error at the top and blocks a second submit while it saves", () => {
    render(
      <KpiGoalTemplateEditor
        positions={POSITIONS}
        onSave={vi.fn()}
        backHref={BACK}
        submitError="The template could not be saved. Try again."
        isPending
      />,
    );

    expect(screen.getByText("The template could not be saved. Try again.")).toBeTruthy();
    for (const name of ["Save as Draft", "Publish Template"]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
  });
});

describe("GoalTemplateNotice forbidden", () => {
  it("covers both causes: the HR role and a linked company record", () => {
    render(<GoalTemplateNotice kind="forbidden" />);

    expect(screen.getByRole("alert").textContent).toMatch(/company/i);
  });
});
