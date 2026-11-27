import type { ReviewQuestionDto } from "@pms/shared-types";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { RadioGroup, RadioGroupCard } from "@/components/ui/radio-group";

export interface Choice {
  value: string;
  label: string;
  /** What a rating means, under its number. */
  word?: string;
}

interface RatingFieldProps {
  question: ReviewQuestionDto;
  choices: readonly Choice[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/** One rating as a row of buttons: a radio group, so one tab stop and the arrow keys. */
export function RatingField({ question, choices, value, error, onChange }: RatingFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const optionalId = `${id}-optional`;
  const errorId = `${id}-error`;
  const describedBy = [!question.isRequired && optionalId, error && errorId].filter(Boolean).join(" ") || undefined;
  const invalid = error ? true : undefined;

  return (
    <Field data-invalid={invalid}>
      <p id={labelId} className="text-pms-label">
        {question.prompt}
        {question.isRequired && <span aria-hidden="true"> *</span>}
      </p>
      {!question.isRequired && <FieldDescription id={optionalId}>Optional</FieldDescription>}
      <RadioGroup
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        required={question.isRequired}
        value={value || null}
        onValueChange={(next) => onChange(String(next))}
        className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
      >
        {choices.map((choice) => (
          <RadioGroupCard
            key={choice.value}
            value={choice.value}
            aria-invalid={invalid}
            aria-label={choice.word ? `${choice.label} ${choice.word}` : choice.label}
          >
            <span className={choice.word ? "text-pms-section-title tabular-nums" : "text-pms-label"}>{choice.label}</span>
            {choice.word && <span className="text-pms-label text-muted-foreground">{choice.word}</span>}
          </RadioGroupCard>
        ))}
      </RadioGroup>
      {/* A radio group has no way back to empty, which an optional question allows. */}
      {!question.isRequired && value && (
        <Button
          type="button"
          variant="ghost"
          className="min-h-pms-touch w-fit rounded-pms-control"
          aria-label={`Clear answer to ${question.prompt}`}
          onClick={() => onChange("")}
        >
          Clear answer
        </Button>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
