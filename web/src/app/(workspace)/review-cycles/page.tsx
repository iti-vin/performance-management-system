import type { Metadata } from "next";
import { Suspense } from "react";

import { ListingPageTemplate } from "@/components/templates/listing-page-template";
import { CycleAttention } from "@/features/review-cycles/components/cycle-attention";
import { getCycleAttention } from "@/features/review-cycles/services/attention-reader";
import { ReviewCycleSavedNotice } from "@/features/review-cycles/components/review-cycle-saved-notice";
import { ReviewCyclesContent } from "@/features/review-cycles/components/review-cycles-content";
import { ReviewCyclesTable } from "@/features/review-cycles/components/review-cycles-table";
import { getReviewCycles } from "@/features/review-cycles/services/review-cycle-reader";

import { CreateCycleAction } from "./create-cycle-action";

export const metadata: Metadata = { title: "Review Cycles" };

interface ReviewCyclesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function ReviewCycles({ searchParams }: ReviewCyclesPageProps) {
  const [result, params] = await Promise.all([getReviewCycles(), searchParams]);

  return (
    <div className="grid min-w-0 gap-4">
      <ReviewCycleSavedNotice saved={params.saved} />
      <ReviewCyclesContent result={result} />
    </div>
  );
}

async function Attention() {
  const result = await getCycleAttention();
  // A caller who may not read the register gets its notice there: one is enough.
  if (result.kind === "forbidden" || result.kind === "signed_out") return null;
  return <CycleAttention items={result.kind === "ok" ? result.data : null} />;
}

export default function ReviewCyclesPage({ searchParams }: ReviewCyclesPageProps) {
  return (
    <ListingPageTemplate
      title="Review Cycles"
      description="Plan, launch, and monitor employee performance review cycles."
      actions={
        <Suspense fallback={null}>
          <CreateCycleAction />
        </Suspense>
      }
    >
      <Suspense fallback={null}>
        <Attention />
      </Suspense>
      <Suspense fallback={<ReviewCyclesTable rows={[]} isLoading />}>
        <ReviewCycles searchParams={searchParams} />
      </Suspense>
    </ListingPageTemplate>
  );
}
