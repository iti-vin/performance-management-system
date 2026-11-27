import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoalsContent } from "@/app/(workspace)/goals/goals-content";
import GoalsPage from "@/app/(workspace)/goals/page";
import { accomplishmentRow, guid } from "../utils/accomplishment";

const { getCurrentUser, getAccomplishments } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccomplishments: vi.fn(),
}));
vi.mock("@/features/auth/services/current-user", () => ({ getCurrentUser }));
vi.mock("@/features/position-goals/services/accomplishment-reader", () => ({ getAccomplishments }));

const OWN = accomplishmentRow();
const TEAM_DRAFT = accomplishmentRow({ accomplishmentId: guid(172), employeeName: "Ana Draft", isOwn: false });
const TEAM_WAITING = accomplishmentRow({
  accomplishmentId: guid(173),
  employeeName: "Zed Waiting",
  isOwn: false,
  status: "submitted",
  canDecide: true,
});

async function renderList(role: string, rows = [OWN]) {
  getCurrentUser.mockResolvedValue({ role });
  getAccomplishments.mockResolvedValue({ kind: "ok", data: rows });
  render(<>{await GoalsContent()}</>);
}
const section = (name: string) => screen.getByRole("region", { name });

beforeEach(() => {
  getCurrentUser.mockReset();
  getAccomplishments.mockReset();
});

describe("GoalsContent", () => {
  it("lists the own reports of a manager, each with its state and dates, and a way in", async () => {
    // A manager keeps the list. The entry of an employee is in goals-entry.test.tsx.
    await renderList("MANAGER");

    const own = within(section("Your reports"));
    expect(own.getByRole("link", { name: /ZZ demo/ })).toHaveAttribute("href", `/goals/${OWN.accomplishmentId}`);
    expect(own.getByText("Draft")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Your team" })).toBeNull();
  });

  it("puts the reports that wait for a manager first in the team list, and marks them", async () => {
    await renderList("MANAGER", [OWN, TEAM_DRAFT, TEAM_WAITING]);

    const team = within(section("Your team"));
    const rows = team.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getByRole("link").getAttribute("href"))).toEqual([
      `/goals/${TEAM_WAITING.accomplishmentId}`,
      `/goals/${TEAM_DRAFT.accomplishmentId}`,
    ]);
    expect(within(rows[0] as HTMLElement).getByText("Waiting for you")).toBeTruthy();
    expect(team.getAllByText("Waiting for you")).toHaveLength(1);
    expect(within(section("Your reports")).getAllByRole("link")).toHaveLength(1);
  });

  it("shows an administrator every employee, and no list of their own without one", async () => {
    await renderList("ADMIN", [TEAM_DRAFT]);

    expect(within(section("All employees")).getByRole("link", { name: /Ana Draft/ })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Your reports" })).toBeNull();
  });

  it.each([
    ["USER", "Your reports", "No KPI report yet. One appears when a review cycle with goals starts."],
    ["ADMIN", "All employees", "No KPI reports in this company yet."],
  ])("explains an empty list to %s", async (role, name, message) => {
    await renderList(role, []);

    expect(within(section(name)).getByText(message)).toBeTruthy();
  });

  it("shows the position of each employee and the KPI template of the report", async () => {
    await renderList("MANAGER", [TEAM_DRAFT]);

    const row = within(within(section("Your team")).getAllByRole("row")[1]!);
    // Under the name, and in the Position column.
    expect(row.getAllByText("Software Engineer")).toHaveLength(2);
    expect(row.getByText("Engineer goals")).toBeTruthy();
  });

  it("names an older template by its position, and says Not set where the cycle froze nothing", async () => {
    await renderList("ADMIN", [
      accomplishmentRow({ isOwn: false, kpiTemplateName: null }),
      accomplishmentRow({ accomplishmentId: guid(174), employeeName: "No Facts", isOwn: false, position: null, kpiTemplateName: null, kpiTemplateVersion: null }),
    ]);

    const rows = within(section("All employees")).getAllByRole("row").slice(1);
    expect(within(rows[0] as HTMLElement).getAllByText("Software Engineer")).toHaveLength(3);
    expect(within(rows[1] as HTMLElement).getAllByText("Not set")).toHaveLength(2);
  });

  it("says when a cycle is not active", async () => {
    await renderList("ADMIN", [accomplishmentRow({ isOwn: false, cycleState: "cancelled" })]);

    expect(screen.getByText("Cancelled")).toBeTruthy();
  });

  it.each([
    ["signed_out", "Session ended"],
    ["forbidden", "No company on your account"],
    ["unavailable", "Goals are unavailable"],
  ])("shows a notice and no table when the read says %s", async (kind, title) => {
    getCurrentUser.mockResolvedValue({ role: "USER" });
    getAccomplishments.mockResolvedValue({ kind });
    render(<>{await GoalsContent()}</>);

    expect(screen.getByRole("alert")).toHaveTextContent(title);
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("GoalsPage", () => {
  it("names the page and says that it loads", () => {
    getCurrentUser.mockReturnValue(new Promise(() => {}));
    getAccomplishments.mockReturnValue(new Promise(() => {}));
    render(<GoalsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Goals" })).toBeTruthy();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your goals.");
  });
});
