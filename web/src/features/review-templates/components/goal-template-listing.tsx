"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TEMPLATE_VERSION_STATUSES,
  type GoalTemplateListResponseDto,
  type TemplateVersionStatus,
} from "@pms/shared-types";

import { FILTER_ALL, FilterBar } from "@/components/molecules/filter-bar";
import { ListingPagination } from "@/components/molecules/listing-pagination";
import { ListingTabs } from "@/components/molecules/listing-tabs";
import { TEMPLATE_VERSION_STATUS_LABELS } from "@/constants/domain-labels";
import { GoalTemplateList } from "@/features/review-templates/components/goal-template-list";
import { GOAL_TEMPLATE_PATH } from "@/constants/goal-template-path";
import {
  TEMPLATE_PAGE_SIZES,
  buildGoalTemplateHref,
  type GoalTemplateListParams,
  type TemplateTab,
} from "@/features/review-templates/services/goal-template-selection";

const TABS = [
  { value: "all", label: "All Templates" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
] as const satisfies readonly { value: TemplateTab; label: string }[];

const STATUS_OPTIONS = TEMPLATE_VERSION_STATUSES.map((value) => ({
  value,
  label: TEMPLATE_VERSION_STATUS_LABELS[value],
}));

const SEARCH_DELAY_MS = 300;

interface GoalTemplateListingProps {
  /** The rows of the current page. The server already applied the tab, search, and status. */
  rows: GoalTemplateListResponseDto;
  total: number;
  /** The current page, clamped to the last page. */
  page: number;
  params: GoalTemplateListParams;
}

/**
 * Tabs, search, status filter, table, and pager of the KPI Goal Templates list.
 * The state lives in the URL: each control replaces it, and the server renders
 * the new rows. A change to a filter goes back to page 1.
 */
export function GoalTemplateListing({
  rows,
  total,
  page,
  params,
}: GoalTemplateListingProps) {
  const router = useRouter();
  const [query, setQuery] = useState(params.q);
  // The latest params, so a handler that fires several changes keeps all of them.
  const latest = useRef(params);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    latest.current = params;
  }, [params]);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  function apply(changes: Partial<GoalTemplateListParams>) {
    latest.current = { ...latest.current, ...changes };
    router.replace(buildGoalTemplateHref(GOAL_TEMPLATE_PATH, latest.current), {
      scroll: false,
    });
  }

  function changeSearch(value: string) {
    setQuery(value);
    clearTimeout(searchTimer.current);
    if (value === "") {
      // A cleared search needs no pause, and "Clear filters" clears it with the status.
      apply({ q: "", page: 1 });
      return;
    }
    searchTimer.current = setTimeout(
      () => apply({ q: value.trim().slice(0, 100), page: 1 }),
      SEARCH_DELAY_MS,
    );
  }

  const isFiltered =
    params.tab !== "all" || params.status !== "all" || params.q !== "";

  return (
    <div className="grid min-w-0 gap-5">
      <div className="-mx-4 border-b border-border px-4">
        <ListingTabs
          label="KPI goal template status"
          tabs={TABS}
          value={params.tab}
          onChange={(tab) => apply({ tab, page: 1 })}
        />
      </div>
      <FilterBar
        searchLabel="Search template or position"
        searchValue={query}
        onSearchChange={changeSearch}
        filters={
          params.tab === "all"
            ? [
                {
                  id: "status",
                  label: "Status",
                  allLabel: "All statuses",
                  value: params.status === "all" ? FILTER_ALL : params.status,
                  options: STATUS_OPTIONS,
                  onChange: (value) =>
                    apply({
                      status:
                        value === FILTER_ALL
                          ? "all"
                          : (value as TemplateVersionStatus),
                      page: 1,
                    }),
                },
              ]
            : []
        }
      />
      <div className="-mx-4 min-w-0 border-y border-border">
        <GoalTemplateList templates={rows} isFiltered={isFiltered} />
      </div>
      <div className="sm:[&_[role=status]]:me-auto">
        <ListingPagination
          page={page}
          pageSize={params.pageSize}
          pageSizes={TEMPLATE_PAGE_SIZES}
          totalRows={total}
          onPageChange={(next) => apply({ page: next })}
          onPageSizeChange={(pageSize) => apply({ pageSize, page: 1 })}
        />
      </div>
    </div>
  );
}
