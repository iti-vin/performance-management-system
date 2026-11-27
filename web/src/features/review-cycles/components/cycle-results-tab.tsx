"use client";

import type { ReleaseResultsRequestDto, ResultRowDto, ReviewCycleDetailDto } from "@pms/shared-types";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/molecules/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResultsTable } from "@/features/review-cycles/components/results-table";
import { RESULT_READERS } from "@/features/review-cycles/services/result-reader-choices";
import { formatWorkspaceDate } from "@/utils/workspace-date";

/** What each confirmation says: the effect, and that it cannot be undone (PRD 9.11). */
const CONFIRMATIONS = {
  finalize: {
    title: "Finalize this cycle?",
    description:
      "Every participant is scored from the submitted reviews and the verified accomplishments. Reviews and reports lock, and the cycle is completed. Nothing is released yet. This cannot be undone.",
    confirmLabel: "Finalize Results",
  },
  release: {
    title: "Release the results?",
    description: "The chosen readers can read the results. HR administrators always can. This cannot be undone.",
    confirmLabel: "Release Results",
  },
} as const;

export interface CycleResultsTabProps {
  cycle: ReviewCycleDetailDto;
  results: readonly ResultRowDto[];
  isPending: boolean;
  onFinalize: () => void;
  onRelease: (readers: ReleaseResultsRequestDto) => void;
}

/** Finalization and release of a cycle, as two separate actions (PRD Res-003), and its results. */
export function CycleResultsTab({ cycle, results, isPending, onFinalize, onRelease }: CycleResultsTabProps) {
  const [readers, setReaders] = useState({ employeeVisible: cycle.employeeVisible, managerVisible: cycle.managerVisible });
  const [asked, setAsked] = useState<keyof typeof CONFIRMATIONS | null>(null);
  const { state, finalizedAt, releasedAt } = cycle;

  function confirm() {
    setAsked(null);
    if (asked === "finalize") onFinalize();
    else onRelease(readers);
  }

  const action = (kind: keyof typeof CONFIRMATIONS) => (
    <Button type="button" className="min-h-pms-touch rounded-pms-control" disabled={isPending} onClick={() => setAsked(kind)}>
      {CONFIRMATIONS[kind].confirmLabel}
    </Button>
  );

  return (
    <div className="grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4">
      {finalizedAt ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-pms-body text-muted-foreground">
              {releasedAt
                ? `Released on ${formatWorkspaceDate(releasedAt)}.`
                : "Not released. Only HR administrators can read these results."}
            </p>
            {!releasedAt && action("release")}
          </div>
          {!releasedAt && (
            <fieldset className="grid gap-1 text-pms-body">
              <legend className="text-pms-label font-semibold">Who reads the results after release</legend>
              {RESULT_READERS.map(({ field, label }) => (
                <label key={field} className="flex min-h-pms-touch items-center gap-2">
                  <Checkbox
                    checked={readers[field]}
                    disabled={isPending}
                    onCheckedChange={(checked) => setReaders((current) => ({ ...current, [field]: checked === true }))}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          )}
          <ResultsTable caption="Results of the cycle" rows={results} context="department" emptyMessage="This cycle has no result." />
        </>
      ) : (
        <div className="grid justify-items-center gap-2 p-4 text-center">
          <h3 className="text-pms-section-title">Results are not finalized</h3>
          <p className="max-w-pms-copy text-pms-body text-muted-foreground">
            Finalization needs every review submitted and every KPI report verified.
          </p>
          {state === "active" && action("finalize")}
        </div>
      )}
      {asked && <ConfirmationDialog open {...CONFIRMATIONS[asked]} onClose={() => setAsked(null)} onConfirm={confirm} />}
    </div>
  );
}
