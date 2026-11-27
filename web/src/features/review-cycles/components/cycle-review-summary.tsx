import type { ReviewCycleReadinessDto } from "@pms/shared-types";
import { Button } from "@/components/ui/button";
import { describeComponents, weightsOf } from "@/features/review-cycles/services/cycle-components";
import { REVIEW_TYPE_LABELS } from "@/constants/domain-labels";
import type { CycleDraft } from "@/features/review-cycles/services/cycle-draft";

const NOT_SET = "Not set";

/** The wizard step that owns a readiness problem: its number and its name. */
const OWNER = {
  details: { step: 1, label: "Cycle Details" },
  participants: { step: 2, label: "Select Participants" },
  kpi: { step: 3, label: "Evaluation Setup" },
  behavioral: { step: 3, label: "Evaluation Setup" },
  stages: { step: 4, label: "Assessment Workflow" },
} as const satisfies Record<ReviewCycleReadinessDto[number]["step"], { step: number; label: string }>;

interface CycleReviewSummaryProps {
  draft: CycleDraft;
  /** What blocks the launch of a saved draft. Left out for a new cycle, which has no readiness yet. */
  issues?: ReviewCycleReadinessDto;
  onFix?: (step: number) => void;
}

/** What blocks the launch, each problem with a button to the step that owns it. */
function Readiness({ issues, onFix }: { issues: ReviewCycleReadinessDto; onFix?: (step: number) => void }) {
  if (issues.length === 0) {
    return <p className="text-pms-body">Nothing blocks the launch.</p>;
  }
  return (
    <>
    <p className="text-pms-label text-muted-foreground">As saved. Save the draft to check again.</p>
    <ul aria-label="Before launch" className="grid gap-2">
      {issues.map((issue) => {
        const { step, label } = OWNER[issue.step];
        return (
          <li key={`${issue.field}-${issue.message}`} className="flex flex-wrap items-center justify-between gap-2 rounded-pms-control border border-border p-3">
            <span className="min-w-0 text-pms-body">{issue.message}</span>
            <Button type="button" variant="outline" className="min-h-pms-touch rounded-pms-control" onClick={() => onFix?.(step)}>
              Fix in {label}
            </Button>
          </li>
        );
      })}
    </ul>
    </>
  );
}

function componentsOf(draft: CycleDraft): string {
  const { goalsWeight, behavioralWeight } = weightsOf(draft);
  return describeComponents(goalsWeight, behavioralWeight).join(", ") || NOT_SET;
}

/** The last step: what the draft holds, so HR checks it before saving. */
export function CycleReviewSummary({ draft, issues, onFix }: CycleReviewSummaryProps) {
  const rows = [
    ["Cycle Name", draft.name.trim() || NOT_SET],
    ["Review Type", REVIEW_TYPE_LABELS[draft.reviewType]],
    ["Evaluation Period", `${draft.evaluationStart || NOT_SET} to ${draft.evaluationEnd || NOT_SET}`],
    ["Assessment Start Date", draft.assessmentStart || NOT_SET],
    ["Employee Accomplishment Deadline", draft.accomplishmentDeadline || NOT_SET],
    ["Manager Verification Deadline", draft.verificationDeadline || NOT_SET],
    ["Description", draft.description.trim() || NOT_SET],
    ["Components", componentsOf(draft)],
    ["Participants", String(draft.participantIds.length)],
  ];

  return (
    <section aria-labelledby="review-heading" className="grid min-w-0 gap-4">
      <h2 id="review-heading" className="text-pms-section-title">
        Review &amp; Launch
      </h2>
      <dl className="grid gap-4 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-pms-label text-muted-foreground">{label}</dt>
            <dd className="text-pms-body">{value}</dd>
          </div>
        ))}
      </dl>
      {issues && <Readiness issues={issues} onFix={onFix} />}
      <p className="max-w-pms-copy text-pms-body text-muted-foreground">
        Saving keeps the cycle as a draft. Open the saved draft to launch it from this step.
      </p>
    </section>
  );
}
