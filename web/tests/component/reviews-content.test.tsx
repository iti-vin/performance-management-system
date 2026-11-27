import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewsPage from "@/app/(workspace)/reviews/page";
import { ReviewsContent } from "@/features/review-cycles/components/reviews-content";

const { replace, redirect, getCurrentUser, getReviews, getReviewCycles } = vi.hoisted(() => ({
  replace: vi.fn(),
  redirect: vi.fn(),
  getCurrentUser: vi.fn(),
  getReviews: vi.fn(),
  getReviewCycles: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), redirect }));
vi.mock("@/features/auth/services/current-user", () => ({ getCurrentUser }));
vi.mock("@/features/review-cycles/services/review-cycle-reader", () => ({ getReviews, getReviewCycles }));

const CYCLE_ID = "00000000-0000-0000-0000-000000000141";
const DRAFT_ID = "00000000-0000-0000-0000-000000000150";
const ROW = {
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
  state: "not_started",
  deadline: null,
  isOverdue: false,
};
const pageOf = (items: unknown[], totalItems: number, page = 1, pageSize = 10) => ({
  kind: "ok",
  data: { items, page, pageSize, totalItems, cycles: [{ cycleId: CYCLE_ID, name: "CY2026-Q4" }], departments: ["IT"] },
});
const CYCLES = {
  kind: "ok",
  data: [
    { cycleId: CYCLE_ID, name: "CY2026-Q4", assignmentCount: 2 },
    { cycleId: DRAFT_ID, name: "CY2027 draft", assignmentCount: 0 },
  ],
};

/** The async server component, awaited and then rendered. */
async function renderContent(raw: Record<string, string> = {}) {
  render(<>{await ReviewsContent({ searchParams: Promise.resolve(raw) })}</>);
}

async function cycleChoices() {
  await userEvent.setup().click(screen.getByRole("combobox", { name: /^review cycle$/i }));
  return (await screen.findAllByRole("option")).map((option) => option.textContent);
}

beforeEach(() => {
  redirect.mockReset();
  getCurrentUser.mockReset().mockResolvedValue({ role: "ADMIN" });
  getReviews.mockReset().mockResolvedValue(pageOf([ROW], 1));
  getReviewCycles.mockReset().mockResolvedValue(CYCLES);
});

describe("ReviewsContent for an administrator", () => {
  it("reads the page that the URL asks for, and shows it", async () => {
    await renderContent({ state: "not_started", cycleId: CYCLE_ID, saved: "x" });

    expect(getReviews).toHaveBeenCalledWith({ state: "not_started", cycleId: CYCLE_ID, page: 1, pageSize: 10 });
    expect(screen.getByText("Maria Santos")).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("offers the cycles that the API sends in the cycle filter, and reads no register", async () => {
    await renderContent();

    expect(await cycleChoices()).toEqual(["All cycles", "CY2026-Q4"]);
    expect(getReviewCycles).not.toHaveBeenCalled();
  });

  it("keeps a way to clear a chosen cycle that has no row for the caller", async () => {
    await renderContent({ cycleId: DRAFT_ID });

    expect(await cycleChoices()).toEqual(["All cycles", "CY2026-Q4", "Selected cycle"]);
  });
});

describe("ReviewsContent for anyone else", () => {
  it.each(["MANAGER", "USER"])("keeps the cycle filter of a %s, and drops the cycle state of the URL", async (role) => {
    getCurrentUser.mockResolvedValue({ role });

    await renderContent({ cycleId: CYCLE_ID, cycleState: "completed", perspective: "self" });

    expect(getReviewCycles).not.toHaveBeenCalled();
    expect(getReviews).toHaveBeenCalledWith({ cycleId: CYCLE_ID, perspective: "self", page: 1, pageSize: 10 });
    expect(screen.getByRole("combobox", { name: /^review cycle$/i })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: /cycle state/i })).toBeNull();
    const words = role === "MANAGER" ? "the reviews about you, and the reviews of your team" : "and the reviews about you";
    expect(screen.getByText(new RegExp(`you answer,? ${words}, in active and completed cycles`))).toBeTruthy();
  });
});

describe("ReviewsContent when there is nothing to show", () => {
  it("says the session ended, and reads nothing, without a user", async () => {
    getCurrentUser.mockResolvedValue(null);

    await renderContent();

    expect(screen.getByText("Session ended")).toBeTruthy();
    expect(getReviews).not.toHaveBeenCalled();
    expect(getReviewCycles).not.toHaveBeenCalled();
  });

  it("shows the notice of a read that failed", async () => {
    getReviews.mockResolvedValue({ kind: "forbidden" });

    await renderContent();

    expect(screen.getByText("No company on your account")).toBeTruthy();
  });

  it.each([
    [{ page: "9", pageSize: "20", state: "locked" }, pageOf([], 45, 9, 20), "/reviews?state=locked&page=3&pageSize=20"],
    [{ page: "3" }, pageOf([], 8, 3), "/reviews"],
  ])("sends a page past the end to the last page", async (raw, result, href) => {
    getReviews.mockResolvedValue(result);

    await renderContent(raw);

    expect(redirect).toHaveBeenCalledWith(href);
  });

  it("stays on page 1 when there is no row at all", async () => {
    getReviews.mockResolvedValue(pageOf([], 0));

    await renderContent();

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByText("No review assignments yet.")).toBeTruthy();
  });
});

describe("ReviewsPage", () => {
  it("shows the heading, and a loading table while the list is read", () => {
    render(<ReviewsPage searchParams={new Promise(() => {})} />);

    expect(screen.getByRole("heading", { name: "Reviews" })).toBeTruthy();
    expect(screen.getByRole("table").getAttribute("aria-busy")).toBe("true");
  });
});
