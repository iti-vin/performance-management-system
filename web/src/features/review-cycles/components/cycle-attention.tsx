import type { CycleAttentionDto } from "@pms/shared-types";
import Link from "next/link";

import { formatWorkspaceDate } from "@/utils/workspace-date";

function Item({ item }: { item: CycleAttentionDto }) {
  const isActive = item.state === "active";
  return (
    <li className="grid min-w-0 gap-1 wrap-break-word">
      <Link
        href={`/review-cycles/${item.cycleId}${isActive ? "?tab=progress" : ""}`}
        className="min-h-pms-touch w-fit content-center rounded-pms-control text-pms-label font-semibold underline"
      >
        {item.name}
      </Link>
      {isActive ? (
        <p>{`Overdue reviews: ${item.overdueReviews}. Overdue KPI reports: ${item.overdueReports}.`}</p>
      ) : (
        <>
          <p>{`Blocked: activates ${formatWorkspaceDate(item.activationDate)} only without these problems.`}</p>
          <ul className="list-disc ps-5 text-muted-foreground">
            {item.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </>
      )}
    </li>
  );
}

/** The cycles that wait for HR (PRD 10.2 and 10.9). Null when the list could not be read. */
export function CycleAttention({ items }: { items: readonly CycleAttentionDto[] | null }) {
  if (items === null) {
    return <p className="text-pms-body text-muted-foreground">The attention list could not be loaded. Reload the page.</p>;
  }
  if (items.length === 0) return null;
  return (
    <section aria-label="Needs attention" className="grid min-w-0 gap-3 rounded-pms-card border border-border bg-card p-4 text-pms-body">
      <h2 className="text-pms-section-title">Needs attention</h2>
      <ul className="grid gap-3">
        {items.map((item) => (
          <Item key={item.cycleId} item={item} />
        ))}
      </ul>
    </section>
  );
}
