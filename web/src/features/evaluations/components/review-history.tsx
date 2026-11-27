import type { ReviewHistoryEntryDto, ReviewSectionDto } from "@pms/shared-types";

import { ReviewAnswerText } from "@/features/evaluations/components/review-question-field";
import { fromReviewAnswers } from "@/features/evaluations/services/assessment-request";
import { formatWorkspaceDate } from "@/utils/workspace-date";

interface ReviewHistoryProps {
  sections: readonly ReviewSectionDto[];
  history: readonly ReviewHistoryEntryDto[];
}

/** The submitted versions before the one on the page, each closed until asked for (PRD Rev-006, Rec-003). */
export function ReviewHistory({ sections, history }: ReviewHistoryProps) {
  if (history.length === 0) return null;
  return (
    <section aria-label="Earlier versions" className="grid min-w-0 gap-3 rounded-pms-card border border-border bg-card p-4">
      <h2 className="text-pms-section-title">Earlier versions</h2>
      {history.map((entry) => {
        const answers = fromReviewAnswers(entry.answers);
        return (
          <details key={entry.version} className="min-w-0">
            <summary className="min-h-pms-touch cursor-pointer rounded-pms-control py-3 text-pms-label font-semibold">
              {`Version ${entry.version}, submitted ${formatWorkspaceDate(entry.submittedAt)}`}
            </summary>
            <div className="grid min-w-0 gap-3 wrap-break-word">
              {entry.reopenReason && <p className="text-pms-body">{`Reopened by HR: ${entry.reopenReason}`}</p>}
              {sections.map((section) => (
                <div key={section.sectionId} className="grid gap-2">
                  <h3 className="text-pms-label font-semibold">{section.title}</h3>
                  {section.questions.map((question) => (
                    <ReviewAnswerText key={question.questionId} question={question} value={answers[question.questionId] ?? ""} />
                  ))}
                </div>
              ))}
              {entry.writtenFeedback && (
                <p className="max-w-pms-copy text-pms-body whitespace-pre-wrap">{`Written Feedback: ${entry.writtenFeedback}`}</p>
              )}
            </div>
          </details>
        );
      })}
    </section>
  );
}
