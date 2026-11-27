import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateCycleAction } from "@/app/(workspace)/review-cycles/create-cycle-action";
import ReviewCyclesPage from "@/app/(workspace)/review-cycles/page";

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/auth/services/current-user", () => ({ getCurrentUser }));

const link = () => screen.queryByRole("link", { name: "Create Cycle" });
const renderAction = async () => render(<>{await CreateCycleAction()}</>);

beforeEach(() => {
  getCurrentUser.mockReset().mockReturnValue(new Promise(() => {}));
});

describe("CreateCycleAction", () => {
  it("offers Create Cycle to an HR administrator", async () => {
    getCurrentUser.mockResolvedValue({ role: "ADMIN" });

    await renderAction();

    expect(link()).toHaveAttribute("href", "/review-cycles/new");
  });

  it.each([{ role: "MANAGER" }, { role: "USER" }, null])("offers nothing to %o", async (user) => {
    getCurrentUser.mockResolvedValue(user);

    await renderAction();

    expect(link()).toBeNull();
  });

  it("shows no button on the register before the role is known", () => {
    render(<ReviewCyclesPage searchParams={new Promise(() => {})} />);

    expect(link()).toBeNull();
  });
});
