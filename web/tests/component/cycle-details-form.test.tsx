import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CycleDetailsForm } from "@/features/review-cycles/components/cycle-details-form";

const VALUES = {
  name: "CY2027-Q1",
  reviewType: "standard" as const,
  evaluationStart: "2027-01-01",
  evaluationEnd: "2027-03-31",
  assessmentStart: "2027-04-01",
  verificationDeadline: "2027-04-30",
  accomplishmentDeadline: "2027-04-15",
  description: "Yearly review",
  usesGoals: true,
  usesBehavioral: true,
  employeeVisible: true,
  managerVisible: true,
  earlierAnswersVisible: true,
};

describe("CycleDetailsForm", () => {
  it("shows the values, with labelled fields for the name, the period, the assessment start, and the verification deadline", () => {
    render(<CycleDetailsForm values={VALUES} onChange={vi.fn()} />);

    expect((screen.getByLabelText("Cycle Name") as HTMLInputElement).value).toBe("CY2027-Q1");
    expect((screen.getByLabelText("Evaluation Period Start") as HTMLInputElement).value).toBe("2027-01-01");
    expect((screen.getByLabelText("Evaluation Period End") as HTMLInputElement).value).toBe("2027-03-31");
    expect((screen.getByLabelText("Assessment Start Date") as HTMLInputElement).value).toBe("2027-04-01");
    expect((screen.getByLabelText("Manager Verification Deadline") as HTMLInputElement).value).toBe("2027-04-30");
  });

  it("takes a description and an accomplishment deadline, both optional", async () => {
    const onChange = vi.fn();
    render(<CycleDetailsForm values={{ ...VALUES, description: "" }} onChange={onChange} />);
    const description = screen.getByLabelText("Description (optional)") as HTMLTextAreaElement;

    expect((screen.getByLabelText("Employee Accomplishment Deadline (optional)") as HTMLInputElement).value).toBe("2027-04-15");
    expect(description.maxLength).toBe(2000);
    await userEvent.setup().type(description, "Q");

    expect(onChange).toHaveBeenCalledWith({ description: "Q" });
  });

  it("lets HR choose the components, and says the weight of each", async () => {
    const onChange = vi.fn();
    render(<CycleDetailsForm values={VALUES} onChange={onChange} />);

    expect(screen.getByRole("checkbox", { name: "Goals Performance" })).toBeChecked();
    expect(screen.getByText("Goals Performance 50% and Behavioral Performance 50%.")).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("checkbox", { name: "Behavioral Performance" }));

    expect(onChange).toHaveBeenCalledWith({ usesBehavioral: false });
  });

  it.each([
    [{ usesBehavioral: false }, "Goals Performance 100%."],
    [{ usesGoals: false }, "Behavioral Performance 100%."],
    [{ usesGoals: false, usesBehavioral: false }, "Choose at least one component."],
  ])("says what %o means", (change, words) => {
    render(<CycleDetailsForm values={{ ...VALUES, ...change }} onChange={vi.fn()} />);

    expect(screen.getByText(words)).toBeTruthy();
  });

  it("reports the field that changed, with the new value", async () => {
    const onChange = vi.fn();
    render(<CycleDetailsForm values={{ ...VALUES, name: "" }} onChange={onChange} />);

    await userEvent.setup().type(screen.getByLabelText("Cycle Name"), "Q");

    expect(onChange).toHaveBeenCalledWith({ name: "Q" });
  });

  it("names the review type in words, and offers the four types of the PRD", async () => {
    const user = userEvent.setup();
    render(<CycleDetailsForm values={VALUES} onChange={vi.fn()} />);

    expect(screen.getByText("Standard Performance Review")).toBeTruthy();
    await user.click(screen.getByRole("combobox", { name: /review type/i }));

    for (const label of ["360° Feedback", "Probationary Review", "Project-Based Review"]) {
      expect(await screen.findByRole("option", { name: label })).toBeTruthy();
    }
  });

  it("sends the code of the type that the user picks, not its words", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CycleDetailsForm values={VALUES} onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: /review type/i }));
    await user.click(await screen.findByRole("option", { name: "Probationary Review" }));

    expect(onChange).toHaveBeenCalledWith({ reviewType: "probationary" });
  });

  it("shows the message of a field under it, and marks the field invalid", () => {
    render(<CycleDetailsForm values={VALUES} onChange={vi.fn()} errors={{ evaluationEnd: "The period end cannot be before the period start." }} />);

    const field = screen.getByLabelText("Evaluation Period End");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("The period end cannot be before the period start.")).toBeTruthy();
  });
});
