import type { ReviewDetailDto } from "@pms/shared-types";

import { StatusBadge } from "@/components/atoms/status-badge";
import { DefinitionGrid } from "@/components/molecules/definition-grid";
import { PersonCell } from "@/components/molecules/person-cell";
import {
  CYCLE_STATUS_LABELS,
  CYCLE_STATUS_TONES,
  EVALUATION_STATUS_LABELS,
  EVALUATION_STATUS_TONES,
  EVALUATOR_TYPE_LABELS,
} from "@/constants/domain-labels";
import { formatWorkspaceDate } from "@/utils/workspace-date";

/** What holds the caller back now, or null when nothing does. */
function readOnlyReason(review: ReviewDetailDto): string | null {
  const { canEdit, cycleState, state, waitingFor, response, perspective, isAssignedToCaller, isRestricted } = review;
  if (canEdit) {
    return waitingFor
      ? `Waiting for the ${EVALUATOR_TYPE_LABELS[waitingFor]} stage. You can save a draft, and submit after that stage is submitted.`
      : null;
  }
  if ((perspective === "peer" || perspective === "upward") && !isAssignedToCaller) {
    return "The answers of this perspective are anonymous. They show only in the results, pooled.";
  }
  if (isRestricted) return "This response is restricted by the review confidentiality settings.";
  if (cycleState !== "active") {
    return `The cycle is ${cycleState === "completed" ? "completed" : "not active"}. This review cannot be changed.`;
  }
  if (state === "locked") {
    return waitingFor ? `Waiting for the ${EVALUATOR_TYPE_LABELS[waitingFor]} stage.` : "Waiting for an earlier stage.";
  }
  if (state === "submitted" || state === "completed") return "This review is submitted. It cannot be changed.";
  return response?.status === "submitted"
    ? "Only the evaluator can change this review. These are the answers of the last submitted version."
    : "Only the evaluator can change this review. Answers show after it is submitted.";
}

/** Who is reviewed, by whom, and where the review stands. */
export function ReviewSummary({ review }: { review: ReviewDetailDto }) {
  const reason = readOnlyReason(review);
  return (
    <section aria-label="Review summary" className="grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4">
      <DefinitionGrid
        columns={3}
        items={[
          { label: "Employee", value: <PersonCell name={review.subjectName} subtitle={review.subjectPosition ?? undefined} /> },
          { label: "Department", value: review.subjectDepartment },
          {
            label: "Review Cycle",
            value:
              review.cycleState === "active" ? (
                review.cycleName
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  {review.cycleName}
                  <StatusBadge label={CYCLE_STATUS_LABELS[review.cycleState]} tone={CYCLE_STATUS_TONES[review.cycleState]} />
                </span>
              ),
          },
          { label: "Review Type", value: EVALUATOR_TYPE_LABELS[review.perspective] },
          { label: "Reviewer", value: review.evaluatorName },
          { label: "Due Date", value: formatWorkspaceDate(review.deadline) },
          {
            label: "Status",
            value: review.isOverdue ? (
              <StatusBadge label="Overdue" tone="alert" />
            ) : (
              <StatusBadge label={EVALUATION_STATUS_LABELS[review.state]} tone={EVALUATION_STATUS_TONES[review.state]} />
            ),
          },
        ]}
      />
      {review.reopenReason && <p className="text-pms-body wrap-break-word">{`Reopened by HR: ${review.reopenReason}`}</p>}
      {reason && <p className="text-pms-body text-muted-foreground">{reason}</p>}
    </section>
  );
}
