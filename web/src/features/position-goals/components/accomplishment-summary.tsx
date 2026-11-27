import type { AccomplishmentDetailDto } from "@pms/shared-types";

import { StatusBadge } from "@/components/atoms/status-badge";
import { DefinitionGrid } from "@/components/molecules/definition-grid";
import {
  ACCOMPLISHMENT_STATUS_LABELS,
  ACCOMPLISHMENT_STATUS_TONES,
  CYCLE_STATUS_LABELS,
  CYCLE_STATUS_TONES,
} from "@/constants/domain-labels";
import { formatWorkspaceDate } from "@/utils/workspace-date";

/** Whose report it is, where it stands, and why the caller cannot do more with it. */
export function AccomplishmentSummary({ detail }: { detail: AccomplishmentDetailDto }) {
  const cycle =
    detail.cycleState === "active" ? (
      detail.cycleName
    ) : (
      <span className="flex flex-wrap items-center gap-2">
        {detail.cycleName}
        <StatusBadge label={CYCLE_STATUS_LABELS[detail.cycleState]} tone={CYCLE_STATUS_TONES[detail.cycleState]} />
      </span>
    );

  // An older template has no name, and a cycle may have frozen no position: both are left out.
  const version = detail.kpiTemplateVersion === null ? null : `v${detail.kpiTemplateVersion}`;
  const work = [detail.position, detail.kpiTemplateName, version].filter(Boolean).join(" · ");

  return (
    <section aria-label="Report summary" className="grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h2 className="text-pms-section-title wrap-break-word">{detail.employeeName}</h2>
          <p className="text-pms-label text-muted-foreground">{work}</p>
        </div>
        <StatusBadge label={ACCOMPLISHMENT_STATUS_LABELS[detail.status]} tone={ACCOMPLISHMENT_STATUS_TONES[detail.status]} />
      </div>
      <DefinitionGrid
        columns={3}
        items={[
          { label: "Review Cycle", value: cycle },
          {
            label: "Evaluation Period",
            value: `${formatWorkspaceDate(detail.evaluationStart)} to ${formatWorkspaceDate(detail.evaluationEnd)}`,
          },
          ...(detail.accomplishmentDeadline
            ? [{ label: "Accomplishment Deadline", value: formatWorkspaceDate(detail.accomplishmentDeadline) }]
            : []),
          { label: "Verification Deadline", value: formatWorkspaceDate(detail.verificationDeadline) },
        ]}
      />
      {detail.status === "returned" && detail.returnReason && (
        <div className="grid gap-1">
          <p className="text-pms-label font-semibold">Returned for correction</p>
          <p className="max-w-pms-copy text-pms-body whitespace-pre-wrap">{detail.returnReason}</p>
        </div>
      )}
      {detail.notice && <p className="text-pms-body text-muted-foreground">{detail.notice}</p>}
    </section>
  );
}
