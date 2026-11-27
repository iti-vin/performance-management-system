import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoalsDescription } from "@/app/(workspace)/goals/goals-description";
import ReviewsPage from "@/app/(workspace)/reviews/page";
import BehavioralTemplatesPage from "@/app/(workspace)/reviews/templates/behavioral-assessment-template/page";
import KpiTemplatesPage from "@/app/(workspace)/reviews/templates/kpi-goal-template/page";
import { UnsavedChangesDialog } from "@/components/molecules/unsaved-changes-dialog";
import { WORKSPACE_NAVIGATION } from "@/constants/workspace-navigation";
import { AccomplishmentsTable } from "@/features/position-goals/components/accomplishments-table";
import { CycleSetupStepper } from "@/features/review-cycles/components/cycle-setup-stepper";
import { CycleReviewSummary } from "@/features/review-cycles/components/cycle-review-summary";
import { CycleTemplatesStep } from "@/features/review-cycles/components/cycle-templates-step";
import { newCycleDraft } from "@/features/review-cycles/services/cycle-draft";
import { accomplishmentRow } from "../utils/accomplishment";
import { ReviewCyclesTable } from "@/features/review-cycles/components/review-cycles-table";
import { ReviewSummary } from "@/features/review-cycles/components/review-summary";
import { ReviewsTable } from "@/features/review-cycles/components/reviews-table";
import { BehavioralTemplateList } from "@/features/review-templates/components/behavioral-template-list";
import { GoalTemplateList } from "@/features/review-templates/components/goal-template-list";

// The words and the column order of the sample frontend (docs/reviews/2026-11-26-sample-frontend-alignment.md).

const { getCurrentUser, pending } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  pending: () => new Promise(() => {}),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), redirect: vi.fn() }));
vi.mock("@/features/auth/services/current-user", () => ({ getCurrentUser }));
vi.mock("@/features/review-cycles/components/reviews-content", () => ({ ReviewsContent: () => null }));
vi.mock("@/features/review-cycles/components/review-cycle-saved-notice", () => ({ ReviewCycleSavedNotice: () => null }));
vi.mock("@/features/review-cycles/services/review-cycle-reader", () => ({ getReviewCycles: pending }));
vi.mock("@/features/review-templates/services/goal-template-reader", () => ({ getGoalTemplates: pending }));
vi.mock("@/features/review-templates/services/behavioral-template-reader", () => ({ getBehavioralTemplates: pending }));
vi.mock("@/features/review-templates/components/goal-template-create-action", () => ({ GoalTemplateCreateAction: () => null }));
vi.mock("@/features/review-templates/components/behavioral-template-create-action", () => ({
  BehavioralTemplateCreateAction: () => null,
}));

const headings = () => screen.getAllByRole("columnheader").map((cell) => cell.textContent?.trim());

beforeEach(() => getCurrentUser.mockReset());

describe("the menu", () => {
  it("names the two template pages in the plural", () => {
    const labels = JSON.stringify(WORKSPACE_NAVIGATION.hr);

    expect(labels).toContain('"label":"KPI Goal Templates"');
    expect(labels).toContain('"label":"Behavioral Assessment Templates"');
  });
});

describe("the dialog for unsaved changes", () => {
  it("says what is lost and how to keep it, and names both choices", () => {
    render(<UnsavedChangesDialog open onStay={vi.fn()} onLeave={vi.fn()} />);

    const dialog = within(screen.getByRole("alertdialog"));
    expect(
      dialog.getByText("Your unsaved changes will be discarded. Save your draft before leaving if you want to keep these changes."),
    ).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Keep editing" })).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Discard changes" })).toBeTruthy();
  });
});

describe("page headings and descriptions", () => {
  it.each([
    ["Reviews", "View, complete, and manage employee performance evaluations.", () => <ReviewsPage searchParams={new Promise(() => {})} />],
    ["KPI Goal Templates", "Define measurable, role-specific performance indicators.", () => <KpiTemplatesPage searchParams={new Promise(() => {})} />],
    [
      "Behavioral Assessment Templates",
      "Create and manage reusable forms for employee performance evaluations.",
      () => <BehavioralTemplatesPage searchParams={new Promise(() => {})} />,
    ],
  ])("%s", (title, description, page) => {
    render(page());

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
    expect(screen.getByText(description)).toBeTruthy();
  });

  it.each([
    ["USER", "View your performance goals and update your accomplishments."],
    ["MANAGER", "View your team's performance goals and verify submitted accomplishments."],
    ["ADMIN", "View employee performance goals and accomplishments."],
  ])("describes Goals for %s", async (role, description) => {
    getCurrentUser.mockResolvedValue({ role });
    render(<>{await GoalsDescription()}</>);

    expect(screen.getByText(description)).toBeTruthy();
  });
});

describe("table columns", () => {
  // The name and the position sit together, as in the sample. The touch target reaches past the text.
  it("keeps the name of an employee close to the position, with a full touch target", () => {
    render(
      <AccomplishmentsTable
        caption="Goals"
        rows={[accomplishmentRow({ isOwn: false })]}
        emptyMessage="None"
        namesEmployees
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveClass("after:h-pms-touch");
    expect(link).not.toHaveClass("min-h-pms-touch");
  });

  it("orders All Reviews", () => {
    render(<ReviewsTable rows={[]} emptyMessage="None" />);

    expect(headings()).toEqual(["Employee", "Review Cycle", "Review Type", "Reviewer", "Due Date", "Status"]);
  });

  it("shows headings in capitals by style, so they are still read as words", () => {
    render(<ReviewsTable rows={[]} emptyMessage="None" />);

    expect(screen.getAllByRole("rowgroup")[0]).toHaveClass("uppercase");
  });

  it("orders the cycle register", () => {
    render(<ReviewCyclesTable rows={[]} />);

    expect(headings()).toEqual(["Cycle Name", "Review Type", "Review Period", "Participants", "Progress", "Deadline", "Status"]);
  });

  it.each([
    [true, ["Employee", "Position", "Review Cycle", "KPI Goal Template", "Accomplishment Status"]],
    [false, ["Review Cycle", "KPI Goal Template", "Accomplishment Status"]],
  ])("orders the goals list (employee names: %s)", (namesEmployees, expected) => {
    render(<AccomplishmentsTable caption="Goals" rows={[]} emptyMessage="None" namesEmployees={namesEmployees} />);

    expect(headings()).toEqual(expected);
  });

  it("orders the KPI goal templates", () => {
    render(<GoalTemplateList templates={[]} isLoading />);

    expect(headings()).toEqual(["Template Name", "Applicable Position / Role", "Indicators", "Status", "Last Updated"]);
  });

  it("orders the behavioral templates, with the description of each", () => {
    render(
      <BehavioralTemplateList
        templates={[
          {
            templateId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
            company: "Mayon Consolidated Inc.",
            name: "Quarterly Performance Review",
            description: "Reflect on observable behaviors.",
            category: "general_performance",
            reviewType: "self",
            status: "published",
            currentVersion: 1,
            publishedBy: null,
            publishedAt: null,
            archivedAt: null,
            createdAt: "2026-11-01T00:00:00.000Z",
            updatedAt: "2026-11-05T00:00:00.000Z",
            questionCount: 6,
          },
        ]}
      />,
    );

    expect(headings()).toEqual(["Template Name", "Description", "Review Type", "Questions", "Last Updated", "Status"]);
    expect(screen.getByRole("cell", { name: "6" })).toBeTruthy();
    expect(screen.getByText("Reflect on observable behaviors.")).toBeTruthy();
  });
});

describe("one review", () => {
  it("orders the summary, and shows Overdue as the status", () => {
    render(
      <ReviewSummary
        review={{
          assignmentId: "00000000-0000-0000-0000-000000000301",
          cycleId: "00000000-0000-0000-0000-000000000141",
          cycleName: "ZZ demo",
          cycleState: "active",
          subjectName: "Iging UserDotTech",
          subjectPosition: "Software Engineer",
          subjectDepartment: "IT",
          isAssignedToCaller: false,
          evaluatorName: "Iging ManagerDotTech",
          perspective: "manager",
          state: "not_started",
          deadline: "2026-12-11T15:59:59.000Z",
          isOverdue: true,
          canEdit: true,
          isRestricted: false,
          waitingFor: null,
          reopenReason: null,
          history: [],
          stages: [],
          goals: null,
          template: null,
          sections: [],
          response: null,
        }}
      />,
    );

    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual([
      "Employee",
      "Department",
      "Review Cycle",
      "Review Type",
      "Reviewer",
      "Due Date",
      "Status",
    ]);
    expect(screen.getByText("Overdue")).toBeTruthy();
    expect(screen.queryByText("Not Started")).toBeNull();
  });
});

describe("the cycle wizard", () => {
  it("names its five steps", () => {
    render(<CycleSetupStepper currentStep={1} furthestStep={5} onStepChange={vi.fn()} />);

    const text = screen.getByRole("list").textContent ?? "";
    const names = ["Cycle Details", "Select Participants", "Evaluation Setup", "Assessment Workflow", "Review & Launch"];
    expect(names.map((name) => text.indexOf(name)).every((at, index, all) => at >= 0 && (index === 0 || at > all[index - 1]!))).toBe(true);
  });

  it("puts Goals Performance before Behavioral Performance in the evaluation setup", () => {
    render(
      <CycleTemplatesStep
        participants={[{ employeeId: "00000000-0000-0000-0000-000000000027", name: "Iging", position: "Software Engineer", department: "IT", employeeCode: "EMP-001", managerId: null, managerName: null }]}
        kpiTemplates={[]}
        behavioralTemplates={[]}
        choices={{ kpiChoices: {}, behavioralDefaultId: "", behavioralOverrides: {} }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Goals Performance",
      "Behavioral Performance",
    ]);
    expect(headings()).toContain("Applicable KPI Goal Template");
  });

  it("reviews the draft under the words of the fields", () => {
    render(<CycleReviewSummary draft={newCycleDraft()} />);

    expect(screen.getByRole("heading", { name: "Review & Launch" })).toBeTruthy();
    expect(screen.getByText("Saving keeps the cycle as a draft. Open the saved draft to launch it from this step.")).toBeTruthy();
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual([
      "Cycle Name",
      "Review Type",
      "Evaluation Period",
      "Assessment Start Date",
      "Employee Accomplishment Deadline",
      "Manager Verification Deadline",
      "Description",
      "Components",
      "Participants",
    ]);
  });
});
