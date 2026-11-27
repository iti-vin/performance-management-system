import type { ReviewCycleDetailDto } from "@pms/shared-types";

import { describeComponents } from "@/features/review-cycles/services/cycle-components";
import { DefinitionGrid } from "@/components/molecules/definition-grid";
import { formatWorkspaceDate } from "@/utils/workspace-date";

/** The latest deadline of the stages: when the last assessment is due. */
function lastDeadline({ stages }: ReviewCycleDetailDto): string | null {
  const deadlines = stages.flatMap((stage) => stage.deadline ?? []);
  return deadlines.toSorted().at(-1) ?? null;
}

/** The dates of a cycle and what happens with its results. */
export function CycleOverview({ cycle }: { cycle: ReviewCycleDetailDto }) {
  const { releasedAt, anonymityThreshold, cancelledReason } = cycle;
  return (
    <div className="grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4">
      <DefinitionGrid
        items={[
          { label: "Components", value: describeComponents(cycle.goalsWeight, cycle.behavioralWeight).join(", ") },
          { label: "Cycle Start", value: formatWorkspaceDate(cycle.assessmentStart) },
          { label: "Submission Deadline", value: formatWorkspaceDate(lastDeadline(cycle)) },
          { label: "Accomplishment Deadline", value: formatWorkspaceDate(cycle.accomplishmentDeadline) },
          { label: "Verification Deadline", value: formatWorkspaceDate(cycle.verificationDeadline) },
          { label: "Results", value: releasedAt ? `Released ${formatWorkspaceDate(releasedAt)}` : "Not released" },
          {
            label: "Anonymous Minimum",
            value: anonymityThreshold === null ? "Not set" : `${anonymityThreshold} responses per group`,
          },
          ...(cycle.state === "cancelled" ? [{ label: "Cancellation Reason", value: cancelledReason ?? "Not set" }] : []),
        ]}
      />
      <p className="max-w-pms-copy text-pms-body text-muted-foreground">Evaluators submit individual responses.</p>
    </div>
  );
}
