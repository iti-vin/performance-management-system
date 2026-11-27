"use client";

import { ACCOMPLISHMENT_STATUSES, type AccomplishmentListRowDto } from "@pms/shared-types";
import Link from "next/link";
import type { ComponentProps } from "react";

import { StatusBadge } from "@/components/atoms/status-badge";
import { PERSON_LINK_CLASS, PersonCell } from "@/components/molecules/person-cell";
import { DataTable } from "@/components/organisms/data-table";
import { FilteredTable } from "@/components/organisms/filtered-table";
import {
  ACCOMPLISHMENT_STATUS_LABELS,
  ACCOMPLISHMENT_STATUS_TONES,
  CYCLE_STATUS_LABELS,
  CYCLE_STATUS_TONES,
} from "@/constants/domain-labels";
import { kpiTemplateLabel } from "@/features/position-goals/services/kpi-template-label";

const LINK_CLASS =
  "inline-grid min-h-pms-touch content-center rounded-pms-control font-medium text-primary hover:underline focus-visible:underline";

interface AccomplishmentsTableProps {
  caption: string;
  rows: readonly AccomplishmentListRowDto[];
  emptyMessage: string;
  /** True for reports of others: the first column names the employee, and it opens the record. */
  namesEmployees: boolean;
}

export function AccomplishmentsTable({ caption, rows, emptyMessage, namesEmployees }: AccomplishmentsTableProps) {
  const open = (row: AccomplishmentListRowDto, words: string, context: string) => (
    <Link href={`/goals/${row.accomplishmentId}`} className={namesEmployees ? PERSON_LINK_CLASS : LINK_CLASS}>
      {words}
      <span className="sr-only">: open the KPI report {context}</span>
    </Link>
  );
  const cycle = (row: AccomplishmentListRowDto) => (
    <div className="grid justify-items-start gap-1 whitespace-normal">
      {namesEmployees ? row.cycleName : open(row, row.cycleName, "of this cycle")}
      {/* Active is the normal case. Any other state explains why the work does not move. */}
      {row.cycleState !== "active" && (
        <StatusBadge label={CYCLE_STATUS_LABELS[row.cycleState]} tone={CYCLE_STATUS_TONES[row.cycleState]} />
      )}
    </div>
  );
  const cycleColumn = { id: "cycle", heading: "Review Cycle", renderCell: cycle };
  const employeeColumn = {
    id: "employee",
    heading: "Employee",
    renderCell: (row: AccomplishmentListRowDto) => (
      <PersonCell
        name={row.employeeName}
        subtitle={row.position ?? undefined}
        nameSlot={open(row, row.employeeName, `in ${row.cycleName}`)}
      />
    ),
  };
  const positionColumn = {
    id: "position",
    heading: "Position",
    renderCell: (row: AccomplishmentListRowDto) => row.position ?? "Not set",
  };
  const templateColumn = {
    id: "template",
    heading: "KPI Goal Template",
    renderCell: (row: AccomplishmentListRowDto) => <span className="whitespace-normal">{kpiTemplateLabel(row)}</span>,
  };
  const leading = namesEmployees ? [employeeColumn, positionColumn, cycleColumn] : [];

  const columns: ComponentProps<typeof DataTable<AccomplishmentListRowDto>>["columns"] = [
      leading[0] ?? cycleColumn,
      ...leading.slice(1),
      templateColumn,
      {
        id: "status",
        heading: "Accomplishment Status",
        renderCell: (row) => (
          <div className="grid justify-items-start gap-1">
            <StatusBadge label={ACCOMPLISHMENT_STATUS_LABELS[row.status]} tone={ACCOMPLISHMENT_STATUS_TONES[row.status]} />
            {row.canDecide && <StatusBadge label="Waiting for you" tone="alert" />}
          </div>
        ),
      },
  ];
  const getRowId = (row: AccomplishmentListRowDto) => row.accomplishmentId;

  // Your own reports are few. The reports of others are searched and filtered.
  if (!namesEmployees || rows.length === 0) {
    return <DataTable caption={caption} rows={rows} getRowId={getRowId} emptyMessage={emptyMessage} columns={columns} />;
  }

  const cycles = new Map(rows.map((row) => [row.cycleId, row.cycleName]));

  return (
    <FilteredTable
      caption={caption}
      rows={rows}
      columns={columns}
      getRowId={getRowId}
      emptyMessage={emptyMessage}
      noMatchMessage="No reports match these filters."
      searchPlaceholder="Search employees..."
      searchText={(row) => row.employeeName}
      filters={[
        {
          id: "cycle",
          label: "Review Cycle",
          allLabel: "All cycles",
          options: [...cycles].map(([value, label]) => ({ value, label })),
          matches: (row, value) => row.cycleId === value,
        },
        {
          id: "status",
          label: "Status",
          allLabel: "All statuses",
          options: ACCOMPLISHMENT_STATUSES.map((value) => ({ value, label: ACCOMPLISHMENT_STATUS_LABELS[value] })),
          matches: (row, value) => row.status === value,
        },
      ]}
    />
  );
}
