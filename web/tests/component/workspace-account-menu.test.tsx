import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { WorkspaceAccountMenu } from "@/layouts/workspace-account-menu";
import { WorkspaceLayout } from "@/layouts/workspace-layout";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

afterEach(() => vi.useRealTimers());

it("removes the open desktop account menu when the viewport switches to mobile", async () => {
  const user = userEvent.setup();
  const listeners = new EventTarget();
  const desktopQuery = window.matchMedia("(width < 1024px)");
  let isMobile = false;
  const mobileQuery: MediaQueryList = {
    ...desktopQuery,
    get matches() {
      return isMobile;
    },
    addEventListener: listeners.addEventListener.bind(listeners),
    removeEventListener: listeners.removeEventListener.bind(listeners),
  };
  const matchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === "(width < 1024px)" ? mobileQuery : matchMedia(query),
  );

  render(
    <WorkspaceLayout
      role="employee"
      departmentName="HR"
      accountName="Iging UserDotTech"
      firstName="Iging"
    >
      <main>Workspace</main>
    </WorkspaceLayout>,
  );
  const trigger = screen.getByRole("button", {
    name: "Account menu for Iging UserDotTech",
  });
  await user.click(trigger);
  const menu = await screen.findByRole("menu", { name: "Account actions" });

  act(() => {
    isMobile = true;
    listeners.dispatchEvent(new Event("change"));
  });

  expect(menu).not.toBeInTheDocument();
  expect(trigger).not.toBeInTheDocument();

  act(() => {
    isMobile = false;
    listeners.dispatchEvent(new Event("change"));
  });

  expect(screen.getByRole("button", { name: "Account menu for Iging UserDotTech" }))
    .toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("menu", { name: "Account actions" }))
    .not.toBeInTheDocument();
});

it("shows the account identity and the current Manila date in the menu", async () => {
  vi.setSystemTime(new Date("2026-11-12T16:30:00Z"));
  const user = userEvent.setup();

  render(
    <WorkspaceAccountMenu
      name="Iging UserDotTech"
      firstName="Iging"
      email="iging@example.com"
      placement="sidebar"
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "Account menu for Iging UserDotTech" }),
  );

  const menu = await screen.findByRole("menu", { name: "Account actions" });
  expect(menu).toHaveTextContent(
    /Iging UserDotTech\s*iging@example\.com\s*Today\s*Friday, Nov 13/,
  );
  expect(within(menu).getByText("Friday, Nov 13")).toHaveAttribute(
    "datetime",
    "2026-11-13",
  );
  const [beforeToday, afterToday] = within(menu).getAllByRole("separator");
  expect(beforeToday?.previousElementSibling).toHaveTextContent(
    "iging@example.com",
  );
  expect(beforeToday?.nextElementSibling).toHaveTextContent("Today");
  expect(afterToday?.nextElementSibling).toHaveTextContent("Theme");
  expect(within(menu).queryByText("IU")).not.toBeInTheDocument();
  expect(menu).not.toHaveTextContent(/Employee|ITI-003/);
});

it("omits Today from the desktop account menu", async () => {
  const user = userEvent.setup();
  render(<WorkspaceAccountMenu name="Iging UserDotTech" firstName="Iging" />);

  const trigger = screen.getByRole("button", {
    name: "Account menu for Iging UserDotTech",
  });
  await user.click(trigger);

  const menu = await screen.findByRole("menu", { name: "Account actions" });
  expect(within(menu).queryByText("Today")).not.toBeInTheDocument();
  expect(menu).toHaveClass(
    "data-open:animate-in",
    "data-closed:animate-out",
    "data-[side=bottom]:slide-in-from-top-2",
  );
  expect(within(menu).getAllByRole("separator")).toHaveLength(3);
});

it("logs out only after the user confirms", async () => {
  const user = userEvent.setup();
  const onLogout = vi.fn();
  render(
    <WorkspaceAccountMenu
      name="Iging UserDotTech"
      firstName="Iging"
      onLogout={onLogout}
    />,
  );
  const trigger = screen.getByRole("button", {
    name: "Account menu for Iging UserDotTech",
  });

  await user.click(trigger);
  await user.click(await screen.findByRole("menuitem", { name: "Log out" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Log out?" });
  expect(onLogout).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(onLogout).not.toHaveBeenCalled();

  await user.click(trigger);
  await user.click(await screen.findByRole("menuitem", { name: "Log out" }));
  const reopenedDialog = await screen.findByRole("alertdialog", {
    name: "Log out?",
  });
  await user.click(
    within(reopenedDialog).getByRole("button", { name: "Log out" }),
  );
  expect(onLogout).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(reopenedDialog).not.toBeInTheDocument());
});
