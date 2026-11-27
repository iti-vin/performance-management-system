import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResultDetailDto, ResultRowDto, ReviewCycleDetailDto } from "@pms/shared-types";

import { ResultContent } from "@/app/(workspace)/reviews/results/[participant-id]/result-content";
import { ResultsContent } from "@/app/(workspace)/reviews/results/results-content";
import { CycleResultsTab } from "@/features/review-cycles/components/cycle-results-tab";

const { notFound, getResult, getResults } = vi.hoisted(() => ({ notFound: vi.fn(), getResult: vi.fn(), getResults: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/features/review-cycles/services/result-reader", () => ({ getResult, getResults }));

const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const CYCLE_ID = guid(141);
const row = (change: Partial<ResultRowDto> = {}): ResultRowDto => ({
  participantId: guid(151),
  cycleId: CYCLE_ID,
  cycleName: "ZZ demo",
  employeeName: "Ana Reyes",
  position: "Engineer",
  department: "IT",
  goalsScore: 4.505,
  behavioralScore: 4,
  overallScore: 4.303,
  finalizedAt: "2026-12-20T00:00:00.000Z",
  releasedAt: null,
  ...change,
});

const cycle = (change: Partial<ReviewCycleDetailDto> = {}) =>
  ({ cycleId: CYCLE_ID, state: "active", finalizedAt: null, releasedAt: null, ...change }) as ReviewCycleDetailDto;
const FINALIZED = { state: "completed", finalizedAt: "2026-12-20T00:00:00.000Z" } as const;

const onFinalize = vi.fn();
const onRelease = vi.fn();
function renderTab(change: Partial<ReviewCycleDetailDto> = {}, results: ResultRowDto[] = []) {
  render(<CycleResultsTab cycle={cycle(change)} results={results} isPending={false} onFinalize={onFinalize} onRelease={onRelease} />);
  return userEvent.setup();
}
const cellsOf = (table: string, name: RegExp) =>
  within(within(screen.getByRole("table", { name: table })).getByRole("row", { name }))
    .getAllByRole("cell")
    .map((cell) => cell.textContent);

beforeEach(() => {
  for (const mock of [notFound, getResult, getResults, onFinalize, onRelease]) mock.mockReset();
});

describe("the results tab of a cycle", () => {
  it("offers finalization of an active cycle, and asks first with what it does", async () => {
    const user = renderTab();
    expect(screen.getByText("Results are not finalized")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Finalize Results" }));
    const dialog = within(await screen.findByRole("alertdialog"));
    expect(dialog.getByText(/cannot be undone/)).toBeTruthy();
    expect(onFinalize).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Finalize Results" }));

    expect(onFinalize).toHaveBeenCalledTimes(1);
  });

  it.each(["draft", "scheduled", "cancelled"] as const)("offers nothing for a %s cycle", (state) => {
    renderTab({ state });

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("lists the finalized results, rounded to two decimals, with a way to each one", () => {
    renderTab(FINALIZED, [row(), row({ participantId: guid(152), employeeName: "Ben Cruz", goalsScore: null, overallScore: null })]);

    expect(cellsOf("Results of the cycle", /Ana Reyes/).slice(1, 5)).toEqual(["IT", "4.51 / 5", "4.00 / 5", "4.30 / 5"]);
    expect(cellsOf("Results of the cycle", /Ben Cruz/).slice(2, 5)).toEqual(["Not rated", "4.00 / 5", "Not rated"]);
    expect(screen.getByRole("link", { name: "View Results of Ana Reyes" })).toHaveAttribute("href", `/reviews/results/${guid(151)}?from=cycle`);
  });

  it("releases only after a confirmation, once finalized", async () => {
    const user = renderTab(FINALIZED, [row()]);
    expect(screen.getByText("Not released. Only HR administrators can read these results.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Release Results" }));
    const dialog = within(await screen.findByRole("alertdialog"));
    expect(dialog.getByText(/chosen readers can read the results/)).toBeTruthy();
    await user.click(dialog.getByRole("button", { name: "Release Results" }));

    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it("says when they were released, and offers no further action", () => {
    renderTab({ ...FINALIZED, releasedAt: "2026-12-21T00:00:00.000Z" }, [row({ releasedAt: "2026-12-21T00:00:00.000Z" })]);

    expect(screen.getByText("Released on Dec 21, 2026.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Release Results|Finalize/ })).toBeNull();
  });
});

describe("ResultsContent", () => {
  it("lists the results that the caller may read, with the cycle of each", async () => {
    getResults.mockResolvedValue({ kind: "ok", data: [row()] });

    render(<>{await ResultsContent()}</>);

    expect(cellsOf("Results", /Ana Reyes/)).toContain("ZZ demo");
    expect(screen.getByRole("link", { name: "View Results of Ana Reyes" })).toHaveAttribute("href", `/reviews/results/${guid(151)}`);
  });

  it("says when there is none yet", async () => {
    getResults.mockResolvedValue({ kind: "ok", data: [] });

    render(<>{await ResultsContent()}</>);

    expect(screen.getByText("No result is released to you yet.")).toBeTruthy();
  });

  it("shows a notice when the read fails", async () => {
    getResults.mockResolvedValue({ kind: "unavailable" });

    render(<>{await ResultsContent()}</>);

    expect(screen.getByRole("alert")).toHaveTextContent("Reviews are unavailable");
  });
});

const detail = (change: Partial<ResultDetailDto> = {}): ResultDetailDto => ({
  ...row({ releasedAt: "2026-12-21T00:00:00.000Z" }),
  evaluationStart: "2026-10-01",
  evaluationEnd: "2026-11-25",
  goalsWeight: 0.6,
  behavioralWeight: 0.4,
  goals: {
    templateName: "Engineer goals",
    templateVersion: 2,
    indicators: [
      { indicatorId: guid(61), name: "Sprint", unit: "Percentage", target: 90, direction: "higher_is_better", weight: 75, actualValue: 95, score: 5, isTargetMet: true, remarks: "Early." },
      { indicatorId: guid(62), name: "Defects", unit: "Count", target: 2, direction: "lower_is_better", weight: 25, actualValue: 4, score: 1, isTargetMet: false, remarks: null },
    ],
  },
  behavioral: {
    templateName: "Quarterly",
    templateVersion: 3,
    questions: [{ questionId: guid(131), sectionTitle: "Work", prompt: "Delivers", ratings: [{ perspective: "self", rating: 5 }] }],
    assessments: [
      { perspective: "self", evaluatorName: "Ana Reyes", submittedCount: 1, submittedAt: "2026-12-01T00:00:00.000Z", rating: 5, isWithheld: false },
      { perspective: "manager", evaluatorName: "Bianca Cruz", submittedCount: 1, submittedAt: "2026-12-02T00:00:00.000Z", rating: 3, isWithheld: false },
      { perspective: "peer", evaluatorName: null, submittedCount: 1, submittedAt: null, rating: null, isWithheld: true },
    ],
    feedback: [{ perspective: "self", evaluatorName: "Ana Reyes", prompt: "Strengths", text: "Steady work." }],
  },
  ...change,
});

describe("ResultContent", () => {
  const read = async (search: Record<string, string> = {}) =>
    render(<>{await ResultContent({ params: Promise.resolve({ "participant-id": guid(151) }), searchParams: Promise.resolve(search) })}</>);

  beforeEach(() => getResult.mockResolvedValue({ kind: "ok", data: detail() }));

  it("says who and which cycle, with the overall rating and each component with its weight", async () => {
    await read();

    expect(getResult).toHaveBeenCalledWith(guid(151));
    for (const text of ["Ana Reyes", "Engineer", "ZZ demo", "Oct 1, 2026 to Nov 25, 2026", "Released on Dec 21, 2026", "Goals Performance · 60%", "Behavioral Performance · 40%"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("4.30 / 5").length).toBeGreaterThan(0);
  });

  it("shows each verified indicator with its achievement and score", async () => {
    await read();

    expect(cellsOf("Goals Performance indicators", /Sprint/)).toEqual(["Sprint", "Percentage", "90", "95", "Achieved", "5.00 / 5"]);
    expect(cellsOf("Goals Performance indicators", /Defects/)).toEqual(["Defects", "Count", "2", "4", "Below Target", "1.00 / 5"]);
  });

  it("shows each rating by perspective, and says which one is withheld or not observed", async () => {
    await read();

    expect(cellsOf("Behavioral ratings", /Delivers/)).toEqual(["Delivers", "5.00", "Not Observed", "Withheld"]);
    expect(cellsOf("Assessment summary", /Peer/)).toEqual(["Peer", "Anonymous group", "1 submitted", "Withheld"]);
    expect(cellsOf("Assessment summary", /Manager/)).toEqual(["Manager", "Bianca Cruz", "Dec 2, 2026", "3.00 / 5"]);
  });

  it("shows the weighted contribution of each component", async () => {
    await read();

    expect(cellsOf("Overall performance summary", /Goals/)).toEqual(["Goals Performance", "4.51 / 5", "60%", "2.70 / 5"]);
  });

  it("shows the written feedback with its author, and names a withheld group", async () => {
    await read();

    expect(screen.getByText("Self · Ana Reyes")).toBeTruthy();
    expect(screen.getByText("Steady work.")).toBeTruthy();
    expect(screen.getByText("Peer feedback is withheld to protect anonymity.")).toBeTruthy();
  });

  it("says that a component does not apply, and never shows it as zero", async () => {
    getResult.mockResolvedValue({ kind: "ok", data: detail({ goals: null, goalsScore: null, goalsWeight: 0, behavioralWeight: 1 }) });

    await read();

    expect(screen.getByText("Goals Performance does not apply to this cycle.")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Goals Performance indicators" })).toBeNull();
  });

  it.each([
    [{}, "/reviews/results", "Back to Results"],
    [{ from: "cycle" }, `/review-cycles/${CYCLE_ID}?tab=results`, "Back to Cycle"],
    [{ from: "https://example.invalid/" }, "/reviews/results", "Back to Results"],
  ])("goes back from %o to its own list", async (search, href, words) => {
    await read(search);

    expect(screen.getByRole("link", { name: words })).toHaveAttribute("href", href);
  });

  it("is the not-found page for a result that the caller may not read", async () => {
    getResult.mockResolvedValue({ kind: "not_found" });
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(read()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("an anonymous question below the minimum", () => {
  it("reads Withheld, not Not Observed", async () => {
    const behavioral = detail().behavioral!;
    const assessments = behavioral.assessments.map((row) => (row.perspective === "peer" ? { ...row, isWithheld: false, rating: 4 } : row));
    getResult.mockResolvedValue({ kind: "ok", data: detail({ behavioral: { ...behavioral, assessments } }) });

    render(<>{await ResultContent({ params: Promise.resolve({ "participant-id": guid(151) }), searchParams: Promise.resolve({}) })}</>);

    expect(cellsOf("Behavioral ratings", /Delivers/)).toEqual(["Delivers", "5.00", "Not Observed", "Withheld"]);
  });
});
