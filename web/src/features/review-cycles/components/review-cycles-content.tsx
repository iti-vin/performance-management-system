import { TriangleAlertIcon } from "lucide-react";
import type { ReviewCycleListRowDto } from "@pms/shared-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReviewCyclesTable } from "@/features/review-cycles/components/review-cycles-table";
import type { ApiReadResult } from "@/services/api-read";

/** The reads that stop the page: no data and no way to show it. A raw error never reaches this text. */
const NOTICES = {
  signed_out: {
    title: "Session ended",
    description: "Log in again to see review cycles.",
  },
  forbidden: {
    title: "HR access required",
    description:
      "Only HR administrators whose account is linked to a company can open review cycles. If you are HR, ask your administrator to link your account.",
  },
  not_draft: {
    title: "This cycle cannot be edited",
    description: "Only a draft cycle can be edited. Go back to the register to see its state.",
  },
  unavailable: {
    title: "Review cycles are unavailable",
    description:
      "We could not load review cycles. Reload the page, or try again in a few minutes.",
  },
} as const;

/** The notice of a read that stopped the page. A 404 means the route is missing: the same notice as an outage. */
export function ReviewCycleNotice({ kind }: { kind: "signed_out" | "forbidden" | "unavailable" | "not_found" | "not_draft" }) {
  const { title, description } = NOTICES[kind === "not_found" ? "unavailable" : kind];
  return (
    <Alert variant="destructive" role="alert">
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

export function ReviewCyclesContent({
  result,
}: {
  result: ApiReadResult<ReviewCycleListRowDto[]>;
}) {
  if (result.kind === "ok") return <ReviewCyclesTable rows={result.data} />;
  return <ReviewCycleNotice kind={result.kind} />;
}
