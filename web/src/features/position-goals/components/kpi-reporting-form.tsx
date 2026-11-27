import { ACCOMPLISHMENT_TEXT_MAX_LENGTH, type AccomplishmentDetailDto } from "@pms/shared-types";
import { useId } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { IndicatorTable } from "@/features/position-goals/components/indicator-table";
import type { ReportDraft } from "@/features/position-goals/services/actuals-request";

interface TextFieldProps {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/** One labelled text of the report with its problem under it. */
export function ReportTextField({ label, value, error, onChange }: TextFieldProps) {
  const id = useId();
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} className="text-pms-label">
        {label}
      </FieldLabel>
      <Textarea
        id={id}
        value={value}
        maxLength={ACCOMPLISHMENT_TEXT_MAX_LENGTH}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}

interface KpiReportingFormProps {
  detail: AccomplishmentDetailDto;
  draft: ReportDraft;
  /** The problems by indicator id, and by `remarks` and `correctionReason`. */
  errors: Readonly<Record<string, string>>;
  onChange: (draft: ReportDraft) => void;
}

/** The fields of a report that the employee may change: one value for each indicator, one remark. */
export function KpiReportingForm({ detail, draft, errors, onChange }: KpiReportingFormProps) {
  const changeValue = (indicatorId: string, value: string) =>
    onChange({ ...draft, values: { ...draft.values, [indicatorId]: value } });
  const changeNote = (indicatorId: string, note: string) =>
    onChange({ ...draft, notes: { ...draft.notes, [indicatorId]: note } });

  return (
    <section aria-label="Your report" className="grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4">
      <IndicatorTable
        detail={detail}
        fields={{ values: draft.values, errors, onChange: changeValue, notes: draft.notes, onNoteChange: changeNote }}
      />
      <ReportTextField
        label="Remarks (optional)"
        value={draft.remarks}
        error={errors.remarks}
        onChange={(remarks) => onChange({ ...draft, remarks })}
      />
      {detail.status === "returned" && (
        <ReportTextField
          label="What you corrected (sent when you submit, not saved with a draft)"
          value={draft.correctionReason}
          error={errors.correctionReason}
          onChange={(correctionReason) => onChange({ ...draft, correctionReason })}
        />
      )}
    </section>
  );
}
