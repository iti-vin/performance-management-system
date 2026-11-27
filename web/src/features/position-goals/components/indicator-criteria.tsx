import type { AccomplishmentDetailDto } from "@pms/shared-types";

import { KpiIndicatorCard } from "@/features/position-goals/components/kpi-indicator-card";

/** The direction, weight, scores and matrix of every frozen indicator (PRD Acc-001), on request. */
export function IndicatorCriteria({ kpi }: { kpi: AccomplishmentDetailDto["kpi"] }) {
  return (
    <details className="min-w-0 rounded-pms-card border border-border bg-card px-4">
      <summary className="min-h-pms-touch cursor-pointer content-center rounded-pms-control text-pms-label font-semibold">
        Scoring criteria
      </summary>
      <div className="grid min-w-0 gap-4 pb-4">
        {kpi.indicators.map((indicator) => (
          <KpiIndicatorCard key={indicator.indicatorId} kpi={kpi} indicator={indicator} />
        ))}
      </div>
    </details>
  );
}
