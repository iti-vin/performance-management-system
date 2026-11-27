import type { Metadata } from "next";
import { Suspense } from "react";

import { CycleWizard } from "@/features/review-cycles/components/cycle-wizard";
import { ReviewCycleNotice } from "@/features/review-cycles/components/review-cycles-content";
import { getReviewCycleOptions } from "@/features/review-cycles/services/review-cycle-reader";
import { createReviewCycle } from "@/features/review-cycles/services/save-review-cycle";

export const metadata: Metadata = { title: "Create Review Cycle" };

async function NewReviewCycle() {
  const result = await getReviewCycleOptions();
  if (result.kind !== "ok") return <ReviewCycleNotice kind={result.kind} />;

  // The wizard draws its own back link, header, and actions.
  return <CycleWizard options={result.data} onSave={createReviewCycle} backHref="/review-cycles" />;
}

export default function NewReviewCyclePage() {
  return (
    <Suspense fallback={null}>
      <NewReviewCycle />
    </Suspense>
  );
}
