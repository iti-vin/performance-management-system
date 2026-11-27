import type { AccomplishmentListRowDto } from "@pms/shared-types";

import { AccomplishmentsTable } from "@/features/position-goals/components/accomplishments-table";

const NO_OWN = "No KPI report yet. One appears when a review cycle with goals starts.";
const NO_COMPANY = "No KPI reports in this company yet.";

type ListSectionProps = Parameters<typeof AccomplishmentsTable>[0];

/** The table names its own scroll region after the caption, so the heading adds no second region. */
function ListSection(props: ListSectionProps) {
  return (
    <div className="grid min-w-0 gap-2">
      <h2 className="text-pms-section-title">{props.caption}</h2>
      <AccomplishmentsTable {...props} />
    </div>
  );
}

/**
 * The reports that the API lists for the caller: their own, then those of others. The ones
 * that wait for the caller come first. The role only chooses the words: the API decides the rows.
 */
export function AccomplishmentsList({ rows, isAdmin }: { rows: readonly AccomplishmentListRowDto[]; isAdmin: boolean }) {
  const own = rows.filter((row) => row.isOwn);
  const others = rows.filter((row) => !row.isOwn).sort((a, b) => Number(b.canDecide) - Number(a.canDecide));

  return (
    <div className="grid min-w-0 gap-6">
      {(!isAdmin || own.length > 0) && (
        <ListSection caption="Your reports" rows={own} emptyMessage={NO_OWN} namesEmployees={false} />
      )}
      {(isAdmin || others.length > 0) && (
        <ListSection caption={isAdmin ? "All employees" : "Your team"} rows={others} emptyMessage={NO_COMPANY} namesEmployees />
      )}
    </div>
  );
}
