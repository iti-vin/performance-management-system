import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewCycleDetailDto, ReviewCycleParticipantDto } from "@pms/shared-types";

import CycleDetailsPage from "@/app/(workspace)/review-cycles/[cycle-id]/page";
import { DetailsContent } from "@/app/(workspace)/review-cycles/[cycle-id]/details-content";
import { CycleDetails } from "@/features/review-cycles/components/cycle-details";

const { replace, notFound, redirect, getReviewCycle, getReviewCycleParticipants, cancelReviewCycle, extendReviewCycle, reopenReview, finalizeReviewCycle, getCycleResults, getReviewCycleReadiness, unscheduleReviewCycle, getCycleHistory } = vi.hoisted(() => ({
  replace: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
  getReviewCycle: vi.fn(),
  getReviewCycleParticipants: vi.fn(),
  cancelReviewCycle: vi.fn(),
  extendReviewCycle: vi.fn(),
  reopenReview: vi.fn(),
  finalizeReviewCycle: vi.fn(),
  getCycleResults: vi.fn(),
  getReviewCycleReadiness: vi.fn(),
  unscheduleReviewCycle: vi.fn(),
  getCycleHistory: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), notFound, redirect }));
vi.mock("@/features/review-cycles/services/result-reader", () => ({ getCycleResults }));
vi.mock("@/features/review-cycles/services/review-cycle-reader", () => ({ getReviewCycle, getReviewCycleParticipants, getReviewCycleReadiness, getCycleHistory }));
vi.mock("@/features/review-cycles/services/manage-review-cycle", () => ({
  cancelReviewCycle: async (...args: unknown[]) => cancelReviewCycle(...args),
  extendReviewCycle: async (...args: unknown[]) => extendReviewCycle(...args),
  reopenReview: async (...args: unknown[]) => reopenReview(...args),
  finalizeReviewCycle: async (...args: unknown[]) => finalizeReviewCycle(...args),
  releaseResults: async () => ({ message: "" }),
  unscheduleReviewCycle: async (...args: unknown[]) => unscheduleReviewCycle(...args),
}));

const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const ID = guid(141);
const stage = (perspective: "self" | "manager", sortOrder: number, deadline: string) => ({
  stageId: guid(110 + sortOrder),
  cycleId: ID,
  perspective,
  evaluatorRole: perspective,
  evaluatorId: null,
  sortOrder,
  deadline,
});

const cycle = (change: Partial<ReviewCycleDetailDto> = {}): ReviewCycleDetailDto => ({
  cycleId: ID,
  company: "Mayon Consolidated Inc.",
  name: "ZZ demo",
  reviewType: "standard",
  state: "active",
  evaluationStart: "2026-10-01",
  evaluationEnd: "2026-11-25",
  assessmentStart: "2026-11-25T16:00:00.000Z",
  verificationDeadline: "2026-12-31T15:59:59.000Z",
  activationDate: null,
  goalsWeight: 0.5,
  behavioralWeight: 0.5,
  anonymityThreshold: null,
  cancelledReason: null,
  finalizedAt: null,
  releasedAt: null,
  description: null,
  accomplishmentDeadline: null,
  idempotencyKey: null,
  employeeVisible: true,
  managerVisible: true,
  earlierAnswersVisible: true,
  createdAt: "2026-11-26T00:00:00.000Z",
  updatedAt: "2026-11-26T00:00:00.000Z",
  stages: [stage("manager", 2, "2026-12-18T15:59:59.000Z"), stage("self", 1, "2026-12-04T15:59:59.000Z")],
  participants: [],
  ...change,
});

type Work = ReviewCycleParticipantDto["assignments"][number];
const work = (n: number, perspective: Work["perspective"], evaluatorName: string, state: Work["state"], isOverdue = false): Work => ({
  assignmentId: guid(n),
  perspective,
  evaluatorName,
  state,
  isOverdue,
  deadline: "2026-12-04T15:59:59.000Z",
});
const PEOPLE: ReviewCycleParticipantDto[] = [
  {
    participantId: guid(151),
    name: "Ana Done",
    position: "Software Engineer",
    department: "Engineering",
    assignments: [work(201, "self", "Ana Done", "submitted"), work(202, "manager", "Maria Santos", "not_started", true)],
  },
  {
    participantId: guid(152),
    name: "Ben Waiting",
    position: null,
    department: "Sales",
    assignments: [work(203, "self", "Ben Waiting", "not_started"), work(204, "manager", "Maria Santos", "locked")],
  },
];

const onCancel = vi.fn();
const onExtend = vi.fn();
const onReopen = vi.fn();
const onFinalize = vi.fn();
const onRelease = vi.fn();
const onUnschedule = vi.fn();
let problems: string[] = [];
function renderDetails(tab = "overview", change: Partial<ReviewCycleDetailDto> = {}, participants = PEOPLE) {
  render(<CycleDetails cycle={cycle(change)} participants={participants} tab={tab} onCancel={onCancel} onExtend={onExtend} onReopen={onReopen} results={[]} onFinalize={onFinalize} onRelease={onRelease} onUnschedule={onUnschedule} problems={problems} />);
  return userEvent.setup();
}
const rows = () => screen.getAllByRole("row").slice(1);
const headings = () => screen.getAllByRole("columnheader").map((cell) => cell.textContent?.trim());
const choose = async (user: ReturnType<typeof userEvent.setup>, filter: RegExp, option: string) => {
  await user.click(screen.getByRole("combobox", { name: filter }));
  await user.click(await screen.findByRole("option", { name: option }));
};

beforeEach(() => {
  for (const mock of [replace, notFound, redirect, getReviewCycle, getReviewCycleParticipants, cancelReviewCycle, onCancel]) mock.mockReset();
  for (const mock of [onExtend, onReopen, extendReviewCycle, reopenReview]) mock.mockReset().mockResolvedValue({ message: "" });
  onCancel.mockResolvedValue({ message: "" });
  onUnschedule.mockReset().mockResolvedValue({ message: "" });
  problems = [];
  getReviewCycleReadiness.mockReset().mockResolvedValue({ kind: "ok", data: [] });
});

describe("the header of a cycle", () => {
  it("names the cycle, its type and period, and where it stands, with the way back", () => {
    renderDetails();

    expect(screen.getByRole("heading", { level: 2, name: "ZZ demo" })).toBeTruthy();
    expect(screen.getByText("Standard Performance Review · Oct 1, 2026 to Nov 25, 2026")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to Cycles" })).toHaveAttribute("href", "/review-cycles");
  });

  it.each(["active", "scheduled"] as const)("offers to cancel a %s cycle", (state) => {
    renderDetails("overview", { state });

    expect(screen.getByRole("button", { name: "Cancel Cycle" })).toBeTruthy();
  });

  it.each(["completed", "cancelled"] as const)("offers no cancellation of a %s cycle", (state) => {
    renderDetails("overview", { state });

    expect(screen.queryByRole("button", { name: "Cancel Cycle" })).toBeNull();
  });

  it("cancels only with a reason, and shows why when it cannot", async () => {
    onCancel.mockResolvedValue({ message: "This cycle can no longer be cancelled. Reload the register." });
    const user = renderDetails();

    await user.click(screen.getByRole("button", { name: "Cancel Cycle" }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByText(/cannot be undone/)).toBeTruthy();
    await user.click(dialog.getByRole("button", { name: "Cancel Cycle" }));
    expect(onCancel).not.toHaveBeenCalled();

    await user.type(dialog.getByRole("textbox"), "Budget freeze");
    await user.click(dialog.getByRole("button", { name: "Cancel Cycle" }));

    expect(onCancel).toHaveBeenCalledWith({ reason: "Budget freeze" });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("This cycle can no longer be cancelled."));
  });
});

describe("the description and the accomplishment deadline", () => {
  const SET = { description: "Yearly review of delivery.", accomplishmentDeadline: "2026-12-15T15:59:59.000Z" };

  it("shows the description under the name, and the deadline in the overview", () => {
    renderDetails("overview", SET);

    expect(screen.getByText("Yearly review of delivery.")).toBeTruthy();
    const pairs = screen.getAllByRole("term").map((term) => [term.textContent, term.nextElementSibling?.textContent]);
    expect(pairs).toContainEqual(["Accomplishment Deadline", "Dec 15, 2026"]);
  });

  it("extends the accomplishment deadline when the cycle has one", async () => {
    const user = renderDetails("overview", SET);
    await user.click(screen.getByRole("button", { name: "Extend Deadlines" }));
    const dialog = within(await screen.findByRole("dialog"));
    const field = dialog.getByLabelText(/^Accomplishment Deadline/) as HTMLInputElement;
    expect(field.value).toBe("2026-12-15");

    fireEvent.change(field, { target: { value: "2026-12-20" } });
    await user.type(dialog.getByLabelText(/^Reason/), "Late proof");
    await user.click(dialog.getByRole("button", { name: "Extend Deadlines" }));

    expect(onExtend).toHaveBeenCalledWith({ reason: "Late proof", accomplishmentDeadline: "2026-12-20T23:59:59+08:00", stages: [] });
  });

  it("offers no accomplishment deadline for a cycle that has none", async () => {
    const user = renderDetails();
    await user.click(screen.getByRole("button", { name: "Extend Deadlines" }));

    expect(within(await screen.findByRole("dialog")).queryByLabelText(/^Accomplishment Deadline/)).toBeNull();
  });
});

describe("the components", () => {
  it.each([
    [{}, "Goals Performance 50%, Behavioral Performance 50%"],
    [{ goalsWeight: 0, behavioralWeight: 1 }, "Behavioral Performance 100%"],
  ])("says which apply in the overview", (change, words) => {
    renderDetails("overview", change);

    const pairs = screen.getAllByRole("term").map((term) => [term.textContent, term.nextElementSibling?.textContent]);
    expect(pairs).toContainEqual(["Components", words]);
  });
});

describe("a scheduled cycle", () => {
  const SCHEDULED = { state: "scheduled", activationDate: "2027-01-05" } as const;

  it("says the day it starts, and returns to draft after a confirmation", async () => {
    const user = renderDetails("overview", SCHEDULED);
    expect(screen.getByText("Starts on Jan 5, 2027.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Back to Draft" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Back to Draft" }));

    expect(onUnschedule).toHaveBeenCalledTimes(1);
  });

  it("lists what blocks its activation", () => {
    problems = ["The deadline of stage 1 has passed."];
    renderDetails("overview", SCHEDULED);

    expect(screen.getByRole("alert")).toHaveTextContent("This cycle cannot activate yet");
    expect(screen.getByRole("alert")).toHaveTextContent("The deadline of stage 1 has passed.");
  });

  it("offers no way back to draft in another state", () => {
    renderDetails();

    expect(screen.queryByRole("button", { name: "Back to Draft" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("the tabs", () => {
  it("opens the tab of the address, and puts a chosen tab in the address", async () => {
    const user = renderDetails();

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Overview", "Participants", "Progress", "Results", "History"]);
    await user.click(screen.getByRole("tab", { name: "Progress" }));

    expect(replace).toHaveBeenCalledWith(`/review-cycles/${ID}?tab=progress`, { scroll: false });
  });

  it("falls back to the overview for an unknown tab", () => {
    renderDetails("nonsense");

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("the overview", () => {
  it("says when the cycle starts, its last deadline, the results, and the anonymity minimum", () => {
    renderDetails("overview", { anonymityThreshold: 3 });

    const pairs = screen.getAllByRole("term").map((term) => [term.textContent, term.nextElementSibling?.textContent]);
    expect(pairs).toEqual([
      ["Components", "Goals Performance 50%, Behavioral Performance 50%"],
      ["Cycle Start", "Nov 26, 2026"],
      ["Submission Deadline", "Dec 18, 2026"],
      ["Accomplishment Deadline", "Not set"],
      ["Verification Deadline", "Dec 31, 2026"],
      ["Results", "Not released"],
      ["Anonymous Minimum", "3 responses per group"],
    ]);
  });

  it("says why a cycle was cancelled", () => {
    renderDetails("overview", { state: "cancelled", cancelledReason: "Budget freeze" });

    expect(screen.getByText("Cancellation Reason")).toBeTruthy();
    expect(screen.getByText("Budget freeze")).toBeTruthy();
    // The accomplishment deadline and the anonymous minimum.
    expect(screen.getAllByText("Not set")).toHaveLength(2);
  });
});

describe("the participants", () => {
  it("shows each person, who answers each stage, the counts, and the status", () => {
    renderDetails("participants");

    expect(headings()).toEqual(["Employee", "Department", "Assigned Evaluators", "Completed", "Pending", "Status"]);
    const first = within(rows()[0]!);
    for (const text of ["Ana Done", "Software Engineer", "Engineering", "Self: Ana Done", "Manager: Maria Santos", "0 / 2", "1", "Submitted"]) {
      expect(first.getByText(text)).toBeTruthy();
    }
    expect(within(rows()[1]!).getByText("Not Started")).toBeTruthy();
  });

  it.each([
    ["the search", async (user: ReturnType<typeof userEvent.setup>) => user.type(screen.getByRole("searchbox"), "ben"), "Ben Waiting"],
    ["the department", async (user: ReturnType<typeof userEvent.setup>) => choose(user, /department/i, "Engineering"), "Ana Done"],
    ["the status", async (user: ReturnType<typeof userEvent.setup>) => choose(user, /^status$/i, "Not Started"), "Ben Waiting"],
    ["late work", async (user: ReturnType<typeof userEvent.setup>) => choose(user, /^status$/i, "Overdue"), "Ana Done"],
  ])("filters by %s", async (_what, act, name) => {
    const user = renderDetails("participants");

    await act(user);

    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]!).getByText(name)).toBeTruthy();
  });

  it("says when no participant matches", async () => {
    const user = renderDetails("participants");

    await user.type(screen.getByRole("searchbox"), "nobody");

    expect(screen.getByText("No participants match these filters.")).toBeTruthy();
  });
});

describe("the progress", () => {
  it("shows how much of the work is complete", () => {
    renderDetails("progress", {}, [
      { ...PEOPLE[0]!, assignments: [work(201, "self", "Ana Done", "completed"), work(202, "manager", "Maria Santos", "submitted")] },
      PEOPLE[1]!,
    ]);

    expect(screen.getByRole("heading", { name: "Assignment completion" })).toBeTruthy();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByText("1 completed / 4 assignments · 1 submitted")).toBeTruthy();
  });

  it("lists every assignment with a way to its response", () => {
    renderDetails("progress");

    expect(headings()).toEqual(["Employee", "Type", "Reviewer", "Status", "Action"]);
    expect(rows()).toHaveLength(4);
    const late = within(rows()[1]!);
    expect(late.getByText("Overdue")).toBeTruthy();
    expect(late.getByRole("link", { name: /View response/ })).toHaveAttribute("href", `/reviews/${guid(202)}?from=cycle`);
  });

  it.each([
    ["the reviewer", async (user: ReturnType<typeof userEvent.setup>) => user.type(screen.getByRole("searchbox"), "maria"), 2],
    ["the review type", async (user: ReturnType<typeof userEvent.setup>) => choose(user, /review type/i, "Self"), 2],
    ["the status", async (user: ReturnType<typeof userEvent.setup>) => choose(user, /^status$/i, "Locked"), 1],
    ["late work", async (user: ReturnType<typeof userEvent.setup>) => choose(user, /^status$/i, "Overdue"), 1],
  ])("filters by %s", async (_what, act, count) => {
    const user = renderDetails("progress");

    await act(user);

    expect(rows()).toHaveLength(count);
  });
});

describe("the results", () => {
  it("finalizes after a confirmation, and shows why it cannot above the cycle", async () => {
    onFinalize.mockResolvedValue({ message: "The cycle cannot be finalized yet. Ana Done: the Manager review is not submitted." });
    const user = renderDetails("results");

    await user.click(screen.getByRole("button", { name: "Finalize Results" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Finalize Results" }));

    expect(onFinalize).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("the Manager review is not submitted."));
  });
});

/** A cycle that is no longer open to changes: each reason on its own. */
const CLOSED = [
  ["a scheduled", { state: "scheduled" }],
  ["a completed", { state: "completed" }],
  ["a cancelled", { state: "cancelled" }],
  ["a finalized", { finalizedAt: "2026-12-20T00:00:00.000Z" }],
  ["a released", { releasedAt: "2026-12-20T00:00:00.000Z" }],
] as const satisfies readonly (readonly [string, Partial<ReviewCycleDetailDto>])[];

describe("the deadline extension", () => {
  const open = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: "Extend Deadlines" }));
    return within(await screen.findByRole("dialog"));
  };
  const field = (dialog: ReturnType<typeof within>, name: string) => dialog.getByLabelText(new RegExp(`^${name}`)) as HTMLInputElement;
  const send = (user: ReturnType<typeof userEvent.setup>, dialog: ReturnType<typeof within>) =>
    user.click(dialog.getByRole("button", { name: "Extend Deadlines" }));

  it.each(CLOSED)("is not offered for %s cycle", (_what, change) => {
    renderDetails("overview", change);

    expect(screen.queryByRole("button", { name: "Extend Deadlines" })).toBeNull();
  });

  it("starts from the dates of the cycle, in stage order, as Manila days", async () => {
    const dialog = await open(renderDetails());

    expect(field(dialog, "Self Stage Deadline").value).toBe("2026-12-04");
    expect(field(dialog, "Manager Stage Deadline").value).toBe("2026-12-18");
    expect(field(dialog, "Verification Deadline").value).toBe("2026-12-31");
    const labels = dialog.getAllByText(/Deadline$/, { selector: "label" }).map((label) => label.textContent);
    expect(labels).toEqual(["Self Stage Deadline", "Manager Stage Deadline", "Verification Deadline"]);
  });

  it("sends only the changed dates, as the end of the day, with the reason, and closes", async () => {
    const user = renderDetails();
    const dialog = await open(user);

    fireEvent.change(field(dialog, "Manager Stage Deadline"), { target: { value: "2026-12-22" } });
    await user.type(dialog.getByLabelText(/^Reason/), "  Holiday week  ");
    await send(user, dialog);

    expect(onExtend).toHaveBeenCalledWith({
      reason: "Holiday week",
      stages: [{ stageId: guid(112), deadline: "2026-12-22T23:59:59+08:00" }],
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("sends a new verification deadline alone", async () => {
    const user = renderDetails();
    const dialog = await open(user);

    fireEvent.change(field(dialog, "Verification Deadline"), { target: { value: "2027-01-08" } });
    await user.type(dialog.getByLabelText(/^Reason/), "Late proof");
    await send(user, dialog);

    expect(onExtend).toHaveBeenCalledWith({ reason: "Late proof", verificationDeadline: "2027-01-08T23:59:59+08:00", stages: [] });
  });

  it("asks for a reason before it sends", async () => {
    const user = renderDetails();
    const dialog = await open(user);

    await send(user, dialog);

    expect(dialog.getByText("Reason is required.")).toBeTruthy();
    expect(onExtend).not.toHaveBeenCalled();
  });

  it("stays open with the reason of a refusal, and keeps what was typed", async () => {
    onExtend.mockResolvedValue({ message: "Move at least one deadline later." });
    const user = renderDetails();
    const dialog = await open(user);

    await user.type(dialog.getByLabelText(/^Reason/), "Holiday week");
    await send(user, dialog);

    await waitFor(() => expect(dialog.getByRole("alert")).toHaveTextContent("Move at least one deadline later."));
    expect((dialog.getByLabelText(/^Reason/) as HTMLTextAreaElement).value).toBe("Holiday week");
  });
});

describe("the reopening", () => {
  const SUBMITTED: ReviewCycleParticipantDto[] = [
    {
      ...PEOPLE[0]!,
      assignments: [
        work(201, "self", "Ana Done", "submitted"),
        work(202, "manager", "Maria Santos", "submitted"),
        work(205, "hr", "Hana Reyes", "not_started"),
      ],
    },
  ];
  const buttons = () => screen.queryAllByRole("button", { name: /^Reopen/ });

  it("is offered on each submitted review only", () => {
    renderDetails("progress");

    expect(buttons()).toHaveLength(1);
    expect(buttons()[0]).toHaveAccessibleName("Reopen the Self review of Ana Done");
  });

  it.each(CLOSED)("is not offered for %s cycle", (_what, change) => {
    renderDetails("progress", change, SUBMITTED);

    expect(buttons()).toEqual([]);
  });

  it("says which later reviews it affects, needs a reason, and sends it", async () => {
    const user = renderDetails("progress", {}, SUBMITTED);

    await user.click(screen.getByRole("button", { name: "Reopen the Self review of Ana Done" }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByText(/The Self review of Ana Done opens again/)).toBeTruthy();
    expect(dialog.getByText(/Manager review \(Maria Santos\) also opens again/)).toBeTruthy();
    expect(dialog.getByText(/HR review \(Hana Reyes\) is locked again/)).toBeTruthy();
    await user.click(dialog.getByRole("button", { name: "Reopen Review" }));
    expect(onReopen).not.toHaveBeenCalled();

    await user.type(dialog.getByRole("textbox"), "Wrong ratings");
    await user.click(dialog.getByRole("button", { name: "Reopen Review" }));

    expect(onReopen).toHaveBeenCalledWith({ assignmentId: guid(201), reason: "Wrong ratings" });
  });

  it("names no other review when the last stage opens again, and shows why a reopening failed", async () => {
    onReopen.mockResolvedValue({ message: "This review can no longer be reopened. Reload the page." });
    const user = renderDetails("progress", {}, SUBMITTED);

    await user.click(screen.getByRole("button", { name: "Reopen the Manager review of Ana Done" }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.queryByText(/Self review/)).toBeNull();
    await user.type(dialog.getByRole("textbox"), "Wrong ratings");
    await user.click(dialog.getByRole("button", { name: "Reopen Review" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("This review can no longer be reopened."));
  });
});

describe("DetailsContent", () => {
  const read = (search: Record<string, string> = {}) =>
    DetailsContent({ params: Promise.resolve({ "cycle-id": ID }), searchParams: Promise.resolve(search) });

  beforeEach(() => {
    getReviewCycle.mockResolvedValue({ kind: "ok", data: cycle() });
    getReviewCycleParticipants.mockResolvedValue({ kind: "ok", data: PEOPLE });
    getCycleResults.mockResolvedValue({ kind: "ok", data: [] });
  });

  it("reads the cycle of the route, opens the tab of the address, and cancels that cycle", async () => {
    render(<>{await read({ tab: "participants" })}</>);
    const user = userEvent.setup();

    expect(getReviewCycle).toHaveBeenCalledWith(ID);
    expect(getReviewCycleParticipants).toHaveBeenCalledWith(ID);
    expect(screen.getByRole("tab", { name: "Participants" })).toHaveAttribute("aria-selected", "true");

    cancelReviewCycle.mockResolvedValue({ message: "" });
    await user.click(screen.getByRole("button", { name: "Cancel Cycle" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.type(dialog.getByRole("textbox"), "Budget freeze");
    await user.click(dialog.getByRole("button", { name: "Cancel Cycle" }));

    await waitFor(() => expect(cancelReviewCycle).toHaveBeenCalledWith(ID, { reason: "Budget freeze" }));
  });

  it("reads the results of the route, and finalizes that cycle", async () => {
    finalizeReviewCycle.mockResolvedValue({ message: "" });
    render(<>{await read({ tab: "results" })}</>);
    const user = userEvent.setup();

    expect(getCycleResults).toHaveBeenCalledWith(ID);
    await user.click(screen.getByRole("button", { name: "Finalize Results" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Finalize Results" }));

    await waitFor(() => expect(finalizeReviewCycle).toHaveBeenCalledWith(ID));
  });

  it("reads the problems of a scheduled cycle only", async () => {
    getReviewCycle.mockResolvedValue({ kind: "ok", data: cycle({ state: "scheduled", activationDate: "2027-01-05" }) });
    getReviewCycleReadiness.mockResolvedValue({ kind: "ok", data: [{ step: "stages", field: "stages", message: "Add a stage." }] });
    render(<>{await read()}</>);

    expect(getReviewCycleReadiness).toHaveBeenCalledWith(ID);
    expect(screen.getByRole("alert")).toHaveTextContent("Add a stage.");

    getReviewCycleReadiness.mockClear();
    getReviewCycle.mockResolvedValue({ kind: "ok", data: cycle() });
    await read();
    expect(getReviewCycleReadiness).not.toHaveBeenCalled();
  });

  it("extends and reopens the cycle of the route", async () => {
    render(<>{await read()}</>);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Extend Deadlines" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.type(dialog.getByLabelText(/^Reason/), "Holiday week");
    await user.click(dialog.getByRole("button", { name: "Extend Deadlines" }));

    await waitFor(() => expect(extendReviewCycle).toHaveBeenCalledWith(ID, { reason: "Holiday week", stages: [] }));
  });

  it("reopens a review of the cycle of the route", async () => {
    render(<>{await read({ tab: "progress" })}</>);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Reopen the Self review of Ana Done" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.type(dialog.getByRole("textbox"), "Wrong ratings");
    await user.click(dialog.getByRole("button", { name: "Reopen Review" }));

    await waitFor(() => expect(reopenReview).toHaveBeenCalledWith(ID, { assignmentId: guid(201), reason: "Wrong ratings" }));
  });

  it("sends a draft to the wizard", async () => {
    getReviewCycle.mockResolvedValue({ kind: "ok", data: cycle({ state: "draft" }) });
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(read()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(`/review-cycles/${ID}/edit`);
  });

  it("is the not-found page for a cycle that the company does not have", async () => {
    getReviewCycle.mockResolvedValue({ kind: "not_found" });
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(read()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("shows a notice when a read fails", async () => {
    getReviewCycleParticipants.mockResolvedValue({ kind: "unavailable" });

    render(<>{await read()}</>);

    expect(screen.getByRole("alert")).toHaveTextContent("Review cycles are unavailable");
  });
});

describe("CycleDetailsPage", () => {
  it("names the page and says that it loads", () => {
    render(<CycleDetailsPage params={new Promise(() => {})} searchParams={new Promise(() => {})} />);

    expect(screen.getByRole("heading", { level: 1, name: "Cycle Details" })).toBeTruthy();
    expect(screen.getByRole("status")).toHaveTextContent("Loading the cycle.");
  });
});

describe("the reopening of one of several peer reviews", () => {
  it("names no other review of the same stage: it does not change", async () => {
    const peers: ReviewCycleParticipantDto[] = [
      {
        ...PEOPLE[0]!,
        assignments: [
          work(301, "peer", "Anonymous peer", "submitted"),
          work(302, "peer", "Anonymous peer", "submitted"),
          work(303, "hr", "Hana Reyes", "not_started"),
        ],
      },
    ];
    const user = renderDetails("progress", {}, peers);

    await user.click(screen.getAllByRole("button", { name: "Reopen the Peer review of Ana Done" })[0]!);
    const dialog = within(await screen.findByRole("dialog"));

    expect(dialog.queryByText(/Peer review \(Anonymous peer\)/)).toBeNull();
    expect(dialog.getByText(/HR review \(Hana Reyes\) is locked again/)).toBeTruthy();
  });
});

describe("DetailsContent, History", () => {
  beforeEach(() => {
    getReviewCycle.mockResolvedValue({ kind: "ok", data: cycle() });
    getReviewCycleParticipants.mockResolvedValue({ kind: "ok", data: PEOPLE });
    getCycleResults.mockResolvedValue({ kind: "ok", data: [] });
    getCycleHistory.mockReset().mockResolvedValue({ kind: "ok", data: [] });
  });
  const open = async (tab: string) =>
    render(<>{await DetailsContent({ params: Promise.resolve({ "cycle-id": ID }), searchParams: Promise.resolve({ tab }) })}</>);

  it("reads the history for its tab only", async () => {
    await open("progress");
    expect(getCycleHistory).not.toHaveBeenCalled();

    await open("history");
    expect(getCycleHistory).toHaveBeenCalledWith(ID);
    expect(screen.getByText("Nothing is recorded for this cycle yet.")).toBeTruthy();
  });

  it("keeps the page when the history cannot be read", async () => {
    getCycleHistory.mockResolvedValue({ kind: "unavailable" });

    await open("history");

    expect(screen.getByText("The history could not be loaded. Reload the page.")).toBeTruthy();
  });
});
