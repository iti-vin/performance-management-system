import { Fragment, type ReactNode } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RowId = string | number;
export type SortDirection = "asc" | "desc";

interface DataTableColumn<Row> {
  id: string;
  heading: string;
  align?: "start" | "end";
  /** Shows a sort button in the header. Requires the `sort` prop. */
  sortable?: boolean;
  renderCell: (row: Row) => ReactNode;
}

interface DataTableSort {
  columnId: string | null;
  direction: SortDirection;
  onChange: (columnId: string, direction: SortDirection) => void;
}

interface DataTableSelection<Row> {
  selectedIds: ReadonlySet<RowId>;
  onChange: (selectedIds: Set<RowId>) => void;
  /** Accessible name for a row checkbox, for example the employee name. */
  getRowLabel: (row: Row) => string;
}

interface DataTableExpansion<Row> {
  expandedIds: ReadonlySet<RowId>;
  onToggle: (rowId: RowId) => void;
  renderExpanded: (row: Row) => ReactNode;
  getRowLabel: (row: Row) => string;
}

interface DataTableProps<Row> {
  caption: string;
  columns: readonly [DataTableColumn<Row>, ...DataTableColumn<Row>[]];
  rows: readonly Row[];
  getRowId: (row: Row) => RowId;
  emptyMessage: string;
  /** Replaces the plain empty message, for example an `Empty` with an action. */
  emptyState?: ReactNode;
  isLoading?: boolean;
  /** Skeleton row count while loading. */
  loadingRows?: number;
  sort?: DataTableSort;
  selection?: DataTableSelection<Row>;
  expansion?: DataTableExpansion<Row>;
}

export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowId,
  emptyMessage,
  emptyState,
  isLoading = false,
  loadingRows = 5,
  sort,
  selection,
  expansion,
}: DataTableProps<Row>) {
  const columnCount =
    columns.length + (selection ? 1 : 0) + (expansion ? 1 : 0);
  const rowIds = rows.map(getRowId);
  const selectedCount = rowIds.filter((id) =>
    selection?.selectedIds.has(id),
  ).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const someSelected = selectedCount > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    if (!selection) return;
    const next = new Set(selection.selectedIds);
    for (const id of rowIds) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    selection.onChange(next);
  }

  function toggleRow(id: RowId, checked: boolean) {
    if (!selection) return;
    const next = new Set(selection.selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    selection.onChange(next);
  }

  return (
    <Table
      scrollRegionLabel={caption}
      className="text-pms-table"
      aria-busy={isLoading || undefined}
    >
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader className="uppercase">
        <TableRow>
          {expansion && (
            <TableHead scope="col" className="w-10">
              <span className="sr-only">Expand row</span>
            </TableHead>
          )}
          {selection && (
            <TableHead scope="col" className="w-10">
              <Checkbox
                aria-label="Select all rows"
                checked={allSelected}
                indeterminate={someSelected}
                disabled={rows.length === 0 || isLoading}
                onCheckedChange={toggleAll}
              />
            </TableHead>
          )}
          {columns.map((column) => {
            const active = sort?.columnId === column.id;
            const ariaSort = !sort?.columnId || !column.sortable
              ? undefined
              : active
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none";
            return (
              <TableHead
                key={column.id}
                scope="col"
                aria-sort={ariaSort}
                className={column.align === "end" ? "text-end" : "text-start"}
              >
                {column.sortable && sort ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="-mx-2 min-h-pms-touch rounded-pms-control text-pms-label font-medium"
                    onClick={() =>
                      sort.onChange(
                        column.id,
                        active && sort.direction === "asc" ? "desc" : "asc",
                      )
                    }
                  >
                    {column.heading}
                    {active ? (
                      sort.direction === "asc" ? (
                        <ArrowUpIcon aria-hidden="true" />
                      ) : (
                        <ArrowDownIcon aria-hidden="true" />
                      )
                    ) : (
                      <ChevronsUpDownIcon aria-hidden="true" />
                    )}
                  </Button>
                ) : (
                  column.heading
                )}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <SkeletonRows
            rows={loadingRows}
            columnCount={columns.length}
            leadingCells={(selection ? 1 : 0) + (expansion ? 1 : 0)}
          />
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columnCount}
              className={emptyState == null ? "p-0 whitespace-normal" : "py-6 text-center whitespace-normal text-muted-foreground"}
            >
              {emptyState ?? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{emptyMessage}</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              )}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => {
            const id = getRowId(row);
            const expanded = expansion?.expandedIds.has(id) ?? false;
            return (
              <Fragment key={id}>
                <TableRow
                  data-state={selection?.selectedIds.has(id) ? "selected" : undefined}
                >
                  {expansion && (
                    <TableCell className="w-10">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="min-h-pms-touch min-w-pms-touch rounded-pms-control"
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Collapse" : "Expand"} ${expansion.getRowLabel(row)}`}
                        onClick={() => expansion.onToggle(id)}
                      >
                        {expanded ? (
                          <ChevronDownIcon aria-hidden="true" />
                        ) : (
                          <ChevronRightIcon aria-hidden="true" />
                        )}
                      </Button>
                    </TableCell>
                  )}
                  {selection && (
                    <TableCell className="w-10">
                      <Checkbox
                        aria-label={`Select ${selection.getRowLabel(row)}`}
                        checked={selection.selectedIds.has(id)}
                        onCheckedChange={(checked) => toggleRow(id, checked)}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={
                        column.align === "end"
                          ? "text-end tabular-nums"
                          : undefined
                      }
                    >
                      {column.renderCell(row)}
                    </TableCell>
                  ))}
                </TableRow>
                {expansion && expanded && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell
                      colSpan={columnCount}
                      className="whitespace-normal"
                    >
                      {expansion.renderExpanded(row)}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

const SKELETON_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-1/3", "w-5/6"] as const;

/** Body rows with one bar per column. Widths vary so it reads like real data. */
function SkeletonRows({
  rows,
  columnCount,
  leadingCells,
}: {
  rows: number;
  columnCount: number;
  /** Narrow cells for the expand and select columns. */
  leadingCells: number;
}) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <TableRow key={rowIndex} className="hover:bg-transparent">
      {Array.from({ length: leadingCells }, (_, cellIndex) => (
        <TableCell key={`lead-${cellIndex}`} className="w-10">
          <Skeleton className="size-4" />
        </TableCell>
      ))}
      {Array.from({ length: columnCount }, (_, columnIndex) => (
        <TableCell key={columnIndex}>
          <Skeleton
            className={`h-5 ${SKELETON_WIDTHS[(rowIndex + columnIndex) % SKELETON_WIDTHS.length]}`}
          />
        </TableCell>
      ))}
    </TableRow>
  ));
}

interface DataTableSkeletonProps {
  /** Real column headings. Shown as text because they are known before the data. */
  headings?: readonly string[];
  /** Used when `headings` is not given. */
  columnCount?: number;
  rows?: number;
  selectable?: boolean;
  expandable?: boolean;
}

/** Same table, header height, and cell padding as `DataTable`, for loading routes. */
export function DataTableSkeleton({
  headings,
  columnCount = 5,
  rows = 8,
  selectable = false,
  expandable = false,
}: DataTableSkeletonProps) {
  const columns = headings?.length ?? columnCount;
  return (
    <div aria-hidden="true">
      <Table className="text-pms-table">
        <TableHeader>
          <TableRow>
            {expandable && <TableHead scope="col" className="w-10" />}
            {selectable && (
              <TableHead scope="col" className="w-10">
                <Skeleton className="size-4" />
              </TableHead>
            )}
            {Array.from({ length: columns }, (_, index) => (
              <TableHead key={index} scope="col" className="text-start">
                {headings?.[index] ?? <Skeleton className="h-4 w-20" />}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <SkeletonRows
            rows={rows}
            columnCount={columns}
            leadingCells={(selectable ? 1 : 0) + (expandable ? 1 : 0)}
          />
        </TableBody>
      </Table>
    </div>
  );
}
