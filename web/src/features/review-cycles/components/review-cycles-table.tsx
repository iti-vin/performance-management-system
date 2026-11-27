"use client";

import { CYCLE_STATUSES, REVIEW_TYPES, type ReviewCycleListRowDto } from "@pms/shared-types";
import Link from "next/link";
import type { ComponentProps } from "react";
import { ProgressCell } from "@/components/atoms/progress-cell";
import { StatusBadge } from "@/components/atoms/status-badge";
import { DataTable } from "@/components/organisms/data-table";
import { FilteredTable } from "@/components/organisms/filtered-table";
import {
  CYCLE_STATUS_LABELS,
  CYCLE_STATUS_TONES,
  REVIEW_TYPE_LABELS,
} from "@/constants/domain-labels";

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatCycleDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}

const periodOf = (cycle: ReviewCycleListRowDto) =>
  `${formatCycleDate(cycle.evaluationStart)} to ${formatCycleDate(cycle.evaluationEnd)}`;

export function ReviewCyclesTable({
  rows,
  isLoading = false,
}: {
  rows: readonly ReviewCycleListRowDto[];
  isLoading?: boolean;
}) {
  const columns: ComponentProps<typeof DataTable<ReviewCycleListRowDto>>["columns"] = [
      {
        id: "name",
        heading: "Cycle Name",
        renderCell: (cycle) => (
          <div className="whitespace-normal">
            <Link
              href={cycle.state === "draft" ? `/review-cycles/${cycle.cycleId}/edit` : `/review-cycles/${cycle.cycleId}`}
              className="inline-grid min-h-pms-touch content-center rounded-pms-control font-medium text-primary hover:underline focus-visible:underline"
            >
              {cycle.name}
            </Link>
            {cycle.releasedAt && (
              <span className="block text-pms-label text-muted-foreground">
                Results released
              </span>
            )}
          </div>
        ),
      },
      {
        id: "type",
        heading: "Review Type",
        renderCell: (cycle) => REVIEW_TYPE_LABELS[cycle.reviewType],
      },
      {
        id: "period",
        heading: "Review Period",
        renderCell: (cycle) =>
          `${formatCycleDate(cycle.evaluationStart)} to ${formatCycleDate(cycle.evaluationEnd)}`,
      },
      {
        id: "participants",
        heading: "Participants",
        align: "end",
        renderCell: (cycle) => cycle.participantCount,
      },
      {
        id: "progress",
        heading: "Progress",
        align: "end",
        renderCell: (cycle) => (
          <div className="grid justify-items-end gap-1">
            <span>
              {cycle.completedCount} / {cycle.assignmentCount}
            </span>
            <span className="text-pms-label text-muted-foreground">
              {cycle.submittedCount} submitted
            </span>
            <ProgressCell
              value={cycle.assignmentCount === 0 ? 0 : (cycle.completedCount / cycle.assignmentCount) * 100}
              label={`Completed assignments of ${cycle.name}`}
            />
          </div>
        ),
      },
      {
        id: "deadline",
        heading: "Deadline",
        renderCell: (cycle) =>
          cycle.deadline ? formatCycleDate(cycle.deadline) : "Not set",
      },
      {
        id: "status",
        heading: "Status",
        renderCell: (cycle) => (
          <StatusBadge
            label={CYCLE_STATUS_LABELS[cycle.state]}
            tone={CYCLE_STATUS_TONES[cycle.state]}
          />
        ),
      },
  ];
  const getRowId = (cycle: ReviewCycleListRowDto) => cycle.cycleId;
  const empty = "No review cycles found.";

  // An empty or loading register has nothing to filter.
  if (isLoading || rows.length === 0) {
    return (
      <DataTable
        caption="Review cycle register"
        rows={rows}
        isLoading={isLoading}
        getRowId={getRowId}
        emptyMessage={empty}
        columns={columns}
      />
    );
  }

  const periods = [...new Set(rows.map(periodOf))];
  const stateTab = (state: ReviewCycleListRowDto["state"]) => ({
    value: state,
    label: CYCLE_STATUS_LABELS[state],
    matches: (cycle: ReviewCycleListRowDto) => cycle.state === state,
  });

  return (
    <FilteredTable
      caption="Review cycle register"
      rows={rows}
      columns={columns}
      getRowId={getRowId}
      emptyMessage={empty}
      noMatchMessage="No cycles match these filters."
      searchPlaceholder="Search cycles..."
      searchText={(cycle) => cycle.name}
      tabs={[{ value: "all", label: "All Cycles" }, stateTab("draft"), stateTab("active"), stateTab("completed")]}
      filters={[
        {
          id: "state",
          label: "Cycle status",
          allLabel: "All statuses",
          options: CYCLE_STATUSES.map((value) => ({ value, label: CYCLE_STATUS_LABELS[value] })),
          matches: (cycle, value) => cycle.state === value,
        },
        {
          id: "type",
          label: "Cycle review type",
          allLabel: "All types",
          options: REVIEW_TYPES.map((value) => ({ value, label: REVIEW_TYPE_LABELS[value] })),
          matches: (cycle, value) => cycle.reviewType === value,
        },
        {
          id: "period",
          label: "Review period",
          allLabel: "All periods",
          options: periods.map((value) => ({ value, label: value })),
          matches: (cycle, value) => periodOf(cycle) === value,
        },
      ]}
    />
  );
}
