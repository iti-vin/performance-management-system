import { CircleCheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SAVED = {
  draft: {
    title: "Cycle saved as a draft",
    description: "The cycle is not launched. It stays a draft until it is launched.",
  },
  updated: {
    title: "Cycle updated",
    description: "The draft is saved with your changes. It is still not launched.",
  },
  launched: {
    title: "Cycle launched",
    description: "The assignments are created and the first stage is open. The cycle can no longer be edited.",
  },
  scheduled: {
    title: "Cycle scheduled",
    description: "The system activates it on the day the assessment starts, and creates the assignments then.",
  },
  cancelled: {
    title: "Cycle cancelled",
    description: "The cycle is kept for the record. No new work and no result release can happen on it.",
  },
} as const;

/** What happened to the cycle the user just saved. `saved` is the `?saved=` flag of the register. */
export function ReviewCycleSavedNotice({ saved }: { saved: string | string[] | undefined }) {
  // `in` would also accept inherited keys such as "toString".
  if (typeof saved !== "string" || !Object.hasOwn(SAVED, saved)) return null;
  const { title, description } = SAVED[saved as keyof typeof SAVED];

  return (
    <Alert role="status">
      <CircleCheckIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
