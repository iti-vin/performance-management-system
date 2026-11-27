import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  CycleTemplatesStep,
  type TemplateChoices,
} from "@/features/review-cycles/components/cycle-templates-step";

const IGING = "284ddc9e-ebe4-468d-945f-fb18af72e622";
const MARIA = "00000000-0000-0000-0000-000000000022";
const ADMIN = "6293e9c7-6495-4555-85a9-1eccebc6d34c";
const KPI_A = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const KPI_B = "3f2504e0-4f89-41d3-9a0c-0305e82c3302";
const KPI_MANAGER = "3f2504e0-4f89-41d3-9a0c-0305e82c3303";
const BEH_1 = "3f2504e0-4f89-41d3-9a0c-0305e82c3311";
const BEH_2 = "3f2504e0-4f89-41d3-9a0c-0305e82c3312";

const PARTICIPANTS = [
  { employeeId: IGING, name: "Iging DotTech", position: "Software Engineer", department: "Engineering", employeeCode: "EMP-001", managerId: null, managerName: null },
  { employeeId: MARIA, name: "Maria Santos", position: "Engineering Manager", department: "Engineering", employeeCode: "EMP-002", managerId: null, managerName: null },
  { employeeId: ADMIN, name: "System Administrator", position: null, department: "Engineering", employeeCode: "EMP-003", managerId: null, managerName: null },
];
const KPI_TEMPLATES = [
  { templateId: KPI_A, name: "Engineer goals", position: "Software Engineer", version: 2 },
  { templateId: KPI_B, name: "Engineer goals (new)", position: "Software Engineer", version: 1 },
  { templateId: KPI_MANAGER, name: "Manager goals", position: "Engineering Manager", version: 1 },
];
const BEHAVIORAL = [
  { templateId: BEH_1, name: "Quarterly review", version: 1 },
  { templateId: BEH_2, name: "Peer feedback", version: 3 },
];
const NO_CHOICES: TemplateChoices = { kpiChoices: {}, behavioralDefaultId: "", behavioralOverrides: {} };

function renderStep(choices: TemplateChoices = NO_CHOICES, onChange = vi.fn()) {
  render(
    <CycleTemplatesStep
      participants={PARTICIPANTS}
      kpiTemplates={KPI_TEMPLATES}
      behavioralTemplates={BEHAVIORAL}
      choices={choices}
      onChange={onChange}
    />,
  );
  return onChange;
}

const rowOf = (name: string) => within(screen.getByText(name).closest("tr")!);

describe("CycleTemplatesStep, KPI goal templates", () => {
  it("says which template matches when the position has exactly one published template", () => {
    renderStep();

    expect(rowOf("Maria Santos").getByText("Matched: Manager goals · v1")).toBeTruthy();
  });

  it("asks HR to choose when several published templates share the position", () => {
    renderStep();

    expect(rowOf("Iging DotTech").getByRole("combobox", { name: "KPI goal template for Iging DotTech" })).toBeTruthy();
  });

  it("says no template matches an employee with no position, and tells HR to set the position", () => {
    renderStep();

    expect(rowOf("System Administrator").getByText("No position, so no KPI goal template can match.")).toBeTruthy();
  });

  it("says no published template has the position when none does", () => {
    render(
      <CycleTemplatesStep
        participants={[PARTICIPANTS[0]!]}
        kpiTemplates={[]}
        behavioralTemplates={BEHAVIORAL}
        choices={NO_CHOICES}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("No published template for the position Software Engineer.")).toBeTruthy();
  });

  it("reports the template that HR chose for one employee, and keeps the other choices", async () => {
    const onChange = renderStep({ ...NO_CHOICES, kpiChoices: { [MARIA]: KPI_MANAGER } });
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "KPI goal template for Iging DotTech" }));
    await user.click(await screen.findByRole("option", { name: "Engineer goals (new) · v1" }));

    expect(onChange).toHaveBeenCalledWith({
      ...NO_CHOICES,
      kpiChoices: { [MARIA]: KPI_MANAGER, [IGING]: KPI_B },
    });
  });
});

describe("CycleTemplatesStep, templates with one name", () => {
  const twin = (templateId: string, version: number) => ({ templateId, name: "Engineer goals", position: "Software Engineer", version });
  const offered = async (templates: ReturnType<typeof twin>[]) => {
    render(
      <CycleTemplatesStep participants={[PARTICIPANTS[0]!]} kpiTemplates={templates} behavioralTemplates={BEHAVIORAL} choices={NO_CHOICES} onChange={vi.fn()} />,
    );
    await userEvent.setup().click(screen.getByRole("combobox", { name: "KPI goal template for Iging DotTech" }));
    return (await screen.findAllByRole("option")).map((option) => option.textContent);
  };

  it("tells them apart by version", async () => {
    expect(await offered([twin(KPI_A, 2), twin(KPI_B, 1)])).toEqual(["Engineer goals · v2", "Engineer goals · v1"]);
  });

  it("adds the start of the id when the version is the same too", async () => {
    const other = "9a1b2c3d-4f89-41d3-9a0c-0305e82c3302";

    expect(await offered([twin(KPI_A, 1), twin(other, 1)])).toEqual([
      "Engineer goals · v1 · 3f2504e0",
      "Engineer goals · v1 · 9a1b2c3d",
    ]);
  });
});

describe("CycleTemplatesStep, behavioral templates", () => {
  it("offers the published behavioral templates as the default, and reports the one chosen", async () => {
    const onChange = renderStep();
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "Default behavioral template" }));
    await user.click(await screen.findByRole("option", { name: "Peer feedback · v3" }));

    expect(onChange).toHaveBeenCalledWith({ ...NO_CHOICES, behavioralDefaultId: BEH_2 });
  });

  it("offers one override for each position of the participants, and none for an employee with no position", () => {
    renderStep();

    expect(screen.getByRole("combobox", { name: "Behavioral template for Software Engineer" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Behavioral template for Engineering Manager" })).toBeTruthy();
    expect(screen.getAllByRole("combobox", { name: /Behavioral template for/ })).toHaveLength(2);
  });

  it("reports an override by position, and removes it when HR picks the default again", async () => {
    const onChange = renderStep({ ...NO_CHOICES, behavioralDefaultId: BEH_1, behavioralOverrides: { "Software Engineer": BEH_2 } });
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "Behavioral template for Software Engineer" }));
    await user.click(await screen.findByRole("option", { name: "Use the default" }));

    expect(onChange).toHaveBeenCalledWith({ ...NO_CHOICES, behavioralDefaultId: BEH_1, behavioralOverrides: {} });
  });

  it("says no behavioral template is published when the company has none", () => {
    render(
      <CycleTemplatesStep participants={PARTICIPANTS} kpiTemplates={KPI_TEMPLATES} behavioralTemplates={[]} choices={NO_CHOICES} onChange={vi.fn()} />,
    );

    expect(screen.getByText("No behavioral template is published yet. Publish one first.")).toBeTruthy();
  });
});

describe("a component that the cycle leaves out", () => {
  const choices = { kpiChoices: {}, behavioralDefaultId: "", behavioralOverrides: {} };
  const props = { participants: [], kpiTemplates: [], behavioralTemplates: [], choices, onChange: vi.fn() };

  it("asks for no KPI goal template", () => {
    render(<CycleTemplatesStep {...props} usesGoals={false} usesBehavioral />);

    expect(screen.getByText("Goals Performance does not apply to this cycle.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("asks for no behavioral template", () => {
    render(<CycleTemplatesStep {...props} usesGoals usesBehavioral={false} />);

    expect(screen.getByText("Behavioral Performance does not apply to this cycle.")).toBeTruthy();
    expect(screen.queryByText(/No behavioral template is published/)).toBeNull();
  });
});
