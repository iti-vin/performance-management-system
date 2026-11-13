import type { RoleCode } from "@pms/shared-types";

import type { WorkspaceRole } from "@/types/role";

/** Which menu each role of public.user_role sees. */
export const WORKSPACE_ROLE_BY_CODE = {
  ADMIN: "hr",
  MANAGER: "manager",
  USER: "employee",
} as const satisfies Record<RoleCode, WorkspaceRole>;

export const WORKSPACE_ROLE_LABELS = {
  employee: "Employee",
  manager: "Manager",
  hr: "HR Administrator",
} satisfies Record<WorkspaceRole, string>;

export interface WorkspaceNavigationItem {
  label: string;
  icon:
    | "dashboard"
    | "goals"
    | "reviews"
    | "people"
    | "files"
    | "pip"
    | "reports"
    | "templates"
    | "cycles";
  href?: string;
  children?: readonly WorkspaceNavigationItem[];
}

interface WorkspaceNavigationGroup {
  label?: string;
  items: readonly WorkspaceNavigationItem[];
}

const DASHBOARD: WorkspaceNavigationItem = {
  label: "Dashboard",
  icon: "dashboard",
  href: "/",
};
const MY_TEAM: WorkspaceNavigationItem = {
  label: "My Team",
  icon: "people",
  href: "/my-team",
};
const GOALS: WorkspaceNavigationItem = {
  label: "Goals",
  icon: "goals",
  href: "/goals",
};
const REVIEWS: WorkspaceNavigationItem = {
  label: "Reviews",
  icon: "reviews",
  href: "/reviews",
};
const FILES: WorkspaceNavigationItem = {
  label: "202 Files",
  icon: "files",
  href: "/202-files",
};
const PIP: WorkspaceNavigationItem = {
  label: "PIP",
  icon: "pip",
  href: "/pip",
};
const REPORTS: WorkspaceNavigationItem = {
  label: "Reports",
  icon: "reports",
  href: "/reports",
};

const REVIEW_SETUP: WorkspaceNavigationItem = {
  label: "Reviews",
  icon: "reviews",
  children: [
    { label: "All Reviews", icon: "reviews", href: "/reviews" },
    {
      label: "Templates",
      icon: "templates",
      children: [
        {
          label: "KPI Goal Template",
          icon: "goals",
          href: "/reviews/templates/kpi-goal-template",
        },
        {
          label: "Behavioral Assessment Template",
          icon: "reviews",
          href: "/reviews/templates/behavioral-assessment-template",
        },
      ],
    },
    { label: "Cycles", icon: "cycles", href: "/review-cycles" },
  ],
};
const ADMINISTRATION: WorkspaceNavigationGroup = {
  label: "Management",
  items: [
    FILES,
    PIP,
    REPORTS,
    { label: "Employees", icon: "people", href: "/employees" },
  ],
};

export const WORKSPACE_NAVIGATION: Record<
  WorkspaceRole,
  readonly WorkspaceNavigationGroup[]
> = {
  employee: [{ items: [DASHBOARD, GOALS, REVIEWS, FILES, PIP] }],
  manager: [
    {
      items: [DASHBOARD, MY_TEAM, GOALS, REVIEWS, FILES, PIP, REPORTS],
    },
  ],
  hr: [
    { label: "Workspace", items: [DASHBOARD, REVIEW_SETUP] },
    ADMINISTRATION,
  ],
};
