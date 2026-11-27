import { ACCOMPLISHMENT_TEXT_MAX_LENGTH, type AccomplishmentDetailDto } from "@pms/shared-types";
import { useId } from "react";

import { StatusBadge } from "@/components/atoms/status-badge";
import { DataTable } from "@/components/organisms/data-table";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ACCOMPLISHMENT_STATUS_TONES, INDICATOR_STATUS_LABELS, TARGET_RESULT_LABELS } from "@/constants/domain-labels";
import { targetResult } from "@/features/position-goals/services/target-result";

type Indicator = AccomplishmentDetailDto["kpi"]["indicators"][number];

/** The fields of a report that the employee may change, by indicator id. */
export interface ActualFields {
  values: Readonly<Record<string, string>>;
  errors: Readonly<Record<string, string>>;
  onChange: (indicatorId: string, value: string) => void;
  notes: Readonly<Record<string, string>>;
  onNoteChange: (indicatorId: string, note: string) => void;
}

function ActualField({ indicator, fields }: { indicator: Indicator; fields: ActualFields }) {
  const errorId = useId();
  const error = fields.errors[indicator.indicatorId];
  return (
    <div className="grid min-w-32 gap-1">
      {/* A text input keeps what was typed, so a bad value can be named. A number input would hide it. */}
      <Input
        aria-label={`Actual result for ${indicator.name}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        inputMode="decimal"
        autoComplete="off"
        className="min-h-pms-touch rounded-pms-control tabular-nums"
        value={fields.values[indicator.indicatorId] ?? ""}
        onChange={(event) => fields.onChange(indicator.indicatorId, event.currentTarget.value)}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

function NoteField({ indicator, fields }: { indicator: Indicator; fields: ActualFields }) {
  return (
    <Textarea
      aria-label={`Remarks for ${indicator.name}`}
      maxLength={ACCOMPLISHMENT_TEXT_MAX_LENGTH}
      className="min-w-40"
      value={fields.notes[indicator.indicatorId] ?? ""}
      onChange={(event) => fields.onNoteChange(indicator.indicatorId, event.currentTarget.value)}
    />
  );
}

interface IndicatorStatusProps {
  status: AccomplishmentDetailDto["status"];
  indicator: Indicator;
  actual: number | null;
}

/** Where a value stands: the status of the report, and the comparison with the target once it is sent. */
function IndicatorStatus({ status, indicator, actual }: IndicatorStatusProps) {
  const result = targetResult(status, indicator, actual);
  return (
    <div className="grid justify-items-start gap-1">
      <StatusBadge label={INDICATOR_STATUS_LABELS[status]} tone={ACCOMPLISHMENT_STATUS_TONES[status]} />
      {result && (
        <span className="text-pms-label text-muted-foreground">
          {status === "submitted" ? `${TARGET_RESULT_LABELS[result]} · Unverified` : TARGET_RESULT_LABELS[result]}
        </span>
      )}
    </div>
  );
}

interface IndicatorTableProps {
  detail: AccomplishmentDetailDto;
  /** Left out for a report that the caller cannot change. */
  fields?: ActualFields;
}

/** The frozen indicators with their targets and what was achieved (PRD Acc-001). */
export function IndicatorTable({ detail, fields }: IndicatorTableProps) {
  // The API sends no value of a draft or a returned report to anyone but its employee.
  const hasValues = detail.actuals.length > 0 || detail.status === "submitted" || detail.status === "verified";
  const values = new Map(detail.actuals.map((actual) => [actual.indicatorId, actual.actualValue]));
  const actualOf = ({ indicatorId }: Indicator) => values.get(indicatorId) ?? null;
  const words = (indicator: Indicator) => (hasValues ? (actualOf(indicator) ?? "Not reported") : "Not shown");
  const notes = new Map(detail.actuals.map((actual) => [actual.indicatorId, actual.remarks]));
  const noteOf = ({ indicatorId }: Indicator) => (hasValues ? notes.get(indicatorId) || "None" : "Not shown");

  return (
    <DataTable
      caption="Performance indicators"
      rows={detail.kpi.indicators}
      getRowId={(indicator) => indicator.indicatorId}
      emptyMessage="This template has no indicators."
      columns={[
        {
          id: "indicator",
          heading: "Performance Indicator",
          renderCell: (indicator) => <span className="font-semibold whitespace-normal">{indicator.name}</span>,
        },
        { id: "unit", heading: "Measurement Unit", renderCell: (indicator) => indicator.unit ?? "Not set" },
        { id: "target", heading: "Target", renderCell: (indicator) => indicator.target ?? "Not set" },
        {
          id: "actual",
          heading: "Actual Result",
          renderCell: (indicator) => (fields ? <ActualField indicator={indicator} fields={fields} /> : words(indicator)),
        },
        {
          id: "status",
          heading: "Status",
          renderCell: (indicator) => (
            <IndicatorStatus status={detail.status} indicator={indicator} actual={actualOf(indicator)} />
          ),
        },
        {
          id: "remarks",
          heading: "Remarks",
          renderCell: (indicator) =>
            fields ? (
              <NoteField indicator={indicator} fields={fields} />
            ) : (
              <span className="whitespace-pre-wrap">{noteOf(indicator)}</span>
            ),
        },
      ]}
    />
  );
}
