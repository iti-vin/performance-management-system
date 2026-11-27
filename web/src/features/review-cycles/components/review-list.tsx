"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CYCLE_STATUSES,
  EVALUATOR_TYPES,
  REVIEW_PAGE_SIZES,
  REVIEW_SEARCH_MAX_LENGTH,
  type ReviewListQueryDto,
  type ReviewListResponseDto,
} from "@pms/shared-types";

import { FILTER_ALL, FilterBar } from "@/components/molecules/filter-bar";
import { ListingPagination } from "@/components/molecules/listing-pagination";
import { ListingTabs } from "@/components/molecules/listing-tabs";
import { CYCLE_STATUS_LABELS, EVALUATOR_TYPE_LABELS } from "@/constants/domain-labels";
import { ReviewsTable } from "@/features/review-cycles/components/reviews-table";
import { buildReviewListHref, parseReviewListParams, toReviewSearch } from "@/features/review-cycles/services/review-list-params";
import { STATUS_FILTER_OPTIONS } from "@/features/review-cycles/services/status-filter";

const SEARCH_DELAY_MS = 300;

type SelectFilter = "cycleId" | "cycleState" | "perspective" | "department" | "state";

const TABS = [
  { value: "all", label: "All Reviews" },
  { value: "mine", label: "My Reviews" },
  { value: "team", label: "Team Reviews" },
  { value: "completed", label: "Completed" },
] as const;
/** Only a manager has a team. */
const TABS_WITHOUT_TEAM = TABS.filter((tab) => tab.value !== "team");

/** What the list of a person who is not an administrator holds. */
function scopeWords(isManager: boolean) {
  const about = isManager ? "the reviews about you, and the reviews of your team" : "and the reviews about you";
  return `These are the reviews that you answer${isManager ? "," : ""} ${about}, in active and completed cycles.`;
}

/** The cycles that the API offers. A chosen cycle with no row stays, so its filter can be cleared. */
function toCycleOptions(cycles: ReviewListResponseDto["cycles"], selected: string | undefined) {
  const options = cycles.map((cycle) => ({ value: cycle.cycleId, label: cycle.name }));
  if (!selected || options.some((option) => option.value === selected)) return options;
  return [...options, { value: selected, label: "Selected cycle" }];
}

function toOptions<Code extends string>(codes: readonly Code[], labels: Record<Code, string>) {
  return codes.map((value) => ({ value, label: labels[value] }));
}

const CYCLE_STATE_OPTIONS = toOptions(CYCLE_STATUSES, CYCLE_STATUS_LABELS);
const STAGE_OPTIONS = toOptions(EVALUATOR_TYPES, EVALUATOR_TYPE_LABELS);

function emptyMessage(isFiltered: boolean, isAdmin: boolean) {
  if (isFiltered) return "No reviews match these filters.";
  return isAdmin ? "No review assignments yet." : "You have no reviews yet.";
}

export interface ReviewListProps {
  /** One page. The API already applied the role, the filters, and the search. */
  page: ReviewListResponseDto;
  params: ReviewListQueryDto;
  isAdmin: boolean;
  isManager: boolean;
}

/**
 * Search, filters, table, and pager of All Reviews. The state lives in the URL: each control
 * replaces it, and the server renders the new rows. A change to a filter goes back to page 1.
 */
export function ReviewList({ page, params, isAdmin, isManager }: ReviewListProps) {
  const router = useRouter();
  const [query, setQuery] = useState(params.q ?? "");
  // The latest params, so a handler that fires several changes keeps all of them.
  const latest = useRef(params);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    latest.current = params;
  }, [params]);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  function apply(changes: Partial<ReviewListQueryDto>) {
    latest.current = { ...latest.current, ...changes };
    router.replace(buildReviewListHref(latest.current), { scroll: false });
  }

  function changeSearch(value: string) {
    setQuery(value);
    clearTimeout(searchTimer.current);
    if (value === "") {
      // A cleared search needs no pause, and "Clear filters" clears it with the other filters.
      apply({ q: undefined, page: 1 });
      return;
    }
    searchTimer.current = setTimeout(
      () => apply({ q: value.trim().slice(0, REVIEW_SEARCH_MAX_LENGTH), page: 1 }),
      SEARCH_DELAY_MS,
    );
  }

  // The shared contract turns the chosen option into its typed value.
  function choose(id: SelectFilter, value: string) {
    const parsed = parseReviewListParams({ [id]: value === FILTER_ALL ? undefined : value });
    apply({ [id]: parsed[id], page: 1 });
  }

  const cycleOptions = toCycleOptions(page.cycles, params.cycleId);
  // A tab narrows the list as a filter does.
  const isFiltered = Boolean(
    params.view || params.cycleId || params.cycleState || params.perspective || params.department || params.state || params.q,
  );

  return (
    <div className="grid min-w-0 gap-5">
      <div className="-mx-4 border-b border-border px-4">
        <ListingTabs
          label="Review lists"
          tabs={isManager ? TABS : TABS_WITHOUT_TEAM}
          value={params.view ?? "all"}
          onChange={(view) => apply({ view: view === "all" ? undefined : view, page: 1 })}
        />
      </div>
      {!isAdmin && (
        <p className="text-pms-body text-muted-foreground">{scopeWords(isManager)}</p>
      )}
      <FilterBar
        searchLabel="Search"
        searchPlaceholder="Search employee or evaluator..."
        searchValue={query}
        onSearchChange={changeSearch}
        // Written out one by one: a list built by a function reads the ref during render (react-hooks/refs).
        filters={[
          ...(cycleOptions.length > 0
            ? [
                {
                  id: "cycleId",
                  label: "Review Cycle",
                  allLabel: "All cycles",
                  options: cycleOptions,
                  value: params.cycleId ?? FILTER_ALL,
                  onChange: (value: string) => choose("cycleId", value),
                },
              ]
            : []),
          ...(isAdmin
            ? [
                {
                  id: "cycleState",
                  label: "Cycle state",
                  allLabel: "All cycle states",
                  options: CYCLE_STATE_OPTIONS,
                  value: params.cycleState ?? FILTER_ALL,
                  onChange: (value: string) => choose("cycleState", value),
                },
              ]
            : []),
          {
            id: "perspective",
            label: "Review Type",
            allLabel: "All types",
            options: STAGE_OPTIONS,
            value: params.perspective ?? FILTER_ALL,
            onChange: (value) => choose("perspective", value),
          },
          {
            id: "department",
            label: "Department",
            allLabel: "All departments",
            options: page.departments.map((value) => ({ value, label: value })),
            value: params.department ?? FILTER_ALL,
            onChange: (value) => choose("department", value),
          },
          {
            id: "state",
            label: "Status",
            allLabel: "All statuses",
            options: STATUS_FILTER_OPTIONS,
            value: params.state ?? FILTER_ALL,
            onChange: (value) => choose("state", value),
          },
        ]}
      />
      <div className="-mx-4 min-w-0 border-y border-border">
        <ReviewsTable
          rows={page.items}
          emptyMessage={emptyMessage(isFiltered, isAdmin)}
          detailSearch={toReviewSearch(params)}
        />
      </div>
      <div className="sm:[&_[role=status]]:me-auto">
        <ListingPagination
          page={page.page}
          pageSize={page.pageSize}
          pageSizes={REVIEW_PAGE_SIZES}
          totalRows={page.totalItems}
          onPageChange={(next) => apply({ page: next })}
          onPageSizeChange={(pageSize) => apply({ pageSize, page: 1 })}
        />
      </div>
    </div>
  );
}
