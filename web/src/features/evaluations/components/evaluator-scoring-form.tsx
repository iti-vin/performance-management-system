"use client";

import { REVIEW_TEXT_MAX_LENGTH, type ReviewSectionDto, type SubmitBehavioralAssessmentRequestDto } from "@pms/shared-types";
import { ChevronLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { ConfirmationDialog } from "@/components/molecules/confirmation-dialog";
import { UnsavedChangesDialog } from "@/components/molecules/unsaved-changes-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { ReviewCompletion } from "@/features/evaluations/components/review-completion";
import { ReviewAnswerText, ReviewQuestionField } from "@/features/evaluations/components/review-question-field";
import { toSubmitBehavioralAssessmentRequest } from "@/features/evaluations/services/assessment-request";
import { useProblemFocus } from "@/hooks/use-problem-focus";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import type { FormActionResult } from "@/types/form-action";
import { withoutProblems } from "@/utils/form-problems";

type Send = (body: SubmitBehavioralAssessmentRequestDto) => Promise<FormActionResult>;
type Values = Readonly<Record<string, string>>;

const SECTION_CLASS = "min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4";
/** A pending action stays focusable: the `disabled` attribute would drop the focus to the page body. */
const ACTION_CLASS = "min-h-pms-touch rounded-pms-control data-disabled:opacity-50";
const NO_PROBLEMS: FormActionResult = { message: null, fieldErrors: {} };
const REQUIRED_MESSAGE = "Answer every required question before you submit.";

const requiredOf = (sections: readonly ReviewSectionDto[]) =>
  sections.flatMap((section) => section.questions).filter((question) => question.isRequired);

/** The required questions with no value, each with its problem. */
function missingRequired(sections: readonly ReviewSectionDto[], values: Values): Record<string, string> {
  const missing = requiredOf(sections).filter((question) => !values[question.questionId]?.trim());
  return Object.fromEntries(missing.map((question) => [question.questionId, "Answer this question."]));
}

/** True when a value differs from the saved one. Spaces around a text are not a change: the API trims them. */
function differs(sections: readonly ReviewSectionDto[], values: Values, saved: Values): boolean {
  return sections
    .flatMap((section) => section.questions)
    .some(({ questionId }) => (values[questionId]?.trim() ?? "") !== (saved[questionId]?.trim() ?? ""));
}

/** The free text of the review (the sample calls it Written Feedback). A reader sees it only when there is one. */
function WrittenFeedback({ isEditable, value, onChange }: { isEditable: boolean; value: string; onChange: (value: string) => void }) {
  if (!isEditable && !value) return null;
  return (
    <section className={SECTION_CLASS}>
      <label htmlFor="written-feedback" className="text-pms-section-title">
        {isEditable ? "Written Feedback (optional)" : "Written Feedback"}
      </label>
      {isEditable ? (
        <Textarea id="written-feedback" maxLength={REVIEW_TEXT_MAX_LENGTH} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <p className="max-w-pms-copy text-pms-body whitespace-pre-wrap wrap-break-word">{value}</p>
      )}
    </section>
  );
}

export interface EvaluatorScoringFormProps {
  sections: readonly ReviewSectionDto[];
  /** The saved answers, by question id, as the form holds them. */
  /** The saved written feedback. */
  initialFeedback?: string;
  initialAnswers: Values;
  isEditable: boolean;
  /** The caller may not read the review: the summary says why, and nothing else shows. */
  isRestricted?: boolean;
  /** True while the review may be saved but not yet submitted. */
  isSubmitBlocked?: boolean;
  /** The list that Back returns to, with its filters. */
  backHref: string;
  /** The words of the way back, when it is not the review list. */
  backLabel?: string;
  /** What the page says about the review, between the way back and the questions. */
  summary?: ReactNode;
  /** What stands over the questions, in their column. */
  intro?: ReactNode;
  onSave: Send;
  onSubmit: Send;
}

/**
 * The questions of one review. An evaluator saves a draft or submits it after a confirmation.
 * A review that cannot be changed shows its answers as words.
 */
export function EvaluatorScoringForm(props: EvaluatorScoringFormProps) {
  const { sections, initialAnswers, initialFeedback = "", isEditable, isSubmitBlocked = false, isRestricted = false, backHref, backLabel = "Back to Reviews", summary, intro, onSave, onSubmit } = props;
  const router = useRouter();
  const [values, setValues] = useState<Values>(initialAnswers);
  const [problems, setProblems] = useState(NO_PROBLEMS);
  const [done, setDone] = useState("");
  const [dialog, setDialog] = useState<"submit" | "leave" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState(initialFeedback);
  const isDirty = isEditable && (differs(sections, values, initialAnswers) || feedback.trim() !== initialFeedback.trim());
  useUnsavedChangesWarning(isDirty);

  const formRef = useRef<HTMLFormElement>(null);
  const showProblems = useProblemFocus(formRef, problems, setProblems);

  const resultRef = useRef<HTMLParagraphElement>(null);
  // A submitted review has no more actions: the focus goes to what happened.
  useEffect(() => {
    if (!isEditable && done) resultRef.current?.focus();
  }, [isEditable, done]);

  function change(questionId: string, value: string) {
    setValues((current) => ({ ...current, [questionId]: value }));
    setProblems((current) => withoutProblems(current, [questionId], [REQUIRED_MESSAGE]));
    setDone("");
  }

  function send(action: Send, success: string) {
    const body = toSubmitBehavioralAssessmentRequest(sections, values, feedback);
    if (!body.success) {
      setProblems({ message: "Check your answers and try again.", fieldErrors: {} });
      return;
    }
    setProblems(NO_PROBLEMS);
    setDone("");
    startTransition(async () => {
      try {
        const result = await action(body.data);
        showProblems(result);
        if (result.message === null) setDone(success);
      } catch {
        setProblems({ message: "Something went wrong. Try again.", fieldErrors: {} });
      }
    });
  }

  function askToSubmit() {
    const missing = missingRequired(sections, values);
    if (Object.keys(missing).length > 0) {
      showProblems({ message: REQUIRED_MESSAGE, fieldErrors: missing });
      return;
    }
    setProblems(NO_PROBLEMS);
    setDialog("submit");
  }

  const required = requiredOf(sections).length;
  const answered = required - Object.keys(missingRequired(sections, values)).length;
  const hasNotObserved = sections.some((section) => section.questions.some((question) => question.allowNotObserved));

  function leave() {
    setDialog(null);
    // Next keeps a page that the user left, hidden: a return must not show discarded edits.
    setValues(initialAnswers);
    setFeedback(initialFeedback);
    setProblems(NO_PROBLEMS);
    router.push(backHref);
  }

  return (
    <form ref={formRef} noValidate className="grid min-w-0 gap-4" onSubmit={(event) => event.preventDefault()}>
      <Button
        type="button"
        variant="ghost"
        className="min-h-pms-touch w-fit rounded-pms-control text-pms-label text-muted-foreground"
        onClick={() => (isDirty ? setDialog("leave") : router.push(backHref))}
      >
        <ChevronLeftIcon aria-hidden="true" />
        {backLabel}
      </Button>
      {summary}
      {/* The actions sit beside the questions on a wide screen, and under them on a narrow one. */}
      <div className={isEditable ? "grid min-w-0 gap-4 lg:grid-cols-3" : "grid min-w-0 gap-4"}>
        <div className={isEditable ? "grid min-w-0 content-start gap-4 lg:col-span-2" : "grid min-w-0 gap-4"}>
          {intro}
          {sections.length === 0 && !isRestricted && <p className="text-pms-body">This review has no questions.</p>}
          {sections.map((section, index) => (
            <FieldSet key={section.sectionId} className={SECTION_CLASS}>
              <FieldLegend className="text-pms-section-title">
                <span aria-hidden="true" className="me-2 text-pms-label text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.title}
              </FieldLegend>
              <p className="text-pms-label text-muted-foreground">
                {section.questions.length === 1 ? "1 question" : `${section.questions.length} questions`}
              </p>
              {section.questions.map((question) =>
                isEditable ? (
                  <ReviewQuestionField
                    key={question.questionId}
                    question={question}
                    value={values[question.questionId] ?? ""}
                    error={problems.fieldErrors[question.questionId]}
                    onChange={(value) => change(question.questionId, value)}
                  />
                ) : (
                  <ReviewAnswerText key={question.questionId} question={question} value={initialAnswers[question.questionId] ?? ""} />
                ),
              )}
            </FieldSet>
          ))}
          <WrittenFeedback
            isEditable={isEditable}
            value={isEditable ? feedback : initialFeedback}
            onChange={(next) => {
              setFeedback(next);
              setDone("");
            }}
          />
        </div>
        <div className="grid min-w-0 content-start gap-4 lg:sticky lg:top-4 lg:self-start">
          {isEditable && (
            <ReviewCompletion answered={answered} required={required} hasNotObserved={hasNotObserved}>
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={ACTION_CLASS}
                  disabled={isPending}
                  focusableWhenDisabled
                  onClick={() => send(onSave, "Draft saved.")}
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  className={ACTION_CLASS}
                  disabled={isPending || isSubmitBlocked}
                  focusableWhenDisabled
                  onClick={askToSubmit}
                >
                  Submit Review
                </Button>
              </div>
            </ReviewCompletion>
          )}
          <FieldError>{problems.message}</FieldError>
          <p ref={resultRef} role="status" tabIndex={-1} className="rounded-pms-control text-pms-body">
            {done}
          </p>
        </div>
      </div>
      <ConfirmationDialog
        open={dialog === "submit"}
        title="Submit this review?"
        description="After you submit, you cannot change your answers."
        confirmLabel="Submit"
        onClose={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          send(onSubmit, "Review submitted.");
        }}
      />
      <UnsavedChangesDialog open={dialog === "leave"} onStay={() => setDialog(null)} onLeave={leave} />
    </form>
  );
}
