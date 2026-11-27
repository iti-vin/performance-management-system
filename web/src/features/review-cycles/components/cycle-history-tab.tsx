"use client";

import type { CycleHistoryEntryDto } from "@pms/shared-types";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { EVALUATOR_TYPE_LABELS } from "@/constants/domain-labels";
import { changeWords } from "@/features/review-cycles/services/history-words";
import { formatWorkspaceDateTimeShort } from "@/utils/workspace-date";

const actionWords = (action: string) => `${action.charAt(0).toUpperCase()}${action.slice(1).replaceAll("_", " ")}`;

function subjectOf({ area, employeeName, perspective }: CycleHistoryEntryDto): string {
  if (area === "cycle") return "Cycle";
  if (area === "report") return `KPI report of ${employeeName}`;
  return `${perspective ? EVALUATOR_TYPE_LABELS[perspective] : ""} review of ${employeeName}`;
}

const NOTICE_CLASS = "rounded-pms-card border border-border bg-card p-4 text-pms-body text-muted-foreground";

/** The recorded changes of one cycle, newest first (PRD 2.7 and 8.7). Null when they could not be read. */
export function CycleHistoryTab({ entries }: { entries: readonly CycleHistoryEntryDto[] | null }) {
  const [search, setSearch] = useState("");
  if (entries === null) return <p className={NOTICE_CLASS}>The history could not be loaded. Reload the page.</p>;
  if (entries.length === 0) return <p className={NOTICE_CLASS}>Nothing is recorded for this cycle yet.</p>;
  const wanted = search.trim().toLowerCase();
  const shown = entries.filter((entry) => !wanted || (entry.employeeName ?? "").toLowerCase().includes(wanted));

  return (
    <div className="grid min-w-0 gap-3 rounded-pms-card border border-border bg-card p-4">
      <Input
        type="search"
        aria-label="Search by employee"
        placeholder="Search by employee"
        className="min-h-pms-touch max-w-pms-copy"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {shown.length === 0 && <p className="text-pms-body text-muted-foreground">No history matches your search.</p>}
      <ol className="grid gap-3">
        {shown.map((entry) => (
          <li key={entry.eventId} className="grid min-w-0 gap-1 border-t border-border pt-3 text-pms-body wrap-break-word">
            <p className="text-pms-label font-semibold">{actionWords(entry.action)}</p>
            <p>{subjectOf(entry)}</p>
            <p className="text-muted-foreground">{`${formatWorkspaceDateTimeShort(entry.occurredAt)} by ${entry.actorName}`}</p>
            {entry.reason && <p>{`Reason: ${entry.reason}`}</p>}
            {entry.before && <p>{`Before: ${changeWords(entry.area, entry.before)}`}</p>}
            {entry.after && <p>{`After: ${changeWords(entry.area, entry.after)}`}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
