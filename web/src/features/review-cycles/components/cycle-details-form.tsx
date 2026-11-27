"use client";

import { MAX_CYCLE_DESCRIPTION_LENGTH, REVIEW_TYPES, type ReviewType } from "@pms/shared-types";
import { FormSelect } from "@/components/molecules/form-select";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { REVIEW_TYPE_LABELS } from "@/constants/domain-labels";
import { describeComponents, weightsOf } from "@/features/review-cycles/services/cycle-components";
import { CYCLE_READERS } from "@/features/review-cycles/services/result-reader-choices";

export interface CycleDetails {
  name: string;
  reviewType: ReviewType;
  evaluationStart: string;
  evaluationEnd: string;
  assessmentStart: string;
  verificationDeadline: string;
  accomplishmentDeadline: string;
  description: string;
  usesGoals: boolean;
  usesBehavioral: boolean;
  employeeVisible: boolean;
  managerVisible: boolean;
  earlierAnswersVisible: boolean;
}

type DetailsField = keyof CycleDetails;

interface CycleDetailsFormProps {
  values: CycleDetails;
  /** The field that changed, with its new value. The wizard holds the draft. */
  onChange: (change: Partial<CycleDetails>) => void;
  /** The message of a field, shown under it. */
  errors?: Partial<Record<DetailsField, string>>;
}

const REVIEW_TYPE_OPTIONS = REVIEW_TYPES.map((value) => ({
  value,
  label: REVIEW_TYPE_LABELS[value],
}));

const DATE_FIELDS = [
  { field: "evaluationStart", label: "Evaluation Period Start" },
  { field: "evaluationEnd", label: "Evaluation Period End" },
  { field: "assessmentStart", label: "Assessment Start Date" },
  { field: "accomplishmentDeadline", label: "Employee Accomplishment Deadline (optional)" },
  { field: "verificationDeadline", label: "Manager Verification Deadline" },
] as const;

const COMPONENT_FIELDS = [
  { field: "usesGoals", label: "Goals Performance" },
  { field: "usesBehavioral", label: "Behavioral Performance" },
] as const;

function componentWords(choice: Pick<CycleDetails, "usesGoals" | "usesBehavioral">): string {
  const { goalsWeight, behavioralWeight } = weightsOf(choice);
  const applied = describeComponents(goalsWeight, behavioralWeight);
  return applied.length === 0 ? "Choose at least one component." : `${applied.join(" and ")}.`;
}

export function CycleDetailsForm({ values, onChange, errors = {} }: CycleDetailsFormProps) {
  function dateField({ field, label }: (typeof DATE_FIELDS)[number]) {
    const error = errors[field];
    const id = `cycle-${field}`;
    return (
      <Field key={field} data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={id} className="text-pms-label">
          {label}
        </FieldLabel>
        <Input
          id={id}
          type="date"
          className="min-h-pms-touch rounded-pms-control"
          value={values[field]}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange({ [field]: event.target.value })}
        />
        <FieldError id={`${id}-error`}>{error}</FieldError>
      </Field>
    );
  }

  return (
    <div className="grid min-w-0 gap-pms-section">
      <FieldSet className="min-w-0 gap-4">
        <FieldLegend className="text-pms-section-title">Basic Information</FieldLegend>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="cycle-name" className="text-pms-label">
              Cycle Name
            </FieldLabel>
            <Input
              id="cycle-name"
              maxLength={120}
              className="min-h-pms-touch rounded-pms-control"
              value={values.name}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "cycle-name-error" : undefined}
              onChange={(event) => onChange({ name: event.target.value })}
            />
            <FieldError id="cycle-name-error">{errors.name}</FieldError>
          </Field>
          <FormSelect
            label="Review Type"
            value={values.reviewType}
            options={REVIEW_TYPE_OPTIONS}
            onChange={(reviewType) => onChange({ reviewType })}
            error={errors.reviewType}
          />
        </div>
        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="cycle-description" className="text-pms-label">
            Description (optional)
          </FieldLabel>
          <Textarea
            id="cycle-description"
            maxLength={MAX_CYCLE_DESCRIPTION_LENGTH}
            value={values.description}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? "cycle-description-error" : undefined}
            onChange={(event) => onChange({ description: event.target.value })}
          />
          <FieldError id="cycle-description-error">{errors.description}</FieldError>
        </Field>
      </FieldSet>

      <FieldSet className="min-w-0 gap-4">
        <FieldLegend className="text-pms-section-title">Components</FieldLegend>
        <FieldDescription>What this cycle measures. Both count half each; one alone counts in full.</FieldDescription>
        <div className="flex flex-wrap gap-4">
          {COMPONENT_FIELDS.map(({ field, label }) => (
            <label key={field} className="flex min-h-pms-touch items-center gap-2 text-pms-body">
              <Checkbox checked={values[field]} onCheckedChange={(checked) => onChange({ [field]: checked === true })} />
              {label}
            </label>
          ))}
        </div>
        <p className="text-pms-body">{componentWords(values)}</p>
        <FieldError>{errors.usesGoals}</FieldError>
      </FieldSet>

      <FieldSet className="min-w-0 gap-4">
        <FieldLegend className="text-pms-section-title">Result Visibility</FieldLegend>
        <FieldDescription>
          Employees and managers read the results and reviews after the release. Reviewers of a later stage read earlier
          answers while the cycle runs. HR administrators always can.
        </FieldDescription>
        <div className="flex flex-wrap gap-4">
          {CYCLE_READERS.map(({ field, label }) => (
            <label key={field} className="flex min-h-pms-touch items-center gap-2 text-pms-body">
              <Checkbox checked={values[field]} onCheckedChange={(checked) => onChange({ [field]: checked === true })} />
              {label}
            </label>
          ))}
        </div>
      </FieldSet>

      <FieldSet className="min-w-0 gap-4">
        <FieldLegend className="text-pms-section-title">Evaluation Period</FieldLegend>
        <FieldDescription>The period of employee performance being evaluated.</FieldDescription>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">{DATE_FIELDS.slice(0, 2).map(dateField)}</div>
      </FieldSet>

      <FieldSet className="min-w-0 gap-4">
        <FieldLegend className="text-pms-section-title">Assessment Schedule</FieldLegend>
        <FieldDescription>
          The first stage opens on the assessment start date. Employees report their results by the
          accomplishment deadline, after the evaluation period. Managers verify them by the verification
          deadline, and a cycle with goals gives the manager assessment a later deadline. Dates are in Asia/Manila time.
        </FieldDescription>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">{DATE_FIELDS.slice(2).map(dateField)}</div>
      </FieldSet>
    </div>
  );
}
