"use client";

import { FormSelect } from "@/components/molecules/form-select";
import { AnonymousStages, type PeerSetup } from "@/features/review-cycles/components/anonymous-stages";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { StageDraft, StageKind } from "@/features/review-cycles/services/cycle-draft";

interface CycleStagesStepProps {
  stages: readonly StageDraft[];
  /** The HR evaluators that the API offers. */
  hrEvaluators: readonly { employeeId: string; name: string }[];
  /** The selected participants: none of them may evaluate an HR stage. */
  participantIds: readonly string[];
  onChange: (stages: StageDraft[]) => void;
  /** The message of a field, by its path, for example "stages.1.deadline". */
  errors?: Readonly<Record<string, string>>;
  /** Left out where the optional anonymous stages are not offered. */
  peers?: PeerSetup;
}

const STAGE_TITLES = {
  self: "Self-Assessment",
  manager: "Managerial Assessment",
  peer: "Peer Assessment",
  upward: "Upward Assessment",
  hr: "HR Assessment",
} as const satisfies Record<StageKind, string>;

const STAGE_NOTES = {
  self: "Each employee evaluates themselves.",
  manager: "The manager of each employee at launch evaluates.",
  peer: "The peers that you choose below evaluate. Nobody reads their names.",
  upward: "The direct reports of a participant evaluate, when there are enough of them. Nobody reads their names.",
  hr: "One HR administrator evaluates every participant.",
} as const satisfies Record<StageKind, string>;

export function CycleStagesStep({ stages, hrEvaluators, participantIds, onChange, errors = {}, peers }: CycleStagesStepProps) {
  const eligible = hrEvaluators.filter((person) => !participantIds.includes(person.employeeId));

  function update(index: number, change: Partial<StageDraft>) {
    onChange(stages.map((stage, position) => (position === index ? { ...stage, ...change } : stage)));
  }

  return (
    <div className="grid min-w-0 gap-pms-section">
      <p className="max-w-pms-copy text-pms-body text-muted-foreground">
        The stages run in this order. Each deadline must be after the stage before it. Dates are in Asia/Manila
        time.
      </p>
      {peers && (
        <AnonymousStages
          stages={stages}
          participantIds={participantIds}
          peers={peers}
          hrAdminIds={hrEvaluators.map((person) => person.employeeId)}
          onStagesChange={onChange}
        />
      )}
      {stages.map((stage, index) => {
        const title = STAGE_TITLES[stage.perspective];
        const deadlineId = `stage-${index}-deadline`;
        const deadlineError = errors[`stages.${index}.deadline`];
        const evaluatorError = errors[`stages.${index}.evaluatorId`];
        return (
          <section key={stage.perspective} aria-label={title} className="grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4">
            <h3 className="text-pms-section-title">
              {index + 1}. {title}
            </h3>
            <p className="text-pms-body text-muted-foreground">{STAGE_NOTES[stage.perspective]}</p>
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field data-invalid={Boolean(deadlineError)}>
                <FieldLabel htmlFor={deadlineId} className="text-pms-label">
                  {title} Deadline
                </FieldLabel>
                <Input
                  id={deadlineId}
                  type="date"
                  className="min-h-pms-touch rounded-pms-control"
                  value={stage.deadline}
                  aria-invalid={Boolean(deadlineError)}
                  aria-describedby={deadlineError ? `${deadlineId}-error` : undefined}
                  onChange={(event) => update(index, { deadline: event.target.value })}
                />
                <FieldError id={`${deadlineId}-error`}>{deadlineError}</FieldError>
              </Field>
              {stage.perspective === "hr" &&
                (eligible.length === 0 ? (
                  <Field>
                    <FieldDescription>No HR administrator of this company is available to evaluate.</FieldDescription>
                  </Field>
                ) : (
                  <FormSelect
                    label="HR evaluator"
                    value={stage.evaluatorId || null}
                    options={eligible.map((person) => ({ value: person.employeeId, label: person.name }))}
                    onChange={(evaluatorId) => update(index, { evaluatorId })}
                    error={evaluatorError}
                  />
                ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
