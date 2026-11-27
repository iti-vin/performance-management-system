import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ParticipantSelection } from "@/features/review-cycles/components/participant-selection";

const IGING = "284ddc9e-ebe4-468d-945f-fb18af72e622";
const MARIA = "00000000-0000-0000-0000-000000000022";
const RAMON = "00000000-0000-0000-0000-000000000023";
const ADMIN = "6293e9c7-6495-4555-85a9-1eccebc6d34c";

const EMPLOYEES = [
  { employeeId: IGING, name: "Iging DotTech", position: "Software Engineer", department: "Engineering", employeeCode: "EMP-001", managerId: null, managerName: null },
  { employeeId: MARIA, name: "Maria Santos", position: "Engineering Manager", department: "Engineering", employeeCode: "EMP-002", managerId: null, managerName: null },
  { employeeId: RAMON, name: "Ramon Reyes", position: "Human Resources Officer", department: "Human Resources", employeeCode: "EMP-003", managerId: null, managerName: null },
  { employeeId: ADMIN, name: "System Administrator", position: null, department: "Engineering", employeeCode: "EMP-004", managerId: null, managerName: null },
];

function renderStep(selectedIds: string[] = [], onSelectionChange = vi.fn()) {
  render(<ParticipantSelection employees={EMPLOYEES} selectedIds={selectedIds} onSelectionChange={onSelectionChange} />);
  return onSelectionChange;
}

describe("ParticipantSelection", () => {
  it("lists the employees of the options with their department and position, and says when one has no position", () => {
    renderStep();

    expect(screen.getByText("Iging DotTech")).toBeTruthy();
    const row = within(screen.getByText("System Administrator").closest("tr")!);
    expect(row.getByText("No position")).toBeTruthy();
  });

  it("is headed and described as in the sample frontend", () => {
    renderStep();

    expect(screen.getByRole("heading", { name: "Select Employees" })).toBeTruthy();
    expect(screen.getByText("Select existing HRDotNet employees. Selection persists across filters and pages.")).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search Employees" })).toHaveAttribute("placeholder", "Search employees...");
  });

  it("shows the employee ID and the manager in the order of the sample, and Not set without a manager", () => {
    render(
      <ParticipantSelection
        employees={[{ ...EMPLOYEES[0]!, managerId: null, managerName: "Maria Santos" }, EMPLOYEES[3]!]}
        selectedIds={[]}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent?.trim())).toEqual([
      "Select",
      "Employee",
      "Employee ID",
      "Department",
      "Position",
      "Manager",
    ]);
    const [first, second] = screen.getAllByRole("row").slice(1);
    expect(within(first!).getByText(EMPLOYEES[0]!.employeeCode)).toBeTruthy();
    expect(within(first!).getByText("Maria Santos")).toBeTruthy();
    expect(within(second!).getByText("Not set")).toBeTruthy();
  });

  it("offers 10, 20, and 50 rows a page, as the sample does", async () => {
    renderStep();

    await userEvent.setup().click(screen.getByRole("combobox", { name: /per page/i }));

    expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(["10", "20", "50"]);
  });

  it("selects an employee by checkbox, and reports the ids kept so far", async () => {
    const onSelectionChange = renderStep([IGING]);

    await userEvent.setup().click(screen.getByRole("checkbox", { name: "Select Maria Santos" }));

    expect(onSelectionChange).toHaveBeenCalledWith([IGING, MARIA]);
  });

  it("unselects an employee", async () => {
    const onSelectionChange = renderStep([IGING, MARIA]);

    await userEvent.setup().click(screen.getByRole("checkbox", { name: "Select Iging DotTech" }));

    expect(onSelectionChange).toHaveBeenCalledWith([MARIA]);
  });

  it("says how many are selected", () => {
    renderStep([IGING, MARIA]);

    expect(screen.getByText("2 selected")).toBeTruthy();
  });

  it("filters by the search text, and keeps the selection while it filters", async () => {
    const user = userEvent.setup();
    renderStep([IGING]);

    await user.type(screen.getByRole("searchbox", { name: "Search Employees" }), "ramon");

    expect(screen.queryByText("Iging DotTech")).toBeNull();
    expect(screen.getByText("Ramon Reyes")).toBeTruthy();
    expect(screen.getByText("1 selected")).toBeTruthy();
  });

  it("says no employee matches when the filters find none, and says none are available for an empty list", async () => {
    const user = userEvent.setup();
    renderStep();
    await user.type(screen.getByRole("searchbox", { name: "Search Employees" }), "zzz");
    expect(screen.getByText("No employees match your filters.")).toBeTruthy();
  });

  it("says no employees are available when the company has none", () => {
    render(<ParticipantSelection employees={[]} selectedIds={[]} onSelectionChange={vi.fn()} />);

    expect(screen.getByText("No eligible employees available.")).toBeTruthy();
  });
});
