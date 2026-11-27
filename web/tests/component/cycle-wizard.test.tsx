import type { ReviewCycleOptionsDto } from "@pms/shared-types";
import { Activity, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CycleWizard } from "@/features/review-cycles/components/cycle-wizard";
import { newCycleDraft, type CycleDraft } from "@/features/review-cycles/services/cycle-draft";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const BACK = "/review-cycles";
const IGING = "284ddc9e-ebe4-468d-945f-fb18af72e622";
const HR = "6a685ca5-7613-4e80-a384-4ebe60263aa3";
const BEH = "3f2504e0-4f89-41d3-9a0c-0305e82c3311";
const KPI = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const OPTIONS: ReviewCycleOptionsDto = {
  employees: [{ employeeId: IGING, name: "Iging DotTech", position: "Software Engineer", department: "Engineering", employeeCode: "EMP-001", managerId: null, managerName: null }],
  kpiTemplates: [{ templateId: KPI, name: "Engineer goals", position: "Software Engineer", version: 1 }],
  behavioralTemplates: [{ templateId: BEH, name: "Quarterly review", version: 1 }],
  hrEvaluators: [{ employeeId: HR, name: "Lebron James" }],
};

beforeEach(() => {
  push.mockReset();
});

function renderWizard(onSave = vi.fn(async () => ({ message: "" }))) {
  render(<CycleWizard options={OPTIONS} onSave={onSave} backHref={BACK} />);
  return onSave;
}

const next = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Continue" }));

async function fillEverything(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Cycle Name"), "CY2027-Q1");
  fireEvent.change(screen.getByLabelText("Evaluation Period Start"), { target: { value: "2027-01-01" } });
  fireEvent.change(screen.getByLabelText("Evaluation Period End"), { target: { value: "2027-03-31" } });
  fireEvent.change(screen.getByLabelText("Assessment Start Date"), { target: { value: "2027-04-01" } });
  fireEvent.change(screen.getByLabelText("Manager Verification Deadline"), { target: { value: "2027-04-10" } });
  await next(user);
  await user.click(screen.getByRole("checkbox", { name: "Select Iging DotTech" }));
  await next(user);
  await user.click(screen.getByRole("combobox", { name: "Default behavioral template" }));
  await user.click(await screen.findByRole("option", { name: "Quarterly review · v1" }));
  await next(user);
  fireEvent.change(screen.getByLabelText("Self-Assessment Deadline"), { target: { value: "2027-04-07" } });
  fireEvent.change(screen.getByLabelText("Managerial Assessment Deadline"), { target: { value: "2027-04-14" } });
  fireEvent.change(screen.getByLabelText("HR Assessment Deadline"), { target: { value: "2027-04-21" } });
  await user.click(screen.getByRole("combobox", { name: "HR evaluator" }));
  await user.click(await screen.findByRole("option", { name: "Lebron James" }));
  await next(user);
}

describe("CycleWizard, steps", () => {
  it("names the five steps that the wizard has", () => {
    renderWizard();

    const steps = within(screen.getByRole("navigation", { name: "Review cycle setup" })).getAllByRole("button");
    expect(steps.map((step) => step.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "1.Cycle Details",
      "2.Select Participants",
      "3.Evaluation Setup",
      "4.Assessment Workflow",
      "5.Review & Launch",
    ]);
  });

  it("is headed and described as in the sample frontend", () => {
    renderWizard();

    expect(screen.getByRole("heading", { level: 1, name: "Create Review Cycle" })).toBeTruthy();
    expect(
      screen.getByText("Configure position-based performance indicators, behavioral assessments, and the assessment sequence."),
    ).toBeTruthy();
  });

  it("opens on the details step, and goes through the five steps with Continue and Back", async () => {
    const user = userEvent.setup();
    renderWizard();

    expect(screen.getByLabelText("Cycle Name")).toBeTruthy();
    await next(user);
    expect(screen.getByRole("checkbox", { name: "Select Iging DotTech" })).toBeTruthy();
    await next(user);
    expect(screen.getByRole("combobox", { name: "Default behavioral template" })).toBeTruthy();
    await next(user);
    expect(screen.getByLabelText("Self-Assessment Deadline")).toBeTruthy();
    await next(user);
    expect(screen.getByRole("heading", { name: "Review & Launch" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Self-Assessment Deadline")).toBeTruthy();
  });

  it("shows the selected participants in the templates step", async () => {
    const user = userEvent.setup();
    renderWizard();
    await next(user);
    await user.click(screen.getByRole("checkbox", { name: "Select Iging DotTech" }));
    await next(user);

    expect(screen.getByText("Matched: Engineer goals · v1")).toBeTruthy();
  });
});

describe("CycleWizard, saving", () => {
  it("saves the draft with the body that the shared schema accepts, and says it is saving", async () => {
    const user = userEvent.setup();
    const onSave = renderWizard();
    await fillEverything(user);

    await user.click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "CY2027-Q1",
        assessmentStart: "2027-04-01T00:00:00+08:00",
        participants: [{ employeeId: IGING, behavioralTemplateId: BEH, peerIds: [] }],
      }),
    );
  });

  it("opens the step that owns the first problem, and shows the message there, when the draft breaks a rule", async () => {
    const user = userEvent.setup();
    const onSave = renderWizard();
    await next(user);
    await next(user);
    await next(user);
    await next(user);

    await user.click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Cycle Name").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("This field is required.")).toBeTruthy();
  });

  it("shows the reason of a refusal on the review step, and keeps what the user typed", async () => {
    const user = userEvent.setup();
    renderWizard(vi.fn(async () => ({ message: "Some selected employees are not active employees of your company." })));
    await fillEverything(user);

    await user.click(screen.getByRole("button", { name: "Save as Draft" }));

    expect((await screen.findByRole("alert")).textContent).toContain("not active employees of your company");
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect((screen.getByLabelText("Cycle Name") as HTMLInputElement).value).toBe("CY2027-Q1");
  });
});

describe("CycleWizard, leaving the page", () => {
  const BACK_LINK = /back to cycles/i;

  it("goes back without a prompt while nothing changed", async () => {
    renderWizard();

    await userEvent.setup().click(screen.getByRole("link", { name: BACK_LINK }));

    expect(screen.queryByText("Leave without saving?")).toBeNull();
  });

  it("asks before it leaves with unsaved changes, and goes back only on Leave", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.type(screen.getByLabelText("Cycle Name"), "CY");
    await user.click(screen.getByRole("link", { name: BACK_LINK }));

    expect(await screen.findByText("Leave without saving?")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(push).toHaveBeenCalledWith(BACK);
  });

  it("asks the browser to confirm a tab close only after an edit", async () => {
    const user = userEvent.setup();
    renderWizard();

    const untouched = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(untouched);
    expect(untouched.defaultPrevented).toBe(false);

    await user.type(screen.getByLabelText("Cycle Name"), "CY");
    const edited = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(edited);
    expect(edited.defaultPrevented).toBe(true);
  });

  it("starts over when Next keeps the page and hides it, so a return shows a blank wizard", async () => {
    const user = userEvent.setup();
    function Host() {
      const [visible, setVisible] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setVisible((value) => !value)}>
            toggle
          </button>
          <Activity mode={visible ? "visible" : "hidden"}>
            <CycleWizard options={OPTIONS} onSave={vi.fn(async () => ({ message: "" }))} backHref={BACK} />
          </Activity>
        </>
      );
    }
    render(<Host />);
    await user.type(screen.getByLabelText("Cycle Name"), "CY2027-Q1");

    await user.click(screen.getByRole("button", { name: "toggle" }));
    await user.click(screen.getByRole("button", { name: "toggle" }));

    expect((screen.getByLabelText("Cycle Name") as HTMLInputElement).value).toBe("");
    const stillDirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(stillDirty);
    expect(stillDirty.defaultPrevented).toBe(false);
  });
});

describe("CycleWizard, editing a saved draft", () => {
  const SAVED: CycleDraft = {
    ...newCycleDraft(),
    name: "CY2027-Q1",
    evaluationStart: "2027-01-01",
    evaluationEnd: "2027-03-31",
    assessmentStart: "2027-04-01",
    verificationDeadline: "2027-04-10",
    accomplishmentDeadline: "",
    description: "",
    usesGoals: true,
    usesBehavioral: true,
    participantIds: [IGING],
    behavioralDefaultId: BEH,
    stages: [
      { perspective: "self", deadline: "2027-04-07", evaluatorId: "" },
      { perspective: "manager", deadline: "2027-04-14", evaluatorId: "" },
      { perspective: "hr", deadline: "2027-04-21", evaluatorId: HR },
    ],
  };

  function renderEdit(
    issues: { step: "details" | "participants" | "kpi" | "behavioral" | "stages"; field: string; message: string }[] = [],
    onSave = vi.fn(async () => ({ message: "" })),
    removedParticipants = 0,
  ) {
    render(<CycleWizard options={OPTIONS} onSave={onSave} backHref={BACK} edit={{ draft: SAVED, issues, removedParticipants }} />);
    return onSave;
  }

  it("opens with the saved values, under an edit heading", () => {
    renderEdit();

    expect(screen.getByRole("heading", { level: 1, name: "Edit Review Cycle" })).toBeTruthy();
    expect((screen.getByLabelText("Cycle Name") as HTMLInputElement).value).toBe("CY2027-Q1");
    expect((screen.getByLabelText("Manager Verification Deadline") as HTMLInputElement).value).toBe("2027-04-10");
  });

  it("has nothing to discard until the user edits: no prompt on the back link, and no tab close prompt", async () => {
    renderEdit();

    const untouched = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(untouched);
    expect(untouched.defaultPrevented).toBe(false);
    await userEvent.setup().click(screen.getByRole("link", { name: /back to cycles/i }));
    expect(screen.queryByText("Leave without saving?")).toBeNull();
  });

  it("asks before it leaves once the user changed the saved draft", async () => {
    const user = userEvent.setup();
    renderEdit();
    await user.type(screen.getByLabelText("Cycle Name"), " v2");

    await user.click(screen.getByRole("link", { name: /back to cycles/i }));

    expect(await screen.findByText("Leave without saving?")).toBeTruthy();
  });

  it("lists on the review step what blocks the launch, each with the step that owns it", async () => {
    const user = userEvent.setup();
    renderEdit([
      { step: "kpi", field: "participants.x.kpi", message: "Iging DotTech: choose a published KPI goal template for the position Software Engineer." },
      { step: "stages", field: "stages.2.evaluatorId", message: "The evaluator of stage 3 must be an HR administrator of the company." },
    ]);
    await user.click(screen.getByRole("button", { name: "Review & Launch" }));

    const list = screen.getByRole("list", { name: "Before launch" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText(/choose a published KPI goal template/)).toBeTruthy();

    await user.click(within(list).getByRole("button", { name: "Fix in Evaluation Setup" }));
    expect(screen.getByRole("combobox", { name: "Default behavioral template" })).toBeTruthy();
  });

  it("says the draft has no problem when readiness found none", async () => {
    renderEdit([]);
    await userEvent.setup().click(screen.getByRole("button", { name: "Review & Launch" }));

    expect(screen.getByText("Nothing blocks the launch.")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Before launch" })).toBeNull();
  });

  it("says on the participants step and on the review step how many saved participants a save removes", async () => {
    const user = userEvent.setup();
    renderEdit([], undefined, 2);
    await user.click(screen.getByRole("button", { name: /select participants/i }));

    expect(screen.getByText("2 saved participants are no longer active in your company. A save removes them.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Review & Launch" }));
    expect(screen.getByText("2 saved participants are no longer active in your company. A save removes them.")).toBeTruthy();
  });

  it("says nothing about removed participants when none were removed", async () => {
    const user = userEvent.setup();
    renderEdit();
    await user.click(screen.getByRole("button", { name: "Review & Launch" }));
    expect(screen.queryByText(/no longer active in your company/)).toBeNull();
  });

  it("uses the singular for one removed participant", async () => {
    const user = userEvent.setup();
    renderEdit([], undefined, 1);
    await user.click(screen.getByRole("button", { name: /select participants/i }));

    expect(screen.getByText("1 saved participant is no longer active in your company. A save removes it.")).toBeTruthy();
  });

  it("says that the list of problems describes the saved draft, and tells HR to save to check again", async () => {
    const user = userEvent.setup();
    renderEdit([{ step: "kpi", field: "participants.x.kpi", message: "Choose a template." }]);
    await user.click(screen.getByRole("button", { name: "Review & Launch" }));

    expect(screen.getByText("As saved. Save the draft to check again.")).toBeTruthy();
  });

  it("saves the draft that the user sees, with the exact body", async () => {
    const user = userEvent.setup();
    const onSave = renderEdit();

    await user.click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "CY2027-Q1", participants: [{ employeeId: IGING, behavioralTemplateId: BEH, peerIds: [] }] }),
    );
  });

  it("returns an edited draft to the saved one when Next keeps the hidden page and the user comes back", async () => {
    const user = userEvent.setup();
    function Host() {
      const [visible, setVisible] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setVisible((value) => !value)}>
            toggle
          </button>
          <Activity mode={visible ? "visible" : "hidden"}>
            <CycleWizard options={OPTIONS} onSave={vi.fn(async () => ({ message: "" }))} backHref={BACK} edit={{ draft: SAVED, issues: [] }} />
          </Activity>
        </>
      );
    }
    render(<Host />);
    await user.type(screen.getByLabelText("Cycle Name"), " edited");

    await user.click(screen.getByRole("button", { name: "toggle" }));
    await user.click(screen.getByRole("button", { name: "toggle" }));

    expect((screen.getByLabelText("Cycle Name") as HTMLInputElement).value).toBe("CY2027-Q1");
  });
});

describe("CycleWizard, launching and cancelling a saved draft", () => {
  const SAVED: CycleDraft = {
    ...newCycleDraft(),
    name: "CY2027-Q1",
    evaluationStart: "2027-01-01",
    evaluationEnd: "2027-03-31",
    assessmentStart: "2027-04-01",
    verificationDeadline: "2027-04-10",
    accomplishmentDeadline: "",
    description: "",
    usesGoals: true,
    usesBehavioral: true,
    participantIds: [IGING],
    behavioralDefaultId: BEH,
    stages: [
      { perspective: "self", deadline: "2027-04-07", evaluatorId: "" },
      { perspective: "manager", deadline: "2027-04-14", evaluatorId: "" },
      { perspective: "hr", deadline: "2027-04-21", evaluatorId: HR },
    ],
  };
  const ISSUE = { step: "kpi" as const, field: "participants.x.kpi", message: "Choose a template." };

  function renderEdit(
    issues: (typeof ISSUE)[] = [],
    handlers: { onLaunch?: () => Promise<{ message: string }>; onCancel?: (input: { reason: string }) => Promise<{ message: string }> } = {},
  ) {
    const onLaunch = handlers.onLaunch ?? vi.fn(async () => ({ message: "" }));
    const onCancel = handlers.onCancel ?? vi.fn(async () => ({ message: "" }));
    render(<CycleWizard options={OPTIONS} onSave={vi.fn(async () => ({ message: "" }))} backHref={BACK} edit={{ draft: SAVED, issues, onLaunch, onCancel }} />);
    return { onLaunch, onCancel };
  }

  const toReview = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Review & Launch" }));

  it("offers Launch Cycle and Cancel Cycle on the review step of a saved draft, and not on a new cycle", async () => {
    const user = userEvent.setup();
    renderEdit();
    await toReview(user);
    expect(screen.getByRole("button", { name: "Launch Cycle" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel Cycle" })).toBeTruthy();
  });

  it("offers neither on the review step of a new cycle", async () => {
    const user = userEvent.setup();
    renderWizard();
    await next(user);
    await next(user);
    await next(user);
    await next(user);

    expect(screen.queryByRole("button", { name: "Launch Cycle" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel Cycle" })).toBeNull();
  });

  it("disables Launch Cycle while the saved draft has problems, and says why", async () => {
    const user = userEvent.setup();
    renderEdit([ISSUE]);
    await toReview(user);

    expect((screen.getByRole("button", { name: "Launch Cycle" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Fix the problems above before you launch.")).toBeTruthy();
  });

  it("disables Launch Cycle while there are unsaved changes, because a launch uses the saved draft", async () => {
    const user = userEvent.setup();
    renderEdit();
    await user.type(screen.getByLabelText("Cycle Name"), " v2");
    await toReview(user);

    expect((screen.getByRole("button", { name: "Launch Cycle" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Save your changes first. A launch uses the saved draft.")).toBeTruthy();
  });

  it("ties the reason that Launch Cycle is off to the button, so a screen reader announces it", async () => {
    const user = userEvent.setup();
    renderEdit([ISSUE]);
    await toReview(user);

    const button = screen.getByRole("button", { name: "Launch Cycle" });
    const reasonId = button.getAttribute("aria-describedby");
    expect(reasonId).toBeTruthy();
    expect(document.getElementById(reasonId as string)?.textContent).toBe("Fix the problems above before you launch.");
  });

  it("has nothing to announce when Launch Cycle is on", async () => {
    const user = userEvent.setup();
    renderEdit();
    await toReview(user);

    expect(screen.getByRole("button", { name: "Launch Cycle" }).getAttribute("aria-describedby")).toBeNull();
  });

  it("asks first: the dialog names the cycle and what cannot be undone, and launches nothing until the user confirms", async () => {
    const user = userEvent.setup();
    const { onLaunch } = renderEdit();
    await toReview(user);

    await user.click(screen.getByRole("button", { name: "Launch Cycle" }));

    const dialog = await screen.findByRole("alertdialog", { name: "Launch this cycle?" });
    expect(dialog.textContent).toContain("CY2027-Q1");
    expect(dialog.textContent).toContain("cannot be edited");
    expect(onLaunch).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Launch Cycle" }));
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it("launches nothing when the user cancels the dialog", async () => {
    const user = userEvent.setup();
    const { onLaunch } = renderEdit();
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Launch Cycle" }));

    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));

    expect(onLaunch).not.toHaveBeenCalled();
  });

  it("shows the reason when the launch is refused, and keeps the page", async () => {
    const user = userEvent.setup();
    renderEdit([], { onLaunch: vi.fn(async () => ({ message: "The cycle is not ready to launch. Maria Santos has no manager assigned yet." })) });
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Launch Cycle" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Launch Cycle" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Maria Santos has no manager assigned yet.");
    expect(screen.getByRole("heading", { name: "Review & Launch" })).toBeTruthy();
  });

  it("cancels only with a reason: an empty reason is refused in the dialog, and a written one is sent", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderEdit();
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Cancel Cycle" }));

    const dialog = await screen.findByRole("dialog", { name: "Cancel this cycle?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel Cycle" }));
    expect(within(dialog).getByText("Reason is required.")).toBeTruthy();
    expect(onCancel).not.toHaveBeenCalled();

    await user.type(within(dialog).getByRole("textbox", { name: /reason/i }), "Budget freeze");
    await user.click(within(dialog).getByRole("button", { name: "Cancel Cycle" }));

    expect(onCancel).toHaveBeenCalledWith({ reason: "Budget freeze" });
  });

  it("shows the reason when the cancellation is refused", async () => {
    const user = userEvent.setup();
    renderEdit([], { onCancel: vi.fn(async () => ({ message: "This cycle can no longer be cancelled. Reload the register." })) });
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Cancel Cycle" }));
    const dialog = await screen.findByRole("dialog", { name: "Cancel this cycle?" });
    await user.type(within(dialog).getByRole("textbox", { name: /reason/i }), "x");
    await user.click(within(dialog).getByRole("button", { name: "Cancel Cycle" }));

    expect((await screen.findByRole("alert")).textContent).toContain("can no longer be cancelled");
  });
});
