"use client";

import type { ReviewCycleParticipantDto } from "@pms/shared-types";

import { StatusBadge } from "@/components/atoms/status-badge";
import { PersonCell } from "@/components/molecules/person-cell";
import { EVALUATION_STATUS_LABELS, EVALUATION_STATUS_TONES, EVALUATOR_TYPE_LABELS } from "@/constants/domain-labels";
import { FilteredTable } from "@/components/organisms/filtered-table";
import { countWork, participantState } from "@/features/review-cycles/services/cycle-progress";
import { matchesStatus, STATUS_FILTER_OPTIONS } from "@/features/review-cycles/services/status-filter";

/** Who takes part, who answers each stage, and how far each person is. */
export function CycleParticipantsTab({ participants, listKey }: { participants: readonly ReviewCycleParticipantDto[]; listKey?: string }) {
  const departments = [...new Set(participants.flatMap((person) => person.department ?? []))].sort();

  return (
    <FilteredTable
      caption="Participants of the cycle"
      listKey={listKey}
      rows={participants}
      getRowId={(person) => person.participantId}
      searchPlaceholder="Search employee..."
      searchText={(person) => person.name}
      emptyMessage="This cycle has no participants."
      noMatchMessage="No participants match these filters."
      filters={[
        {
          id: "department",
          label: "Department",
          allLabel: "All departments",
          options: departments.map((department) => ({ value: department, label: department })),
          matches: (person, value) => person.department === value,
        },
        {
          id: "status",
          label: "Status",
          allLabel: "All statuses",
          options: STATUS_FILTER_OPTIONS,
          // Late work is any late assignment. The other statuses are the one of the person.
          matches: (person, value) =>
            matchesStatus(
              { state: participantState(person.assignments), isOverdue: person.assignments.some((work) => work.isOverdue) },
              value,
            ),
        },
      ]}
      columns={[
        {
          id: "employee",
          heading: "Employee",
          renderCell: (person) => <PersonCell name={person.name} subtitle={person.position ?? undefined} />,
        },
        { id: "department", heading: "Department", renderCell: (person) => person.department ?? "Not set" },
        {
          id: "evaluators",
          heading: "Assigned Evaluators",
          renderCell: (person) =>
            person.assignments.length === 0 ? (
              "None yet"
            ) : (
              <ul className="grid">
                {person.assignments.map((work) => (
                  <li key={work.assignmentId}>
                    {EVALUATOR_TYPE_LABELS[work.perspective]}: {work.evaluatorName}
                  </li>
                ))}
              </ul>
            ),
        },
        {
          id: "completed",
          heading: "Completed",
          renderCell: (person) => {
            const { completed, total } = countWork(person.assignments);
            return <span className="tabular-nums">{`${completed} / ${total}`}</span>;
          },
        },
        { id: "pending", heading: "Pending", renderCell: (person) => countWork(person.assignments).pending },
        {
          id: "status",
          heading: "Status",
          renderCell: (person) => {
            const state = participantState(person.assignments);
            return <StatusBadge label={EVALUATION_STATUS_LABELS[state]} tone={EVALUATION_STATUS_TONES[state]} />;
          },
        },
      ]}
    />
  );
}
