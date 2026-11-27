import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/molecules/page-header";

import { REVIEW_TITLE, ReviewContent, type ReviewContentProps } from "./review-content";

export const metadata: Metadata = { title: REVIEW_TITLE };

export default function ReviewPage({ params, searchParams }: ReviewContentProps) {
  return (
    <div className="grid w-full min-w-0 gap-4 px-3 py-6">
      {/* The line under the heading names the employee, so the heading comes with the review. */}
      <Suspense
        fallback={
          <>
            <PageHeader title={REVIEW_TITLE} />
            <p role="status" className="text-pms-body text-muted-foreground">
              Loading the review.
            </p>
          </>
        }
      >
        <ReviewContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
