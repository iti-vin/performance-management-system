import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoalTemplateListing } from "@/features/review-templates/components/goal-template-listing";
import {
  DEFAULT_GOAL_TEMPLATE_PARAMS,
  type GoalTemplateListParams,
} from "@/features/review-templates/services/goal-template-selection";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const PATH = "/reviews/templates/kpi-goal-template";
const ROW = {
  templateId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  position: "Software Engineer",
  company: "Mayon Consolidated Inc.",
  name: "Software Engineer Performance Goals",
  description: null,
  status: "published" as const,
  currentVersion: 1,
  publishedBy: null,
  publishedAt: null,
  archivedAt: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-05T00:00:00.000Z",
  indicatorCount: 3,
};

function renderListing(params: Partial<GoalTemplateListParams> = {}, total = 30) {
  const merged = { ...DEFAULT_GOAL_TEMPLATE_PARAMS, ...params };
  render(
    <GoalTemplateListing rows={[ROW]} total={total} page={merged.page} params={merged} />,
  );
}

beforeEach(() => replace.mockReset());

describe("GoalTemplateListing", () => {
  it("shows the position, its version, the indicator count, and the status as words", () => {
    renderListing();

    expect(screen.getByRole("link", { name: /Software Engineer Performance Goals/ }).getAttribute("href")).toBe(
      `${PATH}/${ROW.templateId}`,
    );
    expect(screen.getByText("Version 1")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(within(screen.getByRole("table")).getByText("Published")).toBeTruthy();
  });

  it("names the row by the template name, with the position in its own column", () => {
    renderListing();

    const row = within(screen.getByRole("row", { name: /Software Engineer Performance Goals/ }));
    expect(row.getByRole("link", { name: /Software Engineer Performance Goals/ })).toBeTruthy();
    expect(row.getByText("Software Engineer")).toBeTruthy();
  });

  it("lets a long column heading wrap, so it never covers the next one", () => {
    renderListing();

    // The columns have fixed widths, and the shared table header does not wrap by itself.
    expect(screen.getByRole("table").closest("[class*='table-fixed']")?.className).toContain("[&_th]:whitespace-normal");
  });

  it("falls back to the position title for an older template with no name", () => {
    render(
      <GoalTemplateListing
        rows={[{ ...ROW, name: null }]}
        total={1}
        page={1}
        params={DEFAULT_GOAL_TEMPLATE_PARAMS}
      />,
    );

    expect(screen.getByRole("link", { name: /Software Engineer/ })).toBeTruthy();
  });

  it("puts the tab in the URL and goes back to page 1", async () => {
    renderListing({ page: 2 });

    await userEvent.setup().click(screen.getByRole("tab", { name: "Draft" }));

    expect(replace).toHaveBeenLastCalledWith(`${PATH}?tab=draft`, { scroll: false });
  });

  it("puts the page in the URL and keeps the other filters", async () => {
    renderListing({ tab: "published", q: "eng" });

    await userEvent.setup().click(screen.getByRole("button", { name: /next/i }));

    expect(replace).toHaveBeenLastCalledWith(`${PATH}?tab=published&q=eng&page=2`, {
      scroll: false,
    });
  });

  it("waits for a pause in typing before it searches, and goes back to page 1", async () => {
    renderListing({ page: 2 });

    await userEvent.setup().type(screen.getByRole("searchbox"), "eng");

    expect(replace).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`${PATH}?q=eng`, { scroll: false }),
    );
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("clears the search and the status together", async () => {
    renderListing({ status: "archived", q: "eng" });

    await userEvent.setup().click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => expect(replace).toHaveBeenLastCalledWith(PATH, { scroll: false }));
  });

  it("says no records match when a filter leaves nothing", () => {
    render(
      <GoalTemplateListing
        rows={[]}
        total={0}
        page={1}
        params={{ ...DEFAULT_GOAL_TEMPLATE_PARAMS, q: "zzz" }}
      />,
    );

    expect(screen.getByText("No records match these filters.")).toBeTruthy();
  });

  it("shows the status filter on the All tab only", () => {
    renderListing();
    expect(screen.getByRole("combobox", { name: /status/i })).toBeTruthy();
  });

  it("offers every status in the filter, Archived included", async () => {
    renderListing();

    await userEvent.setup().click(screen.getByRole("combobox", { name: /status/i }));

    const options = await screen.findAllByRole("option");

    expect(options.map((option) => option.textContent)).toEqual([
      "All statuses",
      "Draft",
      "Published",
      "Archived",
    ]);
  });

  it("hides the status filter on the Draft and Published tabs", () => {
    renderListing({ tab: "draft" });

    expect(screen.queryByRole("combobox", { name: /status/i })).toBeNull();
  });
});
