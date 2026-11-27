import type { EvaluationStatus, ReviewCycleParticipantDto } from "@pms/shared-types";

export type CycleAssignment = ReviewCycleParticipantDto["assignments"][number];

const isDone = (state: EvaluationStatus) => state === "submitted" || state === "completed";

/** How far a set of assignments is. */
export function countWork(assignments: readonly CycleAssignment[]) {
  return {
    total: assignments.length,
    completed: assignments.filter((assignment) => assignment.state === "completed").length,
    submitted: assignments.filter((assignment) => assignment.state === "submitted").length,
    pending: assignments.filter((assignment) => !isDone(assignment.state)).length,
  };
}

/** Where one participant stands: the furthest thing that happened to their assignments. */
export function participantState(assignments: readonly CycleAssignment[]): EvaluationStatus {
  const every = (state: EvaluationStatus) => assignments.length > 0 && assignments.every((assignment) => assignment.state === state);
  if (every("completed")) return "completed";
  if (assignments.some((assignment) => isDone(assignment.state))) return "submitted";
  if (assignments.some((assignment) => assignment.state === "in_progress")) return "in_progress";
  return every("locked") ? "locked" : "not_started";
}
