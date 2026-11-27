import type { ReviewListRowDto } from "@pms/shared-types";
import Link from "next/link";

import { StatusBadge } from "@/components/atoms/status-badge";
import { PERSON_LINK_CLASS, PersonCell } from "@/components/molecules/person-cell";
import { DataTable } from "@/components/organisms/data-table";
import {
  CYCLE_STATUS_LABELS,
  CYCLE_STATUS_TONES,
  EVALUATION_STATUS_LABELS,
  EVALUATION_STATUS_TONES,
  EVALUATOR_TYPE_LABELS,
} from "@/constants/domain-labels";
import { formatWorkspaceDate } from "@/utils/workspace-date";

interface ReviewsTableProps {
  rows: readonly ReviewListRowDto[];
  emptyMessage: string;
  isLoading?: boolean;
  /** The query of the list, so the way back from a review restores it. */
  detailSearch?: string;
}

/** Every row opens its review: the API lists only rows that the caller may read. */
export function ReviewsTable({ rows, emptyMessage, isLoading = false, detailSearch = "" }: ReviewsTableProps) {
  return (
    <DataTable
      caption="Review assignments"
      rows={rows}
      isLoading={isLoading}
      getRowId={(row) => row.assignmentId}
      emptyMessage={emptyMessage}
      columns={[
        {
          id: "subject",
          heading: "Employee",
          renderCell: (row) => (
            <PersonCell
              name={row.subjectName}
              subtitle={row.subjectPosition ?? undefined}
              nameSlot={
                <Link
                  href={`/reviews/${row.assignmentId}${detailSearch}`}
                  className={PERSON_LINK_CLASS}
                >
                  {row.subjectName}
                  <span className="sr-only">
                    : open the {EVALUATOR_TYPE_LABELS[row.perspective]} review in {row.cycleName}
                  </span>
                </Link>
              }
            />
          ),
        },
        {
          id: "cycle",
          heading: "Review Cycle",
          renderCell: (row) => (
            <div className="grid justify-items-start gap-1 whitespace-normal">
              {row.cycleName}
              {/* Active is the normal case. Any other state explains why the work does not move. */}
              {row.cycleState !== "active" && (
                <StatusBadge label={CYCLE_STATUS_LABELS[row.cycleState]} tone={CYCLE_STATUS_TONES[row.cycleState]} />
              )}
            </div>
          ),
        },
        { id: "type", heading: "Review Type", renderCell: (row) => EVALUATOR_TYPE_LABELS[row.perspective] },
        {
          id: "reviewer",
          heading: "Reviewer",
          renderCell: (row) => (
            <div className="grid">
              <span>{row.evaluatorName}</span>
              {row.isAssignedToCaller && <span className="text-pms-label text-muted-foreground">Assigned to you</span>}
            </div>
          ),
        },
        { id: "due", heading: "Due Date", renderCell: (row) => formatWorkspaceDate(row.deadline) },
        {
          id: "status",
          heading: "Status",
          // Late work reads as Overdue: its stored state stays what it was (PRD Rev-004).
          renderCell: (row) =>
            row.isOverdue ? (
              <StatusBadge label="Overdue" tone="alert" />
            ) : (
              <StatusBadge label={EVALUATION_STATUS_LABELS[row.state]} tone={EVALUATION_STATUS_TONES[row.state]} />
            ),
        },
      ]}
    />
  );
}
