import { RecordContent } from "@/app/(workspace)/goals/[accomplishment-id]/record-content";
import type { AccomplishmentListRowDto } from "@pms/shared-types";
import { ACCOMPLISHMENT_STATUS_LABELS } from "@/constants/domain-labels";
import { getCurrentUser } from "@/features/auth/services/current-user";
import { AccomplishmentsList } from "@/features/position-goals/components/accomplishments-list";
import { GoalsNotice } from "@/features/position-goals/components/goals-notice";
import { getAccomplishments } from "@/features/position-goals/services/accomplishment-reader";

interface GoalsContentProps {
  searchParams?: Promise<{ record?: string | string[] }>;
}

/** The report of a running cycle that waits for the employee: returned, else a draft, else any. */
function waitingReport(rows: readonly AccomplishmentListRowDto[]) {
  const running = rows.filter((row) => row.cycleState === "active");
  return running.find((row) => row.status === "returned") ?? running.find((row) => row.status === "draft") ?? running[0];
}

/**
 * The body of Goals: the account from auth and the reports from position goals, joined here.
 * An employee who reads only their own reports opens on the record of one cycle, with a choice
 * of cycle: the one of the address, else the running one. Anyone else gets the lists.
 */
export async function GoalsContent({ searchParams }: GoalsContentProps = {}) {
  const [user, result, search] = await Promise.all([getCurrentUser(), getAccomplishments(), searchParams]);
  if (result.kind !== "ok") return <GoalsNotice kind={result.kind} />;

  const rows = result.data;
  const first = rows[0];
  if (user?.role === "USER" && first && rows.every((row) => row.isOwn)) {
    // Only a report of the list is opened: an address cannot name another one.
    const shown = rows.find((row) => row.accomplishmentId === search?.record) ?? waitingReport(rows) ?? first;
    return RecordContent({
      params: Promise.resolve({ "accomplishment-id": shown.accomplishmentId }),
      // The state stands beside each cycle, so a returned report shows without opening it.
      choices: rows.map((row) => ({ value: row.accomplishmentId, label: `${row.cycleName} · ${ACCOMPLISHMENT_STATUS_LABELS[row.status]}` })),
    });
  }

  return <AccomplishmentsList rows={rows} isAdmin={user?.role === "ADMIN"} />;
}
