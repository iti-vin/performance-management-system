import { TEMPLATE_VERSION_STATUSES, type TemplateVersionStatus } from "@pms/shared-types";

/** The KPI Goal Templates list state. It lives in the URL, so a link restores it. */
export const TEMPLATE_TABS = ["all", "draft", "published"] as const;
export type TemplateTab = (typeof TEMPLATE_TABS)[number];

export const TEMPLATE_STATUS_FILTERS = ["all", ...TEMPLATE_VERSION_STATUSES] as const;
export type TemplateStatusFilter = (typeof TEMPLATE_STATUS_FILTERS)[number];

export const TEMPLATE_PAGE_SIZES = [10, 20, 50] as const;
const MAX_QUERY_LENGTH = 100;

export interface GoalTemplateListParams {
  tab: TemplateTab;
  status: TemplateStatusFilter;
  q: string;
  page: number;
  pageSize: number;
}

export const DEFAULT_GOAL_TEMPLATE_PARAMS: GoalTemplateListParams = {
  tab: "all",
  status: "all",
  q: "",
  page: 1,
  pageSize: TEMPLATE_PAGE_SIZES[0],
};

type RawParams = Record<string, string | string[] | undefined>;

function first(raw: RawParams, key: string): string | undefined {
  const value = raw[key];
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<Value extends string>(
  values: readonly Value[],
  value: string | undefined,
  fallback: Value,
): Value {
  return values.find((candidate) => candidate === value) ?? fallback;
}

function toInteger(value: string | undefined): number | null {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : null;
}

/** Reads the URL params. A missing or invalid value becomes its default. */
export function parseGoalTemplateParams(raw: RawParams): GoalTemplateListParams {
  const defaults = DEFAULT_GOAL_TEMPLATE_PARAMS;
  const page = toInteger(first(raw, "page"));
  const pageSize = toInteger(first(raw, "pageSize"));

  return {
    tab: oneOf(TEMPLATE_TABS, first(raw, "tab"), defaults.tab),
    status: oneOf(TEMPLATE_STATUS_FILTERS, first(raw, "status"), defaults.status),
    q: (first(raw, "q") ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    page: page !== null && page >= 1 ? page : defaults.page,
    pageSize:
      TEMPLATE_PAGE_SIZES.find((size) => size === pageSize) ?? defaults.pageSize,
  };
}

interface Selectable {
  status: TemplateVersionStatus;
  /** NULL for a template made before the name column existed. */
  name: string | null;
  position: string | null;
}

/**
 * The rows for the current tab, search, and page. As in the legacy list, the
 * status filter applies on the All tab only, and it is the only way to reach
 * Archived templates. Search matches the template name and the position title.
 */
export function selectGoalTemplates<Item extends Selectable>(
  items: readonly Item[],
  params: GoalTemplateListParams,
) {
  const query = params.q.toLowerCase();
  const matches = items.filter((item) => {
    const statusFilter = params.tab === "all" ? params.status : params.tab;
    return (
      (statusFilter === "all" || item.status === statusFilter) &&
      `${item.name ?? ""} ${item.position ?? ""}`.toLowerCase().includes(query)
    );
  });

  const total = matches.length;
  const pageCount = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * params.pageSize;

  return {
    rows: matches.slice(start, start + params.pageSize),
    total,
    page,
  };
}

/** The URL for these params. A value equal to its default stays out of it. */
export function buildGoalTemplateHref(
  path: string,
  params: GoalTemplateListParams,
): string {
  const defaults = DEFAULT_GOAL_TEMPLATE_PARAMS;
  const search = new URLSearchParams();
  if (params.tab !== defaults.tab) search.set("tab", params.tab);
  if (params.status !== defaults.status) search.set("status", params.status);
  if (params.q !== defaults.q) search.set("q", params.q);
  if (params.page !== defaults.page) search.set("page", String(params.page));
  if (params.pageSize !== defaults.pageSize) {
    search.set("pageSize", String(params.pageSize));
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
