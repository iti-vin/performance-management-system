import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { CycleHistoryEntryDto } from "@pms/shared-types";
import { CycleHistoryTab } from "@/features/review-cycles/components/cycle-history-tab";

const entry = (n: number, change: Partial<CycleHistoryEntryDto> = {}): CycleHistoryEntryDto => ({
  eventId: `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
  occurredAt: "2026-11-26T02:00:00.000Z",
  area: "cycle",
  employeeName: null,
  perspective: null,
  action: "launched",
  actorName: "Lebron James",
  reason: null,
  before: { state: "draft" },
  after: { state: "active" },
  ...change,
});
const ENTRIES = [
  entry(1, {
    area: "review",
    employeeName: "Iging Cruz",
    perspective: "self",
    action: "stage_unlocked",
    reason: "Wrong ratings",
    before: { state: "locked" },
    after: { state: "in_progress", answeredCount: 4 },
  }),
  entry(2, { area: "report", employeeName: "Ben Waiting", action: "submitted", before: null, after: null }),
  entry(3),
];
const items = () => screen.queryAllByRole("listitem");

describe("CycleHistoryTab", () => {
  it("says what happened to what, by whom, when, why, and what changed", () => {
    render(<CycleHistoryTab entries={ENTRIES} />);

    expect(items()).toHaveLength(3);
    const first = within(items()[0] as HTMLElement);
    expect(first.getByText("Stage unlocked")).toBeTruthy();
    expect(first.getByText("Self review of Iging Cruz")).toBeTruthy();
    expect(first.getByText(/by Lebron James/)).toBeTruthy();
    expect(first.getByText("Reason: Wrong ratings")).toBeTruthy();
    expect(first.getByText("Before: State: Locked")).toBeTruthy();
    expect(first.getByText("After: State: In Progress, Answered count: 4")).toBeTruthy();
    expect(within(items()[1] as HTMLElement).getByText("KPI report of Ben Waiting")).toBeTruthy();
    expect(within(items()[1] as HTMLElement).queryByText(/Before|After|Reason/)).toBeNull();
    expect(within(items()[2] as HTMLElement).getByText("Cycle")).toBeTruthy();
  });

  it.each([
    ["cycle", { state: "active" }, "After: State: Active"],
    ["report", { status: "returned" }, "After: Status: Returned"],
    ["cycle", { releasedAt: "2026-11-26T21:28:19.236Z", resultCount: 1 }, "After: Released at: 11/27/26, 5:28 AM, Result count: 1"],
    ["cycle", { reviewType: "standard", evaluationStart: "2026-10-01" }, "After: Review type: Standard Performance Review, Evaluation start: Oct 1, 2026"],
    ["cycle", { activationDate: null, employeeVisible: false, managerVisible: true }, "After: Activation date: None, Employee visible: No, Manager visible: Yes"],
    ["cycle", { state: "mystery", name: "ZZ demo" }, "After: State: mystery, Name: ZZ demo"],
  ] as const)("puts the values of a %s change in words: %j", (area, after, words) => {
    render(<CycleHistoryTab entries={[entry(1, { area, before: null, after })]} />);

    expect(screen.getByText(words)).toBeTruthy();
  });

  it("narrows to one employee by name, and says when nothing matches", async () => {
    const user = userEvent.setup();
    render(<CycleHistoryTab entries={ENTRIES} />);
    const search = screen.getByRole("searchbox", { name: "Search by employee" });

    await user.type(search, "igin");
    expect(items()).toHaveLength(1);

    await user.type(search, "zzz");
    expect(items()).toHaveLength(0);
    expect(screen.getByText("No history matches your search.")).toBeTruthy();
  });

  it.each([
    [[], "Nothing is recorded for this cycle yet."],
    [null, "The history could not be loaded. Reload the page."],
  ])("explains the history %j", (entries, words) => {
    render(<CycleHistoryTab entries={entries} />);

    expect(screen.getByText(words)).toBeTruthy();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
