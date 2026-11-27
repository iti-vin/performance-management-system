import { notFound } from "next/navigation";

import { PageHeader } from "@/components/molecules/page-header";

import { getCurrentUser } from "@/features/auth/services/current-user";
import { EvaluatorScoringForm } from "@/features/evaluations/components/evaluator-scoring-form";
import { ReviewHistory } from "@/features/evaluations/components/review-history";
import { fromReviewAnswers } from "@/features/evaluations/services/assessment-request";
import { ReviewAssessmentHeader } from "@/features/review-cycles/components/review-assessment-header";
import { ReviewListNotice } from "@/features/review-cycles/components/review-list-notice";
import { ReviewSummary } from "@/features/review-cycles/components/review-summary";
import { ReviewTemplateCard } from "@/features/review-cycles/components/review-template-card";
import { getReview } from "@/features/review-cycles/services/review-cycle-reader";
import {
  buildReviewListHref,
  parseReviewListParams,
  scopeReviewParams,
  type RawSearchParams,
} from "@/features/review-cycles/services/review-list-params";
import { saveReviewDraft, submitReview } from "@/features/review-cycles/services/review-response";

export const REVIEW_TITLE = "Review Details";

export interface ReviewContentProps {
  params: Promise<{ "assignment-id": string }>;
  searchParams: Promise<RawSearchParams>;
}

/**
 * One review: its summary from the cycles feature and its form from the evaluations feature,
 * joined here because a feature does not import another one. The API decides what the caller
 * may read and change.
 */
export async function ReviewContent({ params, searchParams }: ReviewContentProps) {
  const [{ "assignment-id": assignmentId }, raw, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const result = await getReview(assignmentId);
  if (result.kind === "not_found") notFound();
  if (result.kind !== "ok") {
    return (
      <>
        <PageHeader title={REVIEW_TITLE} />
        <ReviewListNotice kind={result.kind} />
      </>
    );
  }

  const review = result.data;
  // The way back is rebuilt from the list filters, never taken from the URL as an address.
  const isAdmin = user?.role === "ADMIN";
  const cameFromCycle = isAdmin && raw.from === "cycle";
  const backHref = cameFromCycle
    ? `/review-cycles/${review.cycleId}?tab=progress`
    : buildReviewListHref(scopeReviewParams(parseReviewListParams(raw), user?.role));

  return (
    <>
      <PageHeader title={REVIEW_TITLE} description={[review.subjectName, review.subjectPosition].filter(Boolean).join(" · ")} />
      <EvaluatorScoringForm
        key={assignmentId}
        sections={review.sections}
        initialAnswers={fromReviewAnswers(review.response?.answers ?? [])}
        isEditable={review.canEdit}
        isRestricted={review.isRestricted}
        isSubmitBlocked={review.waitingFor !== null}
        backHref={backHref}
        backLabel={cameFromCycle ? "Back to Cycle" : undefined}
        summary={
          <>
            <ReviewSummary review={review} />
            <ReviewAssessmentHeader review={review} />
          </>
        }
        initialFeedback={review.response?.writtenFeedback ?? ""}
        intro={review.template && <ReviewTemplateCard template={review.template} />}
        onSave={saveReviewDraft.bind(null, assignmentId)}
        onSubmit={submitReview.bind(null, assignmentId)}
      />
      <ReviewHistory sections={review.sections} history={review.history} />
    </>
  );
}
