"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";

import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardCheck,
  FolderOpen,
  Files,
  LayoutDashboard,
  ListChecks,
  PanelLeft,
  Target,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { startTransition, useState } from "react";
import { useStore } from "zustand";
import fullLogo from "../../public/assets/hrdotnet-logo-full.png";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import type { WorkspaceNavigationItem } from "@/constants/workspace-navigation";
import { WORKSPACE_NAVIGATION } from "@/constants/workspace-navigation";
import { signOut } from "@/features/auth/services/sign-out";
import { useIsMobile } from "@/hooks/use-mobile";
import { WorkspaceAccountMenu } from "@/layouts/workspace-account-menu";
import { WorkspaceClock } from "@/layouts/workspace-clock";
import { createWorkspaceStore } from "@/stores/workspace-store";
import type { WorkspaceRole } from "@/types/role";

const NAVIGATION_ICONS = {
  dashboard: LayoutDashboard,
  goals: Target,
  reviews: ClipboardCheck,
  people: Users,
  files: FolderOpen,
  pip: ListChecks,
  reports: ChartNoAxesCombined,
  templates: Files,
  cycles: CalendarDays,
};

function WorkspaceNavigationEntry({
  item,
  pathname,
  onNavigate,
  nested = false,
}: {
  item: WorkspaceNavigationItem;
  pathname: string;
  onNavigate: () => void;
  nested?: boolean;
}) {
  const { isMobile, state, setOpen } = useSidebar();
  const [expanded, setExpanded] = useState<boolean>();
  const Icon = NAVIGATION_ICONS[item.icon];
  const isCurrent = pathname === item.href;
  const isActive = matchesNavigationItem(item, pathname);
  const label = (
    <span className="min-w-0 origin-left flex-1 whitespace-normal wrap-break-word transition-[opacity,scale] delay-75 duration-(--pms-motion-disclosure) ease-pms-enter motion-reduce:transition-none group-data-[collapsible=icon]:scale-95 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-ms-2 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:delay-0 group-data-[collapsible=icon]:whitespace-nowrap">
      {item.label}
    </span>
  );
  // The label stays in the layout in both states and the button clips it, as in
  // the shadcn sidebar. The row takes its final size at once (transition-none):
  // the sidebar container animates the width. A top-level row starts its icon
  // where the collapsed rail centers it, so the icon does not move.
  const rowClass =
    "h-auto min-h-pms-touch rounded-pms-control text-pms-label font-normal transition-none [&>span:last-child]:text-clip group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center" +
    (nested ? "" : " ps-3.5");

  if (item.children) {
    const isRail = !isMobile && state === "collapsed";
    const isExpanded = !isRail && (expanded ?? isActive);

    return (
      <SidebarMenuItem>
        <AccordionPrimitive.Root
          value={isExpanded ? [item.label] : []}
          onValueChange={(value) => {
            if (isRail) setOpen(true);
            setExpanded(value.includes(item.label));
          }}
        >
          <AccordionPrimitive.Item value={item.label}>
            <AccordionPrimitive.Header className="flex">
              <SidebarMenuButton
                tooltip={item.label}
                aria-label={item.label}
                className={rowClass + " aria-expanded:bg-sidebar-accent"}
                render={<AccordionPrimitive.Trigger />}
              >
                <Icon aria-hidden="true" />
                {label}
                <ChevronDown
                  aria-hidden="true"
                  className="text-current motion-safe:transition-transform group-aria-expanded/menu-button:rotate-180 group-data-[collapsible=icon]:hidden"
                />
              </SidebarMenuButton>
            </AccordionPrimitive.Header>
            {/* The rail shows icons only: unmount the children there instead of
                waiting for the close animation, which would leave them over the rail. */}
            {!isRail && (
              <AccordionPrimitive.Panel className="overflow-hidden data-open:animate-[accordion-down_var(--pms-motion-disclosure)_var(--ease-pms-enter)] data-closed:animate-[accordion-up_var(--pms-motion-disclosure)_var(--ease-pms-enter)]">
                <SidebarMenu className="ms-3 mt-1 w-auto gap-1 border-s border-sidebar-border ps-2">
                  {item.children.map((child) => (
                    <WorkspaceNavigationEntry
                      key={child.label}
                      item={child}
                      pathname={pathname}
                      onNavigate={onNavigate}
                      nested
                    />
                  ))}
                </SidebarMenu>
              </AccordionPrimitive.Panel>
            )}
          </AccordionPrimitive.Item>
        </AccordionPrimitive.Root>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      {item.href ? (
        <SidebarMenuButton
          isActive={isActive}
          tooltip={item.label}
          aria-label={item.label}
          className={rowClass}
          render={
            <Link
              href={item.href}
              aria-current={isCurrent ? "page" : undefined}
              onNavigate={onNavigate}
            />
          }
        >
          <Icon aria-hidden="true" />
          {label}
        </SidebarMenuButton>
      ) : (
        <span
          aria-disabled="true"
          className="flex min-h-pms-touch items-center gap-2 rounded-pms-control px-2 text-pms-label font-normal text-muted-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Icon aria-hidden="true" className="size-pms-icon-inline shrink-0" />
          {label}
          <span className="sr-only"> (coming soon)</span>
        </span>
      )}
    </SidebarMenuItem>
  );
}

function matchesNavigationItem(
  item: WorkspaceNavigationItem,
  pathname: string,
): boolean {
  if (item.children) {
    return item.children.some((child) =>
      matchesNavigationItem(child, pathname),
    );
  }

  return Boolean(
    item.href &&
    (pathname === item.href ||
      (item.href !== "/" &&
        item.href !== "/reviews" &&
        pathname.startsWith(item.href + "/"))),
  );
}

function WorkspaceSidebar({
  role,
  mobileAccountMenu,
}: {
  role: WorkspaceRole;
  mobileAccountMenu: ReactNode;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileSidebar() {
    setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="relative min-h-pms-header flex-row items-center justify-between gap-2 border-b lg:h-pms-header lg:px-3 lg:py-0 group-data-[collapsible=icon]:grid group-data-[collapsible=icon]:grid-cols-1 group-data-[collapsible=icon]:place-items-center lg:group-data-[collapsible=icon]:px-0">
        <div className="min-w-0 flex-1 max-lg:max-w-34 group-data-[collapsible=icon]:hidden lg:relative lg:self-stretch lg:overflow-hidden">
          <Image
            src={fullLogo}
            alt="HRDotNet Performance"
            loading="eager"
            fetchPriority="high"
            sizes="(width < 64rem) 8.5rem, 11.25rem"
            className="block h-auto w-full lg:absolute lg:top-1/2 lg:-translate-y-1/2"
          />
        </div>
        <WorkspaceSidebarToggle placement="header" />
        <WorkspaceSidebarToggle placement="rail" />
        {isMobile && (
          <Button
            type="button"
            variant="plain"
            size="icon"
            aria-label="Collapse navigation"
            className="min-h-pms-touch min-w-pms-touch shrink-0"
            onClick={closeMobileSidebar}
          >
            <PanelLeft aria-hidden="true" />
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Workspace navigation" className="grid gap-2 py-2">
          {WORKSPACE_NAVIGATION[role].map((group) => (
            <SidebarGroup
              key={group.label ?? group.items[0]?.label}
              className="py-0"
            >
              {group.label && (
                <SidebarGroupLabel className="text-pms-label text-muted-foreground group-data-[collapsible=icon]:pointer-events-none">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {group.items.map((item) => (
                    <WorkspaceNavigationEntry
                      key={item.label}
                      item={item}
                      pathname={pathname}
                      onNavigate={closeMobileSidebar}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
      {isMobile && (
        <SidebarFooter className="border-t border-sidebar-border">
          {mobileAccountMenu}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

function WorkspaceSidebarToggle({
  placement,
}: {
  placement: "header" | "rail";
}) {
  const { open, setOpen } = useSidebar();
  const isHeader = placement === "header";

  if (open !== isHeader) {
    return null;
  }

  function toggleSidebar() {
    const nextPlacement = isHeader ? "rail" : "header";
    setOpen(!open);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(
          `[data-workspace-sidebar-toggle="${nextPlacement}"]`,
        )
        ?.focus();
    });
  }

  return (
    <Button
      type="button"
      variant="plain"
      size="icon"
      aria-label={isHeader ? "Collapse sidebar" : "Expand sidebar"}
      aria-expanded={open}
      data-workspace-sidebar-toggle={placement}
      className="hidden min-h-pms-touch min-w-pms-touch shrink-0 lg:inline-flex"
      onClick={toggleSidebar}
    >
      {isHeader ? (
        <PanelLeft aria-hidden="true" />
      ) : (
        <Image
          src="/assets/hrdotnet-logo-only.png"
          alt="HRDotNet icon"
          width={844}
          height={865}
          sizes="2rem"
          className="size-8 object-contain"
        />
      )}
    </Button>
  );
}

interface WorkspaceLayoutProps {
  children: ReactNode;
  role: WorkspaceRole;
  departmentName: string;
  accountName: string;
  firstName: string;
  accountEmail?: string | null;
  /** True while the session data loads: the header shows skeletons. */
  isLoading?: boolean;
}

export function WorkspaceLayout({
  children,
  role,
  departmentName,
  accountName,
  firstName,
  accountEmail,
  isLoading = false,
}: WorkspaceLayoutProps) {
  const departmentLabel = departmentName.trim().replace(/\s+Department$/i, "");
  const isMobile = useIsMobile();
  const [store] = useState(createWorkspaceStore);
  const isSidebarOpen = useStore(store, (state) => state.isSidebarOpen);
  const setSidebarOpen = useStore(store, (state) => state.setSidebarOpen);
  const accountMenuProps = {
    name: accountName,
    firstName,
    email: accountEmail,
    onLogout: () => startTransition(signOut),
  };

  return (
    <SidebarProvider
      enableKeyboardShortcut={false}
      open={isSidebarOpen}
      onOpenChange={setSidebarOpen}
    >
      <WorkspaceSidebar
        role={role}
        mobileAccountMenu={
          <WorkspaceAccountMenu {...accountMenuProps} placement="sidebar" />
        }
      />
      <SidebarInset className="min-w-0">
        <header className="grid min-h-pms-header grid-cols-[var(--spacing-pms-touch)_minmax(0,1fr)_var(--spacing-pms-touch)] items-center gap-2 border-b px-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="col-start-1 row-start-1 lg:hidden">
            <SidebarTrigger
              aria-label="Open navigation"
              variant="plain"
              className="min-h-pms-touch min-w-pms-touch lg:hidden"
            >
              <Image
                src="/assets/hrdotnet-logo-only.png"
                alt="HRDotNet icon"
                width={844}
                height={865}
                sizes="2rem"
                className="size-8 object-contain"
              />
            </SidebarTrigger>
          </div>
          {isLoading ? (
            <div className="col-start-2 row-start-1 flex justify-center lg:col-start-1 lg:justify-start">
              <Skeleton aria-hidden="true" className="h-[1lh] w-40 text-pms-label" />
            </div>
          ) : (
            <span className="col-start-2 row-start-1 min-w-0 wrap-break-word text-center text-pms-label font-semibold lg:col-start-1 lg:text-start">
              {departmentLabel} Department
            </span>
          )}
          <WorkspaceClock />
          <div className="col-start-3 row-start-1 flex items-center justify-end gap-1">
            <Popover>
              <PopoverTrigger
                aria-label="Notifications"
                render={
                  <Button
                    type="button"
                    variant="plain"
                    size="icon"
                    className="min-h-pms-touch min-w-pms-touch"
                  />
                }
              >
                <Bell aria-hidden="true" className="size-pms-icon-control" />
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="max-w-(--available-width) rounded-pms-overlay p-3"
              >
                <PopoverTitle className="text-pms-section-title">
                  Notifications
                </PopoverTitle>
                <p className="text-pms-label text-muted-foreground">
                  Notifications will appear here once connected.
                </p>
              </PopoverContent>
            </Popover>
            {!isMobile && (
              <div className="hidden lg:block">
                {isLoading ? (
                  <div
                    aria-hidden="true"
                    className="flex min-h-pms-touch items-center gap-2 px-2"
                  >
                    <Skeleton className="size-8 rounded-full" />
                    <Skeleton className="h-[1lh] w-24 text-pms-label" />
                  </div>
                ) : (
                  <WorkspaceAccountMenu {...accountMenuProps} />
                )}
              </div>
            )}
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
