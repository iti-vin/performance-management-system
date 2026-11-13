"use client";

import { Menu } from "@base-ui/react/menu";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/molecules/confirmation-dialog";
import { ThemeToggle } from "@/components/molecules/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { WORKSPACE_TIME_ZONE } from "@/layouts/workspace-clock";

interface WorkspaceAccountMenuProps {
  name: string;
  firstName: string;
  email?: string | null;
  placement?: "header" | "sidebar";
  avatarSrc?: string;
  onProfile?: () => void;
  onAccountSettings?: () => void;
  onLogout?: () => void;
}

const itemClass =
  "flex min-h-pms-touch items-center gap-2 rounded-pms-control px-2 text-pms-label outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:cursor-not-allowed data-disabled:text-muted-foreground";

export function WorkspaceAccountMenu({
  name,
  firstName,
  email,
  placement = "header",
  avatarSrc,
  onProfile,
  onAccountSettings,
  onLogout,
}: WorkspaceAccountMenuProps) {
  const [today, setToday] = useState<TZDate | null>(null);
  const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  const avatar = (
    <Avatar aria-hidden="true">
      {avatarSrc && <AvatarImage src={avatarSrc} alt={`Photo of ${name}`} />}
      <AvatarFallback className="text-pms-label">{initials}</AvatarFallback>
    </Avatar>
  );

  function confirmLogout() {
    setIsLogoutConfirmationOpen(false);
    onLogout?.();
  }

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open && placement === "sidebar") {
          setToday(new TZDate(Date.now(), WORKSPACE_TIME_ZONE));
        }
      }}
    >
      <Menu.Trigger
        aria-label={`Account menu for ${name}`}
        render={
          <Button
            type="button"
            variant="plain"
            className={
              placement === "sidebar"
                ? "group/account min-h-pms-touch w-full justify-start gap-2 rounded-pms-control px-2 [&>svg:last-child]:ms-auto"
                : "group/account min-h-pms-touch gap-2 rounded-pms-control px-2"
            }
          />
        }
      >
        {avatar}
        <span className="text-pms-label">Hello, {firstName}!</span>
        <ChevronDown
          aria-hidden="true"
          className="size-pms-icon-inline motion-safe:transition-transform group-aria-expanded/account:rotate-180"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side={placement === "sidebar" ? "top" : "bottom"}
          align="end"
          sideOffset={8}
          className="z-50"
        >
          <Menu.Popup
            aria-label="Account actions"
            className="w-56 max-w-(--available-width) origin-(--transform-origin) rounded-pms-overlay border border-border bg-popover p-1 text-popover-foreground shadow-pms-float duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:ease-out data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:ease-in motion-reduce:animate-none"
          >
            <div className="grid min-w-0 px-2 py-2 text-start">
              <span className="wrap-break-word text-pms-label font-semibold">
                {name}
              </span>
              {email && (
                <span className="wrap-break-word text-pms-label font-normal text-muted-foreground">
                  {email}
                </span>
              )}
            </div>
            {placement === "sidebar" && today && (
              <>
                <Menu.Separator className="my-1 border-t border-border" />
                <div className="grid px-2 py-2 text-start">
                  <span className="text-pms-label font-normal text-muted-foreground">
                    Today
                  </span>
                  <time
                    dateTime={format(today, "yyyy-MM-dd")}
                    className="text-pms-table font-semibold"
                  >
                    {format(today, "EEEE, MMM d")}
                  </time>
                </div>
              </>
            )}
            <Menu.Separator className="my-1 border-t border-border" />
            <div className="flex min-h-pms-touch items-center justify-between gap-2 px-2 text-pms-label">
              Theme
              <ThemeToggle />
            </div>
            <Menu.Separator className="my-1 border-t border-border" />
            <Menu.Item
              className={itemClass}
              disabled={!onProfile}
              onClick={onProfile}
            >
              <UserRound aria-hidden="true" className="size-pms-icon-inline" />
              Profile
            </Menu.Item>
            <Menu.Item
              className={itemClass}
              disabled={!onAccountSettings}
              onClick={onAccountSettings}
            >
              <Settings aria-hidden="true" className="size-pms-icon-inline" />
              Account settings
            </Menu.Item>
            <Menu.Separator className="my-1 border-t border-border" />
            <Menu.Item
              className={itemClass}
              disabled={!onLogout}
              onClick={() => setIsLogoutConfirmationOpen(true)}
            >
              <LogOut aria-hidden="true" className="size-pms-icon-inline" />
              Log out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
      <ConfirmationDialog
        open={isLogoutConfirmationOpen}
        title="Log out?"
        description="You’ll need to log in again to access your workspace."
        confirmLabel="Log out"
        onClose={() => setIsLogoutConfirmationOpen(false)}
        onConfirm={confirmLogout}
      />
    </Menu.Root>
  );
}
