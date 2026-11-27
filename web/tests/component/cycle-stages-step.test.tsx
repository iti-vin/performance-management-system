import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CycleStagesStep } from "@/features/review-cycles/components/cycle-stages-step";
import type { StageDraft } from "@/features/review-cycles/services/cycle-draft";

const IGING = "284ddc9e-ebe4-468d-945f-fb18af72e622";
const HR_1 = "6a685ca5-7613-4e80-a384-4ebe60263aa3";
const HR_2 = "6293e9c7-6495-4555-85a9-1eccebc6d34c";

const STAGES: StageDraft[] = [
  { perspective: "self", deadline: "2027-04-07", evaluatorId: "" },
  { perspective: "manager", deadline: "2027-04-14", evaluatorId: "" },
  { perspective: "hr", deadline: "2027-04-21", evaluatorId: HR_1 },
];
const HR_EVALUATORS = [
  { employeeId: IGING, name: "Iging DotTech" },
  { employeeId: HR_1, name: "Lebron James" },
  { employeeId: HR_2, name: "System Administrator" },
];

function renderStep(overrides: Partial<Parameters<typeof CycleStagesStep>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <CycleStagesStep stages={STAGES} hrEvaluators={HR_EVALUATORS} participantIds={[IGING]} onChange={onChange} {...overrides} />,
  );
  return onChange;
}

describe("CycleStagesStep", () => {
  it("shows the three stages in order, each with its deadline", () => {
    renderStep();

    const headings = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["1. Self-Assessment", "2. Managerial Assessment", "3. HR Assessment"]);
    expect((screen.getByLabelText("Self-Assessment Deadline") as HTMLInputElement).value).toBe("2027-04-07");
    expect((screen.getByLabelText("HR Assessment Deadline") as HTMLInputElement).value).toBe("2027-04-21");
  });

  it("explains who evaluates the self and manager stages: the employee, and the applied manager found at launch", () => {
    renderStep();

    expect(screen.getByText("Each employee evaluates themselves.")).toBeTruthy();
    expect(screen.getByText("The manager of each employee at launch evaluates.")).toBeTruthy();
  });

  it("reports the stage whose deadline changed, and keeps the others", async () => {
    const onChange = renderStep({ stages: [{ ...STAGES[0]!, deadline: "" }, STAGES[1]!, STAGES[2]!] });

    await userEvent.setup().type(screen.getByLabelText("Self-Assessment Deadline"), "2027-04-08");

    const [stages] = onChange.mock.calls.at(-1) as [StageDraft[]];
    expect(stages.map((stage) => stage.perspective)).toEqual(["self", "manager", "hr"]);
    expect(stages[1]).toEqual(STAGES[1]);
    expect(stages[0]?.deadline).not.toBe("");
  });

  it("offers the HR evaluators, without the employees that are participants of the cycle", async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole("combobox", { name: "HR evaluator" }));

    expect(await screen.findByRole("option", { name: "System Administrator" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Iging DotTech" })).toBeNull();
  });

  it("reports the HR evaluator that HR picks", async () => {
    const onChange = renderStep();
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "HR evaluator" }));
    await user.click(await screen.findByRole("option", { name: "System Administrator" }));

    const [stages] = onChange.mock.calls.at(-1) as [StageDraft[]];
    expect(stages[2]?.evaluatorId).toBe(HR_2);
  });

  it("says when no HR evaluator is available", () => {
    renderStep({ hrEvaluators: [] });

    expect(screen.getByText("No HR administrator of this company is available to evaluate.")).toBeTruthy();
  });

  it("shows the message of a stage under its field, and marks the field invalid", () => {
    renderStep({ errors: { "stages.1.deadline": "The deadline must be after the stage before it." } });

    expect(screen.getByLabelText("Managerial Assessment Deadline").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("The deadline must be after the stage before it.")).toBeTruthy();
  });
});

describe("peer and upward stages", () => {
  const MARIA = "00000000-0000-0000-0000-000000000022";
  const BOSS = "00000000-0000-0000-0000-000000000026";
  const EMPLOYEES = [
    { employeeId: IGING, name: "Iging DotTech", managerId: BOSS },
    { employeeId: HR_1, name: "Lebron James", managerId: null },
    { employeeId: HR_2, name: "System Administrator", managerId: null },
    { employeeId: MARIA, name: "Maria Santos", managerId: null },
    { employeeId: BOSS, name: "Ramon Reyes", managerId: null },
  ];
  const anonymous = (change: object = {}) => ({
    employees: EMPLOYEES,
    choices: {},
    minimum: "3",
    onChange: vi.fn(),
    onMinimumChange: vi.fn(),
    ...change,
  });
  const withPeer: StageDraft[] = [STAGES[0]!, { perspective: "peer", deadline: "", evaluatorId: "" }, STAGES[2]!];

  it("adds a peer stage and an upward stage before the HR stage", async () => {
    const onChange = renderStep({ peers: anonymous() });

    await userEvent.setup().click(screen.getByRole("checkbox", { name: "Include peer assessment" }));
    expect((onChange.mock.calls.at(-1)?.[0] as StageDraft[]).map((stage) => stage.perspective)).toEqual(["self", "manager", "peer", "hr"]);
    await userEvent.setup().click(screen.getByRole("checkbox", { name: "Include upward assessment" }));
    expect((onChange.mock.calls.at(-1)?.[0] as StageDraft[]).map((stage) => stage.perspective)).toEqual(["self", "manager", "upward", "hr"]);
  });

  it("removes a stage that is unchecked", async () => {
    const onChange = renderStep({ stages: withPeer, peers: anonymous() });

    await userEvent.setup().click(screen.getByRole("checkbox", { name: "Include peer assessment" }));

    expect((onChange.mock.calls.at(-1)?.[0] as StageDraft[]).map((stage) => stage.perspective)).toEqual(["self", "hr"]);
  });

  it("asks for the peers of each participant, without themselves, and the anonymity minimum", async () => {
    const peers = anonymous();
    renderStep({ stages: withPeer, peers });
    const user = userEvent.setup();

    expect(screen.getByText("Iging DotTech: 0 peers chosen")).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Iging DotTech" })).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: "Maria Santos" }));

    expect(peers.onChange).toHaveBeenCalledWith({ [IGING]: [MARIA] });
    expect((screen.getByLabelText("Anonymity Minimum") as HTMLInputElement).value).toBe("3");
  });

  it("leaves out the manager of the participant and the HR administrators, who read the results (D12)", () => {
    renderStep({ stages: withPeer, peers: anonymous() });

    expect(screen.getByRole("checkbox", { name: "Maria Santos" })).toBeTruthy();
    for (const name of ["Ramon Reyes", "Lebron James", "System Administrator"]) {
      expect(screen.queryByRole("checkbox", { name: new RegExp(name) })).toBeNull();
    }
  });

  it("still shows a saved peer who cannot be one, so HR can remove them (D12)", async () => {
    const peers = anonymous({ choices: { [IGING]: [BOSS] } });
    renderStep({ stages: withPeer, peers });

    const saved = screen.getByRole("checkbox", { name: "Ramon Reyes (cannot be a peer)" });
    expect(saved).toBeChecked();
    await userEvent.setup().click(saved);

    expect(peers.onChange).toHaveBeenCalledWith({ [IGING]: [] });
  });

  it("shows no peer choice and no minimum without such a stage", () => {
    renderStep({ peers: anonymous() });

    expect(screen.queryByLabelText("Anonymity Minimum")).toBeNull();
    expect(screen.queryByText(/peers chosen/)).toBeNull();
  });
});
