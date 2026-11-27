import type { AccomplishmentDetailDto } from "@pms/shared-types";

import { DefinitionGrid } from "@/components/molecules/definition-grid";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KPI_DIRECTION_LABELS, MATRIX_KIND_LABELS, SCALE_BOUND_LABELS } from "@/constants/domain-labels";

type Kpi = AccomplishmentDetailDto["kpi"];
type Indicator = Kpi["indicators"][number];

/** A number with its unit, or words for a number that is not set. */
export function withUnit(value: number | null, unit: string | null): string {
  if (value === null) return "Not set";
  return unit ? `${value} ${unit}` : String(value);
}

/** The headings and the cells of a matrix, as the cycle froze it. The API orders the rows. */
function matrixContent(kpi: Kpi, indicator: Indicator): { headings: string[]; rows: string[][] } {
  const own = <Row extends { indicatorId: string }>(rows: readonly Row[]) =>
    rows.filter((row) => row.indicatorId === indicator.indicatorId);

  if (indicator.matrixKind === "scale") {
    const isMaximum = indicator.scaleBound === "maximum";
    return {
      headings: [SCALE_BOUND_LABELS[indicator.scaleBound ?? "minimum"], "Rating label", "Score"],
      rows: own(kpi.scales).map((row) => [
        String((isMaximum ? row.upperBound : row.lowerBound) ?? "No upper limit"),
        row.label ?? "",
        String(row.score),
      ]),
    };
  }
  const columns = own(kpi.matrixColumns);
  return {
    headings: columns.map((column) => column.colLabel),
    rows: own(kpi.matrixRows).map((row) =>
      columns.map((column) => kpi.matrixCells.find((cell) => cell.rowId === row.rowId && cell.colId === column.colId)?.value ?? ""),
    ),
  };
}

function IndicatorMatrix({ kpi, indicator }: { kpi: Kpi; indicator: Indicator }) {
  const { headings, rows } = matrixContent(kpi, indicator);
  return (
    <div className="grid min-w-0 gap-2">
      <p className="text-pms-label font-semibold">{indicator.matrixTitle || MATRIX_KIND_LABELS[indicator.matrixKind]}</p>
      <p className="text-pms-label text-muted-foreground">{indicator.useForScoring ? "Used for scoring" : "Reference only"}</p>
      <Table scrollRegionLabel={`Matrix of ${indicator.name}`} className="text-pms-table">
        <TableHeader>
          <TableRow>
            {headings.map((heading, index) => (
              <TableHead key={index} scope="col">
                {heading}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cells, index) => (
            <TableRow key={index}>
              {cells.map((cell, at) => (
                <TableCell key={at}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface KpiIndicatorCardProps {
  kpi: Kpi;
  indicator: Indicator;
}

/** One frozen indicator with its criteria (PRD Acc-001). Nothing here can be changed (Acc-007). */
export function KpiIndicatorCard({ kpi, indicator }: KpiIndicatorCardProps) {
  // A scale that scores replaces the two scores of the target.
  const targetScores = indicator.useForScoring
    ? []
    : [
        { label: "Score when the target is met", value: String(indicator.scoreTargetMet) },
        { label: "Score when the target is missed", value: String(indicator.scoreBelowTarget) },
      ];

  return (
    <FieldSet className="min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4">
      <FieldLegend className="text-pms-section-title">{indicator.name}</FieldLegend>
      {indicator.description && <p className="max-w-pms-copy text-pms-body">{indicator.description}</p>}
      <DefinitionGrid
        columns={3}
        items={[
          { label: "Target", value: withUnit(indicator.target, indicator.unit) },
          { label: "Direction", value: KPI_DIRECTION_LABELS[indicator.direction] },
          { label: "Weight", value: `${indicator.weight}%` },
          ...targetScores,
        ]}
      />
      {indicator.matrixKind !== "none" && <IndicatorMatrix kpi={kpi} indicator={indicator} />}
    </FieldSet>
  );
}
