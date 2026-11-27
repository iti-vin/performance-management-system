"use client";

import type { ComponentProps, ReactNode } from "react";

import { FILTER_ALL, FilterBar } from "@/components/molecules/filter-bar";
import { ListingPagination } from "@/components/molecules/listing-pagination";
import { ListingTabs } from "@/components/molecules/listing-tabs";
import { DataTable } from "@/components/organisms/data-table";
import { useListMemory } from "@/components/organisms/list-memory";

const PAGE_SIZES = [10, 20, 50] as const;

export interface TableFilter<Row> {
  id: string;
  label: string;
  allLabel: string;
  options: readonly { value: string; label: string }[];
  matches: (row: Row, value: string) => boolean;
}

export interface TableTab<Row> {
  value: string;
  label: string;
  /** Left out for the tab that shows every row. */
  matches?: (row: Row) => boolean;
}

interface ListState {
  tab: string;
  query: string;
  chosen: Readonly<Record<string, string>>;
  page: number;
  pageSize: number;
}

interface FilteredTableProps<Row> {
  caption: string;
  /** What the list keeps its state under, when two lists share a caption. */
  listKey?: string;
  rows: readonly Row[];
  columns: ComponentProps<typeof DataTable<Row>>["columns"];
  getRowId: (row: Row) => string;
  searchPlaceholder: string;
  /** The words that the search looks in. */
  searchText: (row: Row) => string;
  filters: readonly TableFilter<Row>[];
  /** Tabs above the filters. The first one is open. */
  tabs?: readonly [TableTab<Row>, ...TableTab<Row>[]];
  emptyMessage: string;
  noMatchMessage: string;
  /** An action on every row that matches, on all pages: an export, for example. */
  actions?: (matching: readonly Row[]) => ReactNode;
}

/**
 * Tabs, a search, filters, a table, and a pager over rows that the page already holds whole.
 * A list that the API pages is filtered by the API instead.
 */
export function FilteredTable<Row>(props: FilteredTableProps<Row>) {
  const { rows, filters, searchText, tabs } = props;
  const initial: ListState = { tab: tabs?.[0].value ?? "", query: "", chosen: {}, page: 1, pageSize: PAGE_SIZES[0] };
  const [{ tab, query, chosen, page, pageSize }, change] = useListMemory(props.listKey ?? props.caption, initial);

  const wanted = query.trim().toLowerCase();
  const valueOf = (id: string) => chosen[id] ?? FILTER_ALL;
  const tabMatches = tabs?.find((item) => item.value === tab)?.matches;
  const matching = rows.filter(
    (row) =>
      (tabMatches?.(row) ?? true) &&
      searchText(row).toLowerCase().includes(wanted) &&
      filters.every((filter) => valueOf(filter.id) === FILTER_ALL || filter.matches(row, valueOf(filter.id))),
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(matching.length / pageSize)));
  const first = (currentPage - 1) * pageSize;
  const isFiltered =
    wanted !== "" || tabMatches !== undefined || filters.some((filter) => valueOf(filter.id) !== FILTER_ALL);

  return (
    <div className="grid min-w-0 gap-4">
      {tabs && (
        <ListingTabs
          label={`${props.caption}: tabs`}
          tabs={tabs}
          value={tab}
          onChange={(next) => change({ tab: next, page: 1 })}
        />
      )}
      <FilterBar
        searchLabel="Search"
        searchPlaceholder={props.searchPlaceholder}
        searchValue={query}
        onSearchChange={(value) => change({ query: value, page: 1 })}
        filters={filters.map(({ id, label, allLabel, options }) => ({
          id,
          label,
          allLabel,
          options,
          value: valueOf(id),
          onChange: (value: string) => change({ chosen: { ...chosen, [id]: value }, page: 1 }),
        }))}
      />
      {matching.length > 0 && props.actions?.(matching)}
      <DataTable
        caption={props.caption}
        rows={matching.slice(first, first + pageSize)}
        columns={props.columns}
        getRowId={props.getRowId}
        emptyMessage={isFiltered ? props.noMatchMessage : props.emptyMessage}
      />
      {matching.length > 0 && (
        <ListingPagination
          page={currentPage}
          pageSize={pageSize}
          pageSizes={PAGE_SIZES}
          totalRows={matching.length}
          onPageChange={(next) => change({ page: next })}
          onPageSizeChange={(size) => change({ pageSize: size, page: 1 })}
        />
      )}
    </div>
  );
}
