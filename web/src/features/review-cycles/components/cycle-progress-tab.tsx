"use client";

import { EVALUATOR_TYPES, type ReviewCycleParticipantDto } from "@pms/shared-types";
import Link from "next/link";

import { StatusBadge } from "@/components/atoms/status-badge";
import { PersonCell } from "@/components/molecules/person-cell";
import { FilteredTable } from "@/components/organisms/filtered-table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EVALUATION_STATUS_LABELS, EVALUATION_STATUS_TONES, EVALUATOR_TYPE_LABELS } from "@/constants/domain-labels";
import { countWork } from "@/features/review-cycles/services/cycle-progress";
import { matchesStatus, STATUS_FILTER_OPTIONS } from "@/features/review-cycles/services/status-filter";

export interface ReopenTarget {
  person: ReviewCycleParticipantDto;
  assignmentId: string;
}

interface CycleProgressTabProps {
  /** What the list keeps its state under: one cycle. */
  listKey?: string;
  participants: readonly ReviewCycleParticipantDto[];
  /** Given while the cycle is open to changes: each submitted review then offers a reopening. */
  onReopen?: (target: ReopenTarget) => void;
}

/** How much of the work of a cycle is done, and every assignment with a way to its response. */
export function CycleProgressTab({ participants, onReopen, listKey }: CycleProgressTabProps) {
  const rows = participants.flatMap((person) => person.assignments.map((work) => ({ ...work, person })));
  const { completed, submitted, total } = countWork(rows);
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="grid min-w-0 gap-4">
      <section className="grid gap-2 rounded-pms-card border border-border bg-card p-4">
        <h3 className="text-pms-section-title">Assignment completion</h3>
        <div className="flex items-center gap-3">
          <Progress value={percent} aria-label="Assignment completion" className="flex-1" />
          <span className="text-pms-label tabular-nums">{percent}%</span>
        </div>
        <p className="text-pms-label text-muted-foreground">
          {`${completed} completed / ${total} assignments · ${submitted} submitted`}
        </p>
      </section>

      <div className="rounded-pms-card border border-border bg-card p-4">
        <FilteredTable
          caption="Assignments of the cycle"
          listKey={listKey}
          rows={rows}
          getRowId={(row) => row.assignmentId}
          searchPlaceholder="Search employee or evaluator..."
          searchText={(row) => `${row.person.name} ${row.evaluatorName}`}
          emptyMessage="This cycle has no assignments yet."
          noMatchMessage="No assignments match these filters."
          filters={[
            {
              id: "type",
              label: "Review Type",
              allLabel: "All types",
              options: EVALUATOR_TYPES.map((value) => ({ value, label: EVALUATOR_TYPE_LABELS[value] })),
              matches: (row, value) => row.perspective === value,
            },
            { id: "status", label: "Status", allLabel: "All statuses", options: STATUS_FILTER_OPTIONS, matches: matchesStatus },
          ]}
          columns={[
            {
              id: "employee",
              heading: "Employee",
              renderCell: (row) => <PersonCell name={row.person.name} subtitle={row.person.position ?? undefined} />,
            },
            { id: "type", heading: "Type", renderCell: (row) => EVALUATOR_TYPE_LABELS[row.perspective] },
            { id: "reviewer", heading: "Reviewer", renderCell: (row) => row.evaluatorName },
            {
              id: "status",
              heading: "Status",
              renderCell: (row) =>
                row.isOverdue ? (
                  <StatusBadge label="Overdue" tone="alert" />
                ) : (
                  <StatusBadge label={EVALUATION_STATUS_LABELS[row.state]} tone={EVALUATION_STATUS_TONES[row.state]} />
                ),
            },
            {
              id: "action",
              heading: "Action",
              renderCell: (row) => (
                <span className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/reviews/${row.assignmentId}?from=cycle`}
                  className="inline-grid min-h-pms-touch content-center rounded-pms-control font-medium text-primary hover:underline focus-visible:underline"
                >
                  View response
                  <span className="sr-only">
                    {" "}
                    of the {EVALUATOR_TYPE_LABELS[row.perspective]} review of {row.person.name}
                  </span>
                </Link>
                {onReopen && row.state === "submitted" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-pms-touch rounded-pms-control"
                    aria-label={`Reopen the ${EVALUATOR_TYPE_LABELS[row.perspective]} review of ${row.person.name}`}
                    onClick={() => onReopen({ person: row.person, assignmentId: row.assignmentId })}
                  >
                    Reopen
                  </Button>
                )}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
