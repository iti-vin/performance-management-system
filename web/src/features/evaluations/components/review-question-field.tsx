import { REVIEW_TEXT_MAX_LENGTH, type ReviewQuestionDto } from "@pms/shared-types";
import { useId } from "react";

import { FormSelect } from "@/components/molecules/form-select";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NOT_OBSERVED_LABEL, RATING_LABELS } from "@/constants/domain-labels";
import { RatingField, type Choice } from "@/features/evaluations/components/rating-field";
import { NOT_OBSERVED } from "@/features/evaluations/services/assessment-request";

/** Clears an optional choice: a select has no other way back to empty. */
const NONE = "__none__";

const RATINGS = ([1, 2, 3, 4, 5] as const).map((rating) => ({
  value: String(rating),
  label: String(rating),
  word: RATING_LABELS[rating],
}));

/** The choices of a rating or a multiple choice question, or none for a written one. */
function choicesOf(question: ReviewQuestionDto): Choice[] | null {
  if (question.questionType === "rating_scale") {
    return question.allowNotObserved ? [...RATINGS, { value: NOT_OBSERVED, label: NOT_OBSERVED_LABEL }] : RATINGS;
  }
  if (question.questionType === "multiple_choice") {
    return question.options.map(({ optionId, label }) => ({ value: optionId, label }));
  }
  return null;
}

/** A saved answer as words, for a review that cannot be changed. */
export function ReviewAnswerText({ question, value }: { question: ReviewQuestionDto; value: string }) {
  const chosen = choicesOf(question)?.find((choice) => choice.value === value);
  const label = chosen?.word ? `${chosen.label} · ${chosen.word}` : chosen?.label;
  return (
    <div className="grid gap-1">
      <p className="text-pms-label">{question.prompt}</p>
      <p className="max-w-pms-copy text-pms-body whitespace-pre-wrap">{label ?? (value || "No answer")}</p>
    </div>
  );
}

interface ReviewQuestionFieldProps {
  question: ReviewQuestionDto;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/** The control of one question, by its type. */
export function ReviewQuestionField({ question, value, error, onChange }: ReviewQuestionFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const optionalId = `${id}-optional`;
  const choices = choicesOf(question);

  if (choices && question.questionType === "rating_scale") {
    return <RatingField question={question} choices={choices} value={value} error={error} onChange={onChange} />;
  }

  if (choices) {
    const withNone = question.isRequired || !value ? choices : [{ value: NONE, label: "No answer" }, ...choices];
    return (
      <FormSelect
        id={id}
        label={question.prompt}
        required={question.isRequired}
        description={question.isRequired ? undefined : "Optional"}
        value={value || null}
        options={withNone}
        error={error}
        onChange={(next) => onChange(next === NONE ? "" : next)}
      />
    );
  }

  const Control = question.questionType === "short_answer" ? Input : Textarea;
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} className="text-pms-label">
        {question.prompt}
        {question.isRequired && <span aria-hidden="true">*</span>}
      </FieldLabel>
      {!question.isRequired && <FieldDescription id={optionalId}>Optional</FieldDescription>}
      <Control
        id={id}
        value={value}
        maxLength={REVIEW_TEXT_MAX_LENGTH}
        required={question.isRequired}
        aria-invalid={Boolean(error)}
        aria-describedby={[!question.isRequired && optionalId, error && errorId].filter(Boolean).join(" ") || undefined}
        className="min-h-pms-touch rounded-pms-control"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
