import { notFound, redirect } from "next/navigation";

import { CycleDetails } from "@/features/review-cycles/components/cycle-details";
import { ReviewCycleNotice } from "@/features/review-cycles/components/review-cycles-content";
import { getCycleResults } from "@/features/review-cycles/services/result-reader";
import {
  cancelReviewCycle,
  extendReviewCycle,
  finalizeReviewCycle,
  releaseResults,
  reopenReview,
  unscheduleReviewCycle,
} from "@/features/review-cycles/services/manage-review-cycle";
import {
  getCycleHistory,
  getReviewCycle,
  getReviewCycleParticipants,
  getReviewCycleReadiness,
} from "@/features/review-cycles/services/review-cycle-reader";

export interface DetailsContentProps {
  params: Promise<{ "cycle-id": string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** One cycle that is past its draft. A draft opens in the wizard. */
export async function DetailsContent({ params, searchParams }: DetailsContentProps) {
  const [{ "cycle-id": cycleId }, search] = await Promise.all([params, searchParams]);
  const [cycle, participants, results] = await Promise.all([
    getReviewCycle(cycleId),
    getReviewCycleParticipants(cycleId),
    getCycleResults(cycleId),
  ]);

  if (cycle.kind === "not_found") notFound();
  if (cycle.kind !== "ok") return <ReviewCycleNotice kind={cycle.kind} />;
  if (cycle.data.state === "draft") redirect(`/review-cycles/${cycleId}/edit`);
  if (participants.kind !== "ok") return <ReviewCycleNotice kind={participants.kind} />;
  if (results.kind !== "ok") return <ReviewCycleNotice kind={results.kind} />;

  // Readiness is read for a scheduled cycle only: it says what would block the activation.
  const readiness = cycle.data.state === "scheduled" ? await getReviewCycleReadiness(cycleId) : null;
  if (readiness && readiness.kind !== "ok") return <ReviewCycleNotice kind={readiness.kind} />;

  // The history is read for its tab only, and a failed read keeps the rest of the page.
  const history = search.tab === "history" ? await getCycleHistory(cycleId) : null;

  return (
    <CycleDetails
      key={cycleId}
      cycle={cycle.data}
      participants={participants.data}
      tab={typeof search.tab === "string" ? search.tab : "overview"}
      onCancel={cancelReviewCycle.bind(null, cycleId)}
      onExtend={extendReviewCycle.bind(null, cycleId)}
      onReopen={reopenReview.bind(null, cycleId)}
      results={results.data}
      history={history ? (history.kind === "ok" ? history.data : null) : []}
      onFinalize={finalizeReviewCycle.bind(null, cycleId)}
      onRelease={releaseResults.bind(null, cycleId)}
      onUnschedule={unscheduleReviewCycle.bind(null, cycleId)}
      problems={readiness?.data.map((issue) => issue.message) ?? []}
    />
  );
}
