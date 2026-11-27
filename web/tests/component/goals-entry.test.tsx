import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoalsContent } from "@/app/(workspace)/goals/goals-content";
import { accomplishmentDetail, accomplishmentRow, guid } from "../utils/accomplishment";

const { getCurrentUser, getAccomplishments, getAccomplishment, push, notFound } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccomplishments: vi.fn(),
  getAccomplishment: vi.fn(),
  push: vi.fn(),
  notFound: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), notFound }));
vi.mock("@/features/auth/services/current-user", () => ({ getCurrentUser }));
vi.mock("@/features/position-goals/services/accomplishment-reader", () => ({ getAccomplishments, getAccomplishment }));
vi.mock("@/features/position-goals/services/accomplishment-response", () => ({
  saveAccomplishment: async () => ({ message: null, fieldErrors: {} }),
  submitAccomplishment: async () => ({ message: null, fieldErrors: {} }),
  decideAccomplishment: async () => ({ message: null, fieldErrors: {} }),
}));

const OLD = accomplishmentRow({ accomplishmentId: guid(172), cycleName: "Old cycle", cycleState: "completed", status: "verified" });
const NOW = accomplishmentRow({ accomplishmentId: guid(171), cycleName: "This cycle", cycleState: "active" });

async function open(rows = [OLD, NOW], search: Record<string, string> = {}, role = "USER") {
  getCurrentUser.mockResolvedValue({ role });
  getAccomplishments.mockResolvedValue({ kind: "ok", data: rows });
  render(<>{await GoalsContent({ searchParams: Promise.resolve(search) })}</>);
}
const choice = () => screen.queryByRole("combobox", { name: "Review Cycle" });

beforeEach(() => {
  for (const mock of [getCurrentUser, getAccomplishments, getAccomplishment, push, notFound]) mock.mockReset();
  getAccomplishment.mockImplementation(async (id: string) => ({ kind: "ok", data: accomplishmentDetail({ accomplishmentId: id }) }));
});

describe("the Goals entry of an employee", () => {
  it("opens the record of the active cycle, with a Review Cycle choice and no way back", async () => {
    await open();

    expect(getAccomplishment).toHaveBeenCalledWith(NOW.accomplishmentId);
    expect(choice()).toHaveTextContent("This cycle · Draft");
    expect(screen.queryByRole("button", { name: "Back to Goals" })).toBeNull();
    expect(screen.queryByRole("table", { name: "Your reports" })).toBeNull();
  });

  it("goes to the record of the cycle that the employee chooses", async () => {
    const user = userEvent.setup();
    await open();

    await user.click(choice() as HTMLElement);
    await user.click(await screen.findByRole("option", { name: "Old cycle · Verified" }));

    expect(push).toHaveBeenCalledWith(`/goals?record=${OLD.accomplishmentId}`);
  });

  it.each([
    ["their own record of the address", OLD.accomplishmentId, OLD.accomplishmentId],
    ["the default for a record that is not theirs", guid(999), NOW.accomplishmentId],
  ])("shows %s", async (_what, record, shown) => {
    await open([OLD, NOW], { record });

    expect(getAccomplishment).toHaveBeenCalledWith(shown);
  });

  it("asks before it drops what the employee typed", async () => {
    const user = userEvent.setup();
    await open();
    await user.type(screen.getByRole("textbox", { name: /^Remarks \(optional\)$/ }), "Not saved yet");

    await user.click(choice() as HTMLElement);
    await user.click(await screen.findByRole("option", { name: "Old cycle · Verified" }));

    expect(push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /leave|discard/i }));
    expect(push).toHaveBeenCalledWith(`/goals?record=${OLD.accomplishmentId}`);
  });

  const report = (n: number, status: "draft" | "returned" | "submitted", cycleState: "active" | "completed" = "active") =>
    accomplishmentRow({ accomplishmentId: guid(n), cycleName: `Cycle ${n}`, status, cycleState });

  it.each([
    ["a returned report before a draft", [report(181, "submitted"), report(182, "draft"), report(183, "returned")], 183],
    ["a draft before a report that waits for the manager", [report(181, "submitted"), report(182, "draft")], 182],
    ["no returned report of a finished cycle", [report(181, "returned", "completed"), report(182, "submitted")], 182],
  ])("opens first what waits for the employee: %s", async (_what, rows, shown) => {
    await open(rows);

    expect(getAccomplishment).toHaveBeenCalledWith(guid(shown));
  });

  it("offers no choice for one report", async () => {
    await open([NOW]);

    expect(getAccomplishment).toHaveBeenCalledWith(NOW.accomplishmentId);
    expect(choice()).toBeNull();
  });

  it.each([
    ["an employee who also reads a team", "USER", [NOW, accomplishmentRow({ accomplishmentId: guid(173), isOwn: false })]],
    ["a manager", "MANAGER", [NOW]],
  ])("keeps the list for %s", async (_what, role, rows) => {
    await open(rows, {}, role);

    expect(getAccomplishment).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Your reports" })).toBeTruthy();
  });
});
