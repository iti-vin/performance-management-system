import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { BehavioralTemplateListResponseDto, ReviewCycleListRowDto } from "@pms/shared-types";

import { AccomplishmentsList } from "@/features/position-goals/components/accomplishments-list";
import { ReviewCyclesTable } from "@/features/review-cycles/components/review-cycles-table";
import { BehavioralTemplateList } from "@/features/review-templates/components/behavioral-template-list";
import { accomplishmentRow, guid } from "../utils/accomplishment";

// The tabs and filters of the lists that the API sends whole, as the sample frontend has them.

type User = ReturnType<typeof userEvent.setup>;
const rows = () => screen.getAllByRole("row").slice(1);
const rowTexts = () => rows().map((row) => within(row).queryByRole("link")?.textContent ?? row.textContent ?? "");
const tab = (user: User, name: string) => user.click(screen.getByRole("tab", { name }));
async function choose(user: User, filter: RegExp, option: string) {
  await user.click(screen.getByRole("combobox", { name: filter }));
  await user.click(await screen.findByRole("option", { name: option }));
}

const cycle = (n: number, name: string, change: Partial<ReviewCycleListRowDto> = {}): ReviewCycleListRowDto => ({
  cycleId: guid(n),
  name,
  reviewType: "standard",
  state: "active",
  evaluationStart: "2026-01-01",
  evaluationEnd: "2026-06-30",
  releasedAt: null,
  deadline: null,
  participantCount: 1,
  assignmentCount: 3,
  submittedCount: 0,
  completedCount: 0,
  ...change,
});
const CYCLES = [
  cycle(141, "Alpha"),
  cycle(142, "Bravo", { state: "draft", reviewType: "360" }),
  cycle(143, "Charlie", { state: "completed", evaluationStart: "2026-07-01", evaluationEnd: "2026-09-30" }),
];

describe("the cycle register", () => {
  const names = () => rows().map((row) => within(row).getByRole("link").textContent);
  const setup = () => {
    render(<ReviewCyclesTable rows={CYCLES} />);
    return userEvent.setup();
  };

  it("offers the tabs of the sample, with every cycle first", () => {
    setup();

    expect(screen.getAllByRole("tab").map((item) => item.textContent)).toEqual(["All Cycles", "Draft", "Active", "Completed"]);
    expect(names()).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveAttribute("placeholder", "Search cycles...");
  });

  it.each([
    ["the Draft tab", (user: User) => tab(user, "Draft"), ["Bravo"]],
    ["the Active tab", (user: User) => tab(user, "Active"), ["Alpha"]],
    ["the Completed tab", (user: User) => tab(user, "Completed"), ["Charlie"]],
    ["the search", (user: User) => user.type(screen.getByRole("searchbox"), "char"), ["Charlie"]],
    ["the status", (user: User) => choose(user, /cycle status/i, "Draft"), ["Bravo"]],
    ["the review type", (user: User) => choose(user, /cycle review type/i, "360° Feedback"), ["Bravo"]],
    ["the review period", (user: User) => choose(user, /review period/i, "Jul 1, 2026 to Sep 30, 2026"), ["Charlie"]],
  ])("narrows by %s", async (_what, act, expected) => {
    const user = setup();

    await act(user);

    expect(names()).toEqual(expected);
  });

  it("says when nothing matches", async () => {
    const user = setup();

    await user.type(screen.getByRole("searchbox"), "zzz");

    expect(screen.getByText("No cycles match these filters.")).toBeTruthy();
  });
});

const template = (n: number, name: string, change: Partial<BehavioralTemplateListResponseDto[number]> = {}) => ({
  templateId: guid(n),
  company: "Mayon Consolidated Inc.",
  name,
  description: null,
  category: "general_performance" as const,
  reviewType: "self" as const,
  status: "published" as const,
  currentVersion: 1,
  publishedBy: null,
  publishedAt: null,
  archivedAt: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-05T00:00:00.000Z",
  questionCount: 1,
  ...change,
});

describe("the behavioral templates", () => {
  const TEMPLATES = [template(111, "Quarterly"), template(112, "Probation", { status: "draft", reviewType: "manager" })];
  const names = () => rowTexts().map((text) => text.replace(/Version.*$/, ""));
  const setup = () => {
    render(<BehavioralTemplateList templates={TEMPLATES} />);
    return userEvent.setup();
  };

  it("offers the tabs and the search of the sample", () => {
    setup();

    expect(screen.getAllByRole("tab").map((item) => item.textContent)).toEqual(["All Templates", "Draft", "Published"]);
    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "Search templates...");
  });

  it.each([
    ["the Draft tab", (user: User) => tab(user, "Draft"), ["Probation"]],
    ["the search", (user: User) => user.type(screen.getByRole("searchbox"), "quart"), ["Quarterly"]],
    ["the review type", (user: User) => choose(user, /review type/i, "Manager"), ["Probation"]],
    ["the status", (user: User) => choose(user, /^status$/i, "Published"), ["Quarterly"]],
  ])("narrows by %s", async (_what, act, expected) => {
    const user = setup();

    await act(user);

    expect(names()).toEqual(expected);
  });
});

describe("the goals of others", () => {
  const ROWS = [
    accomplishmentRow({ isOwn: false, employeeName: "Ana", cycleName: "Alpha", cycleId: guid(141) }),
    accomplishmentRow({ accomplishmentId: guid(172), isOwn: false, employeeName: "Ben", cycleName: "Bravo", cycleId: guid(142), status: "submitted" }),
    accomplishmentRow({ accomplishmentId: guid(173), employeeName: "Own Person" }),
  ];
  const team = () => within(screen.getByRole("region", { name: "Your team" }));
  const names = () => team().getAllByRole("row").slice(1).map((row) => within(row).getByRole("link").firstChild?.textContent);
  const setup = () => {
    render(<AccomplishmentsList rows={ROWS} isAdmin={false} />);
    return userEvent.setup();
  };

  it("searches the employees of the team list only", () => {
    setup();

    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "Search employees...");
  });

  it.each([
    ["the search", (user: User) => user.type(screen.getByRole("searchbox"), "ben"), ["Ben"]],
    ["the review cycle", (user: User) => choose(user, /review cycle/i, "Alpha"), ["Ana"]],
    ["the status", (user: User) => choose(user, /^status$/i, "Submitted"), ["Ben"]],
  ])("narrows by %s, and leaves your own reports", async (_what, act, expected) => {
    const user = setup();

    await act(user);

    expect(names()).toEqual(expected);
    expect(within(screen.getByRole("region", { name: "Your reports" })).getAllByRole("row")).toHaveLength(2);
  });
});
