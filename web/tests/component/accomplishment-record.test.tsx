import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccomplishmentDetailDto } from "@pms/shared-types";

import { AccomplishmentRecord } from "@/features/position-goals/components/accomplishment-record";
import { accomplishmentDetail, accomplishmentKpi, DEFECTS, guid, SPRINT } from "../utils/accomplishment";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const onSave = vi.fn();
const onSubmit = vi.fn();
const onDecide = vi.fn();
const TAKEN = { message: null, fieldErrors: {} };
const actuals = [
  { indicatorId: SPRINT, actualValue: 85, remarks: null },
  { indicatorId: DEFECTS, actualValue: 0, remarks: null },
];
const submitted = (change: Partial<AccomplishmentDetailDto> = {}) =>
  accomplishmentDetail({
    status: "submitted",
    canEdit: false,
    canSubmit: false,
    actuals,
    remarks: "Two releases.",
    submittedAt: "2026-11-26T02:00:00.000Z",
    notice: "Submitted. It waits for your manager.",
    ...change,
  });
const toDecide = () => submitted({ canDecide: true, notice: null });

function renderRecord(detail = accomplishmentDetail()) {
  const props = { onSave, onSubmit, onDecide };
  const view = render(<AccomplishmentRecord detail={detail} {...props} />);
  return {
    user: userEvent.setup(),
    show: (next: AccomplishmentDetailDto) => view.rerender(<AccomplishmentRecord detail={next} {...props} />),
  };
}
const button = (name: string) => screen.getByRole("button", { name });
const indicatorGroup = (name: string) => within(screen.getByRole("group", { name }));
const value = (name: string) => screen.getByRole("textbox", { name: `Actual result for ${name}` });
const indicators = () => within(screen.getByRole("table", { name: "Performance indicators" }));
const cellsOf = (name: string) =>
  within(indicators().getByRole("row", { name: new RegExp(name) }))
    .getAllByRole("cell")
    .map((cell) => cell.textContent);
const dialog = async () => within(await screen.findByRole("alertdialog"));

beforeEach(() => {
  for (const mock of [push, onSave, onSubmit, onDecide]) mock.mockReset();
  for (const mock of [onSave, onSubmit, onDecide]) mock.mockResolvedValue(TAKEN);
});

describe("the record", () => {
  it("says whose report it is, for which cycle and period, until when, and where it stands", () => {
    renderRecord();

    const summary = within(screen.getByRole("region", { name: "Report summary" }));
    for (const words of ["Iging UserDotTech", "ZZ demo", "Review Cycle", "Evaluation Period", "Oct 1, 2026 to Nov 25, 2026", "Verification Deadline", "Dec 31, 2026", "Draft"]) {
      expect(summary.getByText(words)).toBeTruthy();
    }
  });

  it("names the position of the employee and the frozen version of the KPI template", () => {
    renderRecord();

    const summary = within(screen.getByRole("region", { name: "Report summary" }));
    expect(summary.getByRole("heading", { name: "Iging UserDotTech" })).toBeTruthy();
    expect(summary.getByText("Software Engineer · Engineer goals · v2")).toBeTruthy();
  });

  it("leaves a position that the cycle did not freeze out of the line under the name", () => {
    renderRecord(accomplishmentDetail({ position: null }));

    expect(within(screen.getByRole("region", { name: "Report summary" })).getByText("Engineer goals · v2")).toBeTruthy();
  });

  it("lists the indicators in a table with the columns of the sample", () => {
    renderRecord(submitted());

    expect(indicators().getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Performance Indicator",
      "Measurement Unit",
      "Target",
      "Actual Result",
      "Status",
      "Remarks",
    ]);
    expect(cellsOf("Sprint completion")).toEqual([
      "Sprint completion",
      "Percentage",
      "90",
      "85",
      "Pending verificationBelow target · Unverified",
      "None",
    ]);
    expect(cellsOf("Escaped defects")).toEqual([
      "Escaped defects",
      "Count",
      "2",
      "0",
      "Pending verificationTarget met · Unverified",
      "None",
    ]);
  });

  it("says where each value of a verified report stands, with no word about waiting", () => {
    renderRecord(submitted({ status: "verified", notice: "Verified. It cannot be changed." }));

    expect(cellsOf("Sprint completion")[4]).toBe("VerifiedBelow target");
    expect(cellsOf("Escaped defects")[4]).toBe("VerifiedTarget met");
  });

  it.each([
    ["draft", "Draft"],
    ["returned", "Returned"],
  ] as const)("compares no value of a %s report with its target", (status, words) => {
    renderRecord(accomplishmentDetail({ status, actuals, canEdit: false, canSubmit: false }));

    expect(cellsOf("Sprint completion")[4]).toBe(words);
    expect(screen.queryByText(/target met|below target/i)).toBeNull();
  });

  it("keeps the frozen criteria under the table, closed until asked for", () => {
    renderRecord();

    const criteria = screen.getByText("Scoring criteria").closest("details");
    expect(criteria).not.toHaveAttribute("open");
    expect(within(criteria!).getByRole("group", { name: "Sprint completion" })).toBeTruthy();
  });

  it("shows the frozen criteria of each indicator", () => {
    renderRecord();

    const sprint = indicatorGroup("Sprint completion");
    for (const words of ["90 Percentage", "Higher is better", "50%", "5", "3.5"]) expect(sprint.getByText(words)).toBeTruthy();
    expect(sprint.queryByRole("table")).toBeNull();
    const defects = indicatorGroup("Escaped defects");
    expect(defects.getByText("Lower is better")).toBeTruthy();
    expect(defects.getByText("Defect scale")).toBeTruthy();
    expect(defects.getByText("Used for scoring")).toBeTruthy();
    expect(defects.getAllByRole("row").map((row) => row.textContent)).toEqual([
      "Minimum actual (inclusive)Rating labelScore",
      "0Great5",
      "3Poor2",
    ]);
  });

  it("shows a custom reference table by its columns and rows", () => {
    const kpi = accomplishmentKpi();
    renderRecord(
      accomplishmentDetail({
        kpi: {
          ...kpi,
          indicators: [{ ...kpi.indicators[0]!, matrixKind: "table", matrixTitle: null }],
          scales: [],
          matrixColumns: [
            { colId: guid(81), indicatorId: SPRINT, position: 1, colLabel: "Range" },
            { colId: guid(82), indicatorId: SPRINT, position: 2, colLabel: "Meaning" },
          ],
          matrixRows: [{ rowId: guid(71), indicatorId: SPRINT, position: 1, rowLabel: null }],
          matrixCells: [
            { rowId: guid(71), colId: guid(82), value: "On track" },
            { rowId: guid(71), colId: guid(81), value: "90 and up" },
          ],
        },
      }),
    );

    const sprint = indicatorGroup("Sprint completion");
    expect(sprint.getByText("Reference only")).toBeTruthy();
    expect(sprint.getAllByRole("row").map((row) => row.textContent)).toEqual(["RangeMeaning", "90 and upOn track"]);
  });
});

describe("a report that the employee may change", () => {
  const savedDraft = () => accomplishmentDetail({ actuals: [{ indicatorId: SPRINT, actualValue: 85, remarks: null }], remarks: "So far." });

  it("holds the saved values and remarks, and offers no decision and no correction reason", () => {
    renderRecord(savedDraft());

    expect(value("Sprint completion")).toHaveValue("85");
    expect(value("Escaped defects")).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Remarks (optional)" })).toHaveValue("So far.");
    expect(screen.getByRole("textbox", { name: "Remarks (optional)" })).toHaveAttribute("maxlength", "2000");
    expect(screen.queryByRole("textbox", { name: /What you corrected/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Verify Accomplishments" })).toBeNull();
  });

  it("saves the whole report, blank values as none, and says so", async () => {
    const { user } = renderRecord(savedDraft());

    await user.clear(value("Sprint completion"));
    await user.type(value("Sprint completion"), "88.5");
    await user.click(button("Save as Draft"));

    expect(onSave).toHaveBeenCalledWith({
      actuals: [
        { indicatorId: SPRINT, actualValue: 88.5, remarks: "" },
        { indicatorId: DEFECTS, actualValue: null, remarks: "" },
      ],
      remarks: "So far.",
      correctionReason: "",
    });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Draft saved."));
  });

  it("marks a value that is not a number, and sends nothing", async () => {
    const { user } = renderRecord();

    await user.type(value("Escaped defects"), "-1");
    await user.click(button("Save as Draft"));

    expect(value("Escaped defects")).toHaveAttribute("aria-invalid", "true");
    expect(value("Escaped defects")).toHaveAccessibleDescription("Enter a number of 0 or more.");
    expect(screen.getByText("Check your values and try again.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  // On a long report the problem can be far from the button: the focus takes the employee there.
  it("moves the focus to the first field with a problem", async () => {
    onSave.mockResolvedValue({ message: "Too large.", fieldErrors: { [DEFECTS]: "Too large." } });
    const { user } = renderRecord();

    await user.type(value("Escaped defects"), "x");
    await user.click(button("Submit Accomplishments"));
    expect(value("Escaped defects")).toHaveFocus();

    await user.clear(value("Escaped defects"));
    await user.click(button("Submit Accomplishments"));
    expect(value("Sprint completion")).toHaveFocus();

    await user.type(value("Escaped defects"), "1");
    await user.click(button("Save as Draft"));
    await waitFor(() => expect(value("Escaped defects")).toHaveFocus());
  });

  it("drops the problem of a field once it is edited, and keeps the others and the focus", async () => {
    const { user } = renderRecord();
    await user.click(button("Submit Accomplishments"));
    expect(value("Escaped defects")).toHaveAttribute("aria-invalid", "true");

    await user.type(value("Sprint completion"), "91");

    expect(value("Sprint completion")).not.toHaveAttribute("aria-invalid");
    expect(value("Sprint completion")).toHaveValue("91");
    expect(value("Sprint completion")).toHaveFocus();
    expect(value("Escaped defects")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Complete the report before you submit.")).toBeTruthy();
  });

  it("drops the words about a missing value once no field has a problem", async () => {
    const { user } = renderRecord();
    await user.click(button("Submit Accomplishments"));

    await user.type(value("Sprint completion"), "91");
    await user.type(value("Escaped defects"), "1");

    expect(screen.queryByText("Complete the report before you submit.")).toBeNull();
    expect(screen.queryByText("Report a value.")).toBeNull();
  });

  it("drops the problem of the return reason once it is typed", async () => {
    const { user } = renderRecord(toDecide());
    await user.click(button("Return for Correction"));
    const reason = screen.getByRole("textbox", { name: /Reason for correction/ });
    expect(reason).toHaveAttribute("aria-invalid", "true");

    await user.type(reason, "Recount.");

    expect(reason).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Say why you return it.")).toBeNull();
  });

  // Safari and Firefox on macOS leave the focus in the field when a button is clicked.
  it("moves the focus to a problem even when the click leaves the focus in a field", async () => {
    const { user } = renderRecord();
    await user.type(value("Escaped defects"), "1");

    fireEvent.click(button("Submit Accomplishments"));

    await waitFor(() => expect(value("Sprint completion")).toHaveFocus());
  });

  it("asks for every value before a submission", async () => {
    const { user } = renderRecord(savedDraft());

    await user.click(button("Submit Accomplishments"));

    expect(value("Escaped defects")).toHaveAccessibleDescription("Report a value.");
    expect(screen.getByText("Complete the report before you submit.")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits after a confirmation that names the cycle, once, and moves the focus to the result", async () => {
    const { user, show } = renderRecord(savedDraft());
    await user.type(value("Escaped defects"), "0");

    await user.click(button("Submit Accomplishments"));
    const asked = await dialog();
    expect(asked.getByText(/ZZ demo/)).toBeTruthy();
    await user.click(asked.getByRole("button", { name: "Cancel" }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(button("Submit Accomplishments"));
    await user.click((await dialog()).getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Report submitted."));
    show(submitted());
    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
  });

  it("lets a draft be saved while the period runs, and says why it cannot be submitted", async () => {
    const { user } = renderRecord(accomplishmentDetail({ canSubmit: false, notice: "You can submit after the evaluation period ends." }));

    expect(screen.getByText("You can submit after the evaluation period ends.")).toBeTruthy();
    expect(button("Submit Accomplishments")).toBeDisabled();
    await user.click(button("Save as Draft"));
    expect(onSave).toHaveBeenCalled();
  });

  it("shows why a report came back, and asks what was corrected before it goes again", async () => {
    const { user } = renderRecord(
      accomplishmentDetail({ status: "returned", returnReason: "Recount the defects.", actuals }),
    );
    const correction = () => screen.getByRole("textbox", { name: /What you corrected/ });

    expect(screen.getByText("Recount the defects.")).toBeTruthy();
    expect(correction()).toHaveAttribute("maxlength", "2000");
    await user.click(button("Submit Accomplishments"));
    expect(correction()).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("alertdialog")).toBeNull();

    await user.type(correction(), "Recounted.");
    await user.click(button("Submit Accomplishments"));
    await user.click((await dialog()).getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ correctionReason: "Recounted." }));
    // The next return must not find the old correction in the field.
    await waitFor(() => expect(correction()).toHaveValue(""));
  });

  it("shows the problems of the API on their fields, and keeps what was typed", async () => {
    onSave.mockResolvedValue({ message: "The report is not complete.", fieldErrors: { [DEFECTS]: "Too large.", remarks: "Too long." } });
    const { user } = renderRecord(savedDraft());
    await user.type(value("Escaped defects"), "7");

    await user.click(button("Save as Draft"));

    await waitFor(() => expect(value("Escaped defects")).toHaveAccessibleDescription("Too large."));
    expect(screen.getByText("Too long.")).toBeTruthy();
    expect(screen.getByText("The report is not complete.")).toBeTruthy();
    expect(value("Escaped defects")).toHaveValue("7");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("says that something went wrong when the action fails", async () => {
    onSave.mockRejectedValue(new Error("network"));
    const { user } = renderRecord();

    await user.click(button("Save as Draft"));

    await waitFor(() => expect(screen.getByText("Something went wrong. Try again.")).toBeTruthy());
  });

  it("keeps its buttons focusable and unavailable while a request runs", async () => {
    onSave.mockReturnValue(new Promise(() => {}));
    const { user } = renderRecord(savedDraft());

    await user.click(button("Save as Draft"));

    await waitFor(() => expect(button("Save as Draft")).toHaveAttribute("aria-disabled", "true"));
    expect(button("Submit Accomplishments")).toHaveAttribute("aria-disabled", "true");
    expect(button("Save as Draft")).toHaveFocus();
  });
});

describe("a report that cannot be changed", () => {
  it("shows the values as words, the remarks, and why, with no control", () => {
    renderRecord(submitted());

    expect(cellsOf("Sprint completion")[3]).toBe("85");
    expect(cellsOf("Escaped defects")[3]).toBe("0");
    expect(screen.getByText("Two releases.")).toBeTruthy();
    expect(screen.getByText("Submitted. It waits for your manager.")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save as Draft" })).toBeNull();
  });

  it("shows no actual result when the API holds the values back", () => {
    renderRecord(accomplishmentDetail({ canEdit: false, canSubmit: false, notice: "The employee has not submitted it yet." }));

    expect(screen.getByText("The employee has not submitted it yet.")).toBeTruthy();
    expect(cellsOf("Sprint completion")[3]).toBe("Not shown");
    expect(screen.queryByText("Not reported")).toBeNull();
    // The column heading only: no remarks of the report are shown.
    expect(screen.getAllByText("Remarks")).toHaveLength(1);
  });

  it("shows each submission with its time, person, values, and correction", () => {
    const version = (n: number, correctionReason: string | null, defects: number) => ({
      version: n,
      actedAt: "2026-11-26T02:00:00.000Z",
      actorName: "Iging UserDotTech",
      remarks: n === 1 ? "First try." : null,
      correctionReason,
      actuals: [{ indicatorId: DEFECTS, actualValue: defects, remarks: null }],
    });
    renderRecord(submitted({ versions: [version(1, null, 4), version(2, "Recounted.", 1)] }));

    const history = within(screen.getByRole("region", { name: "Submission history" }));
    const [first, second] = history.getAllByRole("listitem").filter((item) => item.textContent?.startsWith("Version"));
    expect(first).toHaveTextContent("Version 1");
    expect(first).toHaveTextContent("Nov 26, 2026 by Iging UserDotTech");
    expect(first).toHaveTextContent("Escaped defects: 4 Count");
    expect(first).toHaveTextContent("First try.");
    expect(second).toHaveTextContent("Escaped defects: 1 Count");
    expect(second).toHaveTextContent("Correction: Recounted.");
  });

  it("names a value that a report does not hold", () => {
    renderRecord(submitted({ actuals: [{ indicatorId: SPRINT, actualValue: null, remarks: null }] }));

    expect(cellsOf("Sprint completion")[3]).toBe("Not reported");
  });

  it("shows no history before a first submission", () => {
    renderRecord();

    expect(screen.queryByRole("region", { name: "Submission history" })).toBeNull();
  });
});

describe("a report that waits for a decision", () => {
  it("verifies after a confirmation that says what verification means", async () => {
    const { user, show } = renderRecord(toDecide());

    await user.click(button("Verify Accomplishments"));
    const asked = await dialog();
    expect(asked.getByText(/Iging UserDotTech/)).toBeTruthy();
    expect(asked.getByText(/evidence.*does not say that a target was met.*cannot be changed/)).toBeTruthy();
    expect(onDecide).not.toHaveBeenCalled();
    await user.click(asked.getByRole("button", { name: "Verify" }));

    expect(onDecide).toHaveBeenCalledWith({ outcome: "verified", reason: "" });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Report verified."));
    show(submitted({ status: "verified", notice: "Verified. It cannot be changed." }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
  });

  it("returns only with a reason", async () => {
    const { user } = renderRecord(toDecide());
    const reason = () => screen.getByRole("textbox", { name: /Reason for correction/ });
    expect(reason()).toHaveAttribute("maxlength", "2000");

    await user.click(button("Return for Correction"));
    expect(reason()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Say why you return it.")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();

    await user.type(reason(), " Wrong count. ");
    await user.click(button("Return for Correction"));
    const asked = await dialog();
    expect(asked.getByText(/Dec 31, 2026/)).toBeTruthy();
    await user.click(asked.getByRole("button", { name: "Return" }));

    expect(onDecide).toHaveBeenCalledWith({ outcome: "returned", reason: "Wrong count." });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Report returned."));
    expect(reason()).toHaveValue("");
  });

  it("shows a refusal of the API and keeps the reason", async () => {
    onDecide.mockResolvedValue({ message: "This record is not waiting for a decision.", fieldErrors: {} });
    const { user } = renderRecord(toDecide());
    await user.type(screen.getByRole("textbox", { name: /Reason for correction/ }), "Wrong count.");

    await user.click(button("Return for Correction"));
    await user.click((await dialog()).getByRole("button", { name: "Return" }));

    await waitFor(() => expect(screen.getByText("This record is not waiting for a decision.")).toBeTruthy());
    expect(screen.getByRole("textbox", { name: /Reason for correction/ })).toHaveValue("Wrong count.");
  });
});

describe("the way back", () => {
  it("goes straight to Goals when nothing is unsaved", async () => {
    const { user } = renderRecord(toDecide());

    await user.click(button("Back to Goals"));

    expect(push).toHaveBeenCalledWith("/goals");
  });

  it.each([
    ["a typed value", accomplishmentDetail(), /Actual result for/],
    ["a typed reason", toDecide(), /Reason for correction/],
  ])("asks before it discards %s", async (_what, detail, field) => {
    const { user } = renderRecord(detail);
    await user.type(screen.getAllByRole("textbox", { name: field })[0]!, "4");

    await user.click(button("Back to Goals"));
    expect(push).not.toHaveBeenCalled();
    await user.click((await dialog()).getByRole("button", { name: "Discard changes" }));

    expect(push).toHaveBeenCalledWith("/goals");
    expect(screen.getAllByRole("textbox", { name: field })[0]).toHaveValue("");
  });
});

describe("the remarks of each indicator", () => {
  const noted = [
    { indicatorId: SPRINT, actualValue: 85, remarks: "One slip." },
    { indicatorId: DEFECTS, actualValue: 0, remarks: null },
  ];

  it("takes them in the table, and saves them with the values", async () => {
    const { user } = renderRecord(accomplishmentDetail({ actuals: noted }));
    const field = screen.getByRole("textbox", { name: "Remarks for Sprint completion" }) as HTMLTextAreaElement;
    expect(field.value).toBe("One slip.");

    await user.type(screen.getByRole("textbox", { name: "Remarks for Escaped defects" }), "None found.");
    await user.click(button("Save as Draft"));

    expect(onSave.mock.calls[0]?.[0].actuals).toEqual([
      { indicatorId: SPRINT, actualValue: 85, remarks: "One slip." },
      { indicatorId: DEFECTS, actualValue: 0, remarks: "None found." },
    ]);
  });

  it("shows them as words in a report that the caller cannot change", () => {
    renderRecord(submitted({ actuals: noted }));

    expect(indicators().getAllByRole("columnheader").at(-1)?.textContent).toBe("Remarks");
    expect(cellsOf("Sprint completion").at(-1)).toBe("One slip.");
    expect(cellsOf("Escaped defects").at(-1)).toBe("None");
    expect(screen.queryByRole("textbox", { name: /Remarks for/ })).toBeNull();
  });

  it("shows them in the history of the submissions", () => {
    renderRecord(
      submitted({
        actuals: noted,
        versions: [
          { version: 1, actedAt: "2026-11-26T02:00:00.000Z", actorName: "Iging", remarks: null, correctionReason: null, actuals: noted },
        ],
      }),
    );

    expect(screen.getByText(/Sprint completion: 85.*One slip\./)).toBeTruthy();
  });

  it("says when the first submission closes, if the cycle has such a deadline", () => {
    renderRecord(accomplishmentDetail({ accomplishmentDeadline: "2026-12-15T15:59:59.000Z" }));

    const summary = within(screen.getByRole("region", { name: "Report summary" }));
    expect(summary.getByText("Accomplishment Deadline")).toBeTruthy();
    expect(summary.getByText("Dec 15, 2026")).toBeTruthy();
  });
});
