import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewListRowDto } from "@pms/shared-types";
import { ReviewList, type ReviewListProps } from "@/features/review-cycles/components/review-list";
import { ReviewListNotice } from "@/features/review-cycles/components/review-list-notice";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const CYCLE_ID = "00000000-0000-0000-0000-000000000141";
const ROW: ReviewListRowDto = {
  assignmentId: "17d1d193-0fc3-41e1-a13f-a45217488d5d",
  cycleId: CYCLE_ID,
  cycleName: "CY2026-Q4",
  cycleState: "active",
  subjectName: "Iging DotTech",
  subjectPosition: "Software Engineer",
  subjectDepartment: "IT",
  isAssignedToCaller: false,
  evaluatorName: "Maria Santos",
  perspective: "manager",
  state: "in_progress",
  // 16:00 UTC is midnight of the next day in Manila.
  deadline: "2026-12-04T16:00:00.000Z",
  isOverdue: false,
};
const CYCLES = [{ cycleId: CYCLE_ID, name: "CY2026-Q4" }];

interface Setup {
  rows?: ReviewListRowDto[];
  total?: number;
  params?: Partial<ReviewListProps["params"]>;
  isAdmin?: boolean;
  isManager?: boolean;
  cycles?: ReviewListProps["page"]["cycles"];
}

function renderList({ rows = [ROW], total = rows.length, params = {}, isAdmin = true, isManager = false, cycles = CYCLES }: Setup = {}) {
  const merged = { page: 1, pageSize: 10, ...params };
  render(
    <ReviewList
      page={{ items: rows, page: merged.page, pageSize: merged.pageSize, totalItems: total, cycles, departments: ["Engineering", "Sales"] }}
      params={merged}
      isAdmin={isAdmin}
      isManager={isManager}
    />,
  );
}

const dataRows = () => screen.getAllByRole("row").slice(1);
const lastHref = () => replace.mock.calls.at(-1)?.[0] as string;

async function choose(filter: RegExp, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: filter }));
  await user.click(await screen.findByRole("option", { name: option }));
}

beforeEach(() => replace.mockReset());

describe("ReviewList table", () => {
  it("shows who is reviewed, by whom, the cycle, the stage, the deadline in Manila time, and the status in words", () => {
    renderList();

    const row = within(dataRows()[0]!);
    for (const text of ["Iging DotTech", "Maria Santos", "CY2026-Q4", "Manager", "Dec 5, 2026", "In Progress"]) {
      expect(row.getByText(text)).toBeTruthy();
    }
    expect(row.queryByText("Overdue")).toBeNull();
    expect(row.queryByText("Active")).toBeNull();
  });

  it("shows the position under the employee, and says when the reviewer is you", () => {
    renderList({ rows: [{ ...ROW, isAssignedToCaller: true }] });

    const row = within(dataRows()[0]!);
    expect(row.getByText("Software Engineer")).toBeTruthy();
    expect(row.getByText("Assigned to you")).toBeTruthy();
  });

  it("shows no position when the cycle froze none, and no note on a review of someone else", () => {
    renderList({ rows: [{ ...ROW, subjectPosition: null }] });

    const row = within(dataRows()[0]!);
    expect(row.queryByText("Software Engineer")).toBeNull();
    expect(row.queryByText("Assigned to you")).toBeNull();
  });

  it("opens each review from its row, in a link that names the review and keeps the list filters", () => {
    renderList({ params: { state: "in_progress", page: 2 }, total: 45 });

    const link = within(dataRows()[0]!).getByRole("link");
    expect(link.getAttribute("href")).toBe(`/reviews/${ROW.assignmentId}?state=in_progress&page=2`);
    expect(link.textContent).toBe("Iging DotTech: open the Manager review in CY2026-Q4");
  });

  it("shows Overdue as the status of late work", () => {
    renderList({ rows: [{ ...ROW, isOverdue: true }] });

    const row = within(dataRows()[0]!);
    expect(row.getByText("Overdue")).toBeTruthy();
    expect(row.queryByText("In Progress")).toBeNull();
  });

  it("names the state of a cycle that is not active, and a deadline that is not set", () => {
    renderList({ rows: [{ ...ROW, cycleState: "cancelled", deadline: null }] });

    const row = within(dataRows()[0]!);
    expect(row.getByText("Cancelled")).toBeTruthy();
    expect(row.getByText("Not set")).toBeTruthy();
  });

  it.each([
    ["an administrator with no assignment", true, {}, "No review assignments yet."],
    ["anyone else with nothing to answer", false, {}, "You have no reviews yet."],
    ["a filter that leaves nothing", true, { state: "locked" as const }, "No reviews match these filters."],
    ["a search that leaves nothing", false, { q: "zzz" }, "No reviews match these filters."],
  ])("has its own empty message for %s", (_label, isAdmin, params, message) => {
    renderList({ rows: [], isAdmin, params });

    expect(screen.getByText(message)).toBeTruthy();
  });
});

describe("ReviewList filters", () => {
  it("offers an administrator the cycle, the cycle state, the stage, and the status", () => {
    renderList();

    for (const name of [/^review cycle$/i, /cycle state/i, /review type/i, /^status$/i]) {
      expect(screen.getByRole("combobox", { name })).toBeTruthy();
    }
  });

  it("offers anyone else the cycle, the stage, and the status, and says what the list holds", () => {
    renderList({ isAdmin: false });

    expect(screen.getByRole("combobox", { name: /review type/i })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /status/i })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /^review cycle$/i })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: /cycle state/i })).toBeNull();
    expect(screen.getByText("These are the reviews that you answer and the reviews about you, in active and completed cycles.")).toBeTruthy();
  });

  it("offers a manager the Team Reviews tab, between My Reviews and Completed, and says what the list holds (D3)", async () => {
    renderList({ isAdmin: false, isManager: true });

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["All Reviews", "My Reviews", "Team Reviews", "Completed"]);
    expect(
      screen.getByText("These are the reviews that you answer, the reviews about you, and the reviews of your team, in active and completed cycles."),
    ).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("tab", { name: "Team Reviews" }));
    expect(lastHref()).toBe("/reviews?view=team");
  });

  it.each([
    ["an employee", false],
    ["an administrator", true],
  ])("offers %s no Team Reviews tab", (_who, isAdmin) => {
    renderList({ isAdmin });

    expect(screen.queryByRole("tab", { name: "Team Reviews" })).toBeNull();
  });

  it("hides the cycle filter when there is no cycle to offer", () => {
    renderList({ cycles: [] });

    expect(screen.getByRole("combobox", { name: /cycle state/i })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: /^review cycle$/i })).toBeNull();
  });

  it.each([
    [/status/i, "Locked", "/reviews?state=locked"],
    [/review type/i, "HR", "/reviews?perspective=hr"],
    [/cycle state/i, "Cancelled", "/reviews?cycleState=cancelled"],
    [/^review cycle$/i, "CY2026-Q4", `/reviews?cycleId=${CYCLE_ID}`],
    [/department/i, "Sales", "/reviews?department=Sales"],
    [/^status$/i, "Overdue", "/reviews?state=overdue"],
  ])("puts the %s filter in the URL and goes back to page 1", async (filter, option, href) => {
    renderList({ params: { page: 2 }, total: 45 });

    await choose(filter, option);

    expect(replace).toHaveBeenLastCalledWith(href, { scroll: false });
  });

  it("waits for a pause in typing before it searches, and keeps the other filters", async () => {
    renderList({ params: { state: "locked", page: 2 }, total: 45 });

    await userEvent.setup().type(screen.getByRole("searchbox"), "maria");

    expect(replace).not.toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/reviews?state=locked&q=maria", { scroll: false }));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("cuts a search that is longer than the API accepts", async () => {
    renderList();

    const user = userEvent.setup();
    await user.click(screen.getByRole("searchbox"));
    await user.paste("x".repeat(130));

    await waitFor(() => expect(lastHref()).toBe(`/reviews?q=${"x".repeat(120)}`));
  });

  it("clears the search and every filter together", async () => {
    renderList({ params: { cycleId: CYCLE_ID, cycleState: "active", perspective: "hr", state: "locked", q: "maria", page: 2 }, total: 45 });

    await userEvent.setup().click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => expect(lastHref()).toBe("/reviews"));
  });
});

describe("ReviewList tabs", () => {
  const selected = () => screen.getByRole("tab", { selected: true }).textContent;

  it("offers the whole list, the reviews of the caller, and the finished ones", () => {
    renderList();

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["All Reviews", "My Reviews", "Completed"]);
    expect(selected()).toBe("All Reviews");
  });

  it.each([
    ["My Reviews", {}, "/reviews?view=mine"],
    ["Completed", {}, "/reviews?view=completed"],
    ["All Reviews", { view: "mine" as const }, "/reviews"],
  ])("puts the %s tab in the URL and goes back to page 1", async (name, params, href) => {
    renderList({ params: { page: 2, ...params }, total: 45 });

    await userEvent.setup().click(screen.getByRole("tab", { name }));

    expect(replace).toHaveBeenLastCalledWith(href, { scroll: false });
  });

  it("stays on its tab when the filters are cleared", async () => {
    renderList({ params: { view: "completed", state: "submitted" } });
    expect(selected()).toBe("Completed");

    await userEvent.setup().click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => expect(lastHref()).toBe("/reviews?view=completed"));
  });

  it("says that nothing matches on a tab with no row", () => {
    renderList({ rows: [], params: { view: "mine" } });

    expect(screen.getByText("No reviews match these filters.")).toBeTruthy();
  });
});

describe("ReviewList pages", () => {
  it("puts the page in the URL and keeps the filters", async () => {
    renderList({ params: { state: "locked" }, total: 45 });

    await userEvent.setup().click(screen.getByRole("button", { name: "Next page" }));

    expect(replace).toHaveBeenLastCalledWith("/reviews?state=locked&page=2", { scroll: false });
  });

  it("changes the rows per page and goes back to page 1", async () => {
    renderList({ params: { page: 2 }, total: 45 });

    await choose(/rows per page/i, "50");

    expect(replace).toHaveBeenLastCalledWith("/reviews?pageSize=50", { scroll: false });
  });
});

describe("ReviewListNotice", () => {
  it.each([
    ["signed_out", "Session ended", "Log in again to see your reviews."],
    ["forbidden", "No company on your account", "Ask your HR administrator to link it."],
    ["unavailable", "Reviews are unavailable", "We could not load the reviews."],
    ["not_found", "Reviews are unavailable", "We could not load the reviews."],
  ] as const)("tells a %s read in its own words", (kind, title, text) => {
    render(<ReviewListNotice kind={kind} />);

    const alert = within(screen.getByRole("alert"));
    expect(alert.getByText(title)).toBeTruthy();
    expect(alert.getByText(new RegExp(text))).toBeTruthy();
  });
});
