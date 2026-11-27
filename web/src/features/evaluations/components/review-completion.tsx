import type { ReactNode } from "react";

import { ProgressCell } from "@/components/atoms/progress-cell";

interface ReviewCompletionProps {
  answered: number;
  required: number;
  /** A question of the review offers Not Observed. */
  hasNotObserved: boolean;
  /** The actions of the review. */
  children: ReactNode;
}

/** How much of the required work is done, next to the actions. */
export function ReviewCompletion({ answered, required, hasNotObserved, children }: ReviewCompletionProps) {
  const percent = required === 0 ? 100 : (answered / required) * 100;

  return (
    <aside aria-label="Review completion" className="grid min-w-0 gap-3 rounded-pms-card border border-border bg-card p-4">
      <h2 className="text-pms-section-title">Review completion</h2>
      <p className="text-pms-label text-muted-foreground">{`${answered} / ${required} required questions answered`}</p>
      <ProgressCell value={percent} label="Required questions answered" />
      {hasNotObserved && (
        <p className="text-pms-label text-muted-foreground">
          Not Observed is a valid answer and is excluded from rating averages.
        </p>
      )}
      <p className="border-t border-border pt-3 text-pms-label text-muted-foreground">
        Save your progress, then submit when you are ready.
      </p>
      {children}
    </aside>
  );
}
