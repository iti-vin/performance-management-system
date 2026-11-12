import type { KpiGoalTemplate } from "../entities/kpi-goal-template.entity.js";
import type { KpiIndicatorMatrixColumn } from "../entities/kpi-indicator-matrix-column.entity.js";
import type { KpiIndicatorMatrixRow } from "../entities/kpi-indicator-matrix-row.entity.js";
import type { KpiIndicatorScale } from "../entities/kpi-indicator-scale.entity.js";
import type { KpiIndicator } from "../entities/kpi-indicator.entity.js";
import type { KpiTemplateVersion } from "../entities/kpi-template-version.entity.js";

/** A KPI goal template with its current version and everything under it. */
export interface TemplateTree {
  template: KpiGoalTemplate;
  version: KpiTemplateVersion | null;
  indicators: KpiIndicator[];
  scales: KpiIndicatorScale[];
  matrixRows: KpiIndicatorMatrixRow[];
  matrixColumns: KpiIndicatorMatrixColumn[];
}
