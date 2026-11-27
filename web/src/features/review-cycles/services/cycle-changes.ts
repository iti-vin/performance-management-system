import type { ReviewCycleDetailDto, ReviewCycleParticipantDto } from "@pms/shared-types";

import { EVALUATOR_TYPE_LABELS } from "@/constants/domain-labels";

/** Deadlines and reviews change only while a cycle runs and no result is final. The API keeps the same rule. */
export function isOpenToChanges({ state, finalizedAt, releasedAt }: ReviewCycleDetailDto): boolean {
  return state === "active" && !finalizedAt && !releasedAt;
}

/**
 * What HR confirms before a reopening (PRD Rec-003): the review itself, and each later review
 * of the same person that it changes. The assignments of a person come in stage order.
 */
export function describeReopening(person: ReviewCycleParticipantDto, assignmentId: string): string {
  const index = person.assignments.findIndex((work) => work.assignmentId === assignmentId);
  const target = person.assignments[index];
  if (!target) return "";
  // Another review of the same stage does not change.
  const after = person.assignments.slice(index + 1).filter((work) => work.perspective !== target.perspective);
  const later = after.flatMap((work) => {
    const review = `The ${EVALUATOR_TYPE_LABELS[work.perspective]} review (${work.evaluatorName})`;
    if (work.state === "submitted") return [`${review} also opens again.`];
    if (work.state === "not_started") return [`${review} is locked again.`];
    if (work.state === "in_progress") return [`${review} keeps its draft and waits to be submitted.`];
    return [];
  });
  return [
    `The ${EVALUATOR_TYPE_LABELS[target.perspective]} review of ${person.name} opens again and must be submitted again.`,
    ...later,
    "Submitted versions stay readable. KPI accomplishments do not change.",
  ].join(" ");
}
