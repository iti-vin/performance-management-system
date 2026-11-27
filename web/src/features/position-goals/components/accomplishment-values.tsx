import type { AccomplishmentDetailDto } from "@pms/shared-types";

import { IndicatorTable } from "@/features/position-goals/components/indicator-table";

/** The report as words, for a caller who cannot change it. */
export function AccomplishmentValues({ detail }: { detail: AccomplishmentDetailDto }) {
  // The API sends no remark of a draft or a returned report to anyone but its employee.
  const hasRemarks = detail.actuals.length > 0 || detail.status === "submitted" || detail.status === "verified";

  return (
    <section aria-label="Reported values" className="grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4">
      <IndicatorTable detail={detail} />
      {hasRemarks && (
        <div className="grid gap-1">
          <h2 className="text-pms-label font-semibold">Remarks</h2>
          <p className="max-w-pms-copy text-pms-body whitespace-pre-wrap">{detail.remarks || "None"}</p>
        </div>
      )}
    </section>
  );
}
