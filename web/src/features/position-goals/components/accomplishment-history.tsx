import type { AccomplishmentDetailDto } from "@pms/shared-types";

import { withUnit } from "@/features/position-goals/components/kpi-indicator-card";
import { formatWorkspaceDate } from "@/utils/workspace-date";

/** Every submission as it was sent (PRD Acc-003 and Acc-008). */
export function AccomplishmentHistory({ detail }: { detail: AccomplishmentDetailDto }) {
  if (detail.versions.length === 0) return null;
  const indicators = new Map(detail.kpi.indicators.map((indicator) => [indicator.indicatorId, indicator]));

  return (
    <section aria-label="Submission history" className="grid min-w-0 gap-3 rounded-pms-card border border-border bg-card p-4">
      <h2 className="text-pms-section-title">Submission history</h2>
      <ol className="grid gap-4">
        {detail.versions.map((version) => (
          <li key={version.version} className="grid gap-1 text-pms-body">
            <h3 className="text-pms-label font-semibold">Version {version.version}</h3>
            <p className="text-muted-foreground">
              {formatWorkspaceDate(version.actedAt)} by {version.actorName}
            </p>
            <ul className="tabular-nums">
              {version.actuals.map(({ indicatorId, actualValue, remarks }) => (
                <li key={indicatorId}>
                  {indicators.get(indicatorId)?.name ?? "Unknown indicator"}:{" "}
                  {actualValue === null ? "Not reported" : withUnit(actualValue, indicators.get(indicatorId)?.unit ?? null)}
                  {remarks ? `. Remarks: ${remarks}` : ""}
                </li>
              ))}
            </ul>
            {version.remarks && <p className="max-w-pms-copy whitespace-pre-wrap">Remarks: {version.remarks}</p>}
            {version.correctionReason && (
              <p className="max-w-pms-copy whitespace-pre-wrap">Correction: {version.correctionReason}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
