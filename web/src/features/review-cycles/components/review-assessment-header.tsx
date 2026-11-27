import type { ReviewDetailDto } from "@pms/shared-types";
import Link from "next/link";

import { StatusBadge } from "@/components/atoms/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  ACCOMPLISHMENT_STATUS_LABELS,
  ACCOMPLISHMENT_STATUS_TONES,
  EVALUATION_STATUS_LABELS,
  EVALUATION_STATUS_TONES,
  EVALUATOR_TYPE_LABELS,
} from "@/constants/domain-labels";
import { formatWorkspaceDate } from "@/utils/workspace-date";

/** The stages of the participant in order, as cards, with this one marked. */
function StageCards({ stages }: { stages: ReviewDetailDto["stages"] }) {
  if (stages.length === 0) return null;
  return (
    <ol aria-label="Assessment stages" className="grid min-w-0 gap-3 md:grid-cols-3">
      {stages.map((stage, index) => (
        <li
          key={`${stage.perspective}-${index}`}
          aria-current={stage.isCurrent ? "step" : undefined}
          className={`grid min-w-0 justify-items-start gap-1 rounded-pms-card border bg-card p-4 ${stage.isCurrent ? "border-primary" : "border-border"}`}
        >
          <span className="text-pms-label text-muted-foreground tabular-nums">{index + 1}</span>
          <span className="text-pms-body font-semibold">{EVALUATOR_TYPE_LABELS[stage.perspective]} Assessment</span>
          <span className="text-pms-label wrap-break-word">{stage.evaluatorName}</span>
          <span className="text-pms-label text-muted-foreground">Due {formatWorkspaceDate(stage.deadline)}</span>
          <StatusBadge label={EVALUATION_STATUS_LABELS[stage.state]} tone={EVALUATION_STATUS_TONES[stage.state]} />
        </li>
      ))}
    </ol>
  );
}

/** The way to the KPI report that this assessment goes with. */
function GoalsCard({ goals }: { goals: ReviewDetailDto["goals"] }) {
  if (!goals) return null;
  return (
    <section className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-pms-card border border-border bg-card p-4">
      <div className="grid justify-items-start gap-1">
        <h2 className="text-pms-section-title">Goals Performance</h2>
        <StatusBadge label={ACCOMPLISHMENT_STATUS_LABELS[goals.status]} tone={ACCOMPLISHMENT_STATUS_TONES[goals.status]} />
      </div>
      <Link href={`/goals/${goals.accomplishmentId}`} className={buttonVariants({ variant: "outline", className: "min-h-pms-touch rounded-pms-control" })}>
        Open Goals
      </Link>
    </section>
  );
}

export function ReviewAssessmentHeader({ review }: { review: ReviewDetailDto }) {
  return (
    <>
      <StageCards stages={review.stages} />
      <GoalsCard goals={review.goals} />
    </>
  );
}
