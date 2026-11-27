import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type ReviewListNoticeKind = "signed_out" | "forbidden" | "not_found" | "unavailable";

/** A 403 here means that no company is linked to the account, for any role. A raw error never reaches this text. */
const NOTICES = {
  signed_out: { title: "Session ended", description: "Log in again to see your reviews." },
  forbidden: {
    title: "No company on your account",
    description:
      "Your account is not linked to a company, so it has no reviews to show. Ask your HR administrator to link it.",
  },
  unavailable: {
    title: "Reviews are unavailable",
    description: "We could not load the reviews. Reload the page, or try again in a few minutes.",
  },
} as const;

/** The notice of a read that stopped the page. A 404 means the route is missing: the same notice as an outage. */
export function ReviewListNotice({ kind }: { kind: ReviewListNoticeKind }) {
  const { title, description } = NOTICES[kind === "not_found" ? "unavailable" : kind];
  return (
    <Alert variant="destructive" role="alert">
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
