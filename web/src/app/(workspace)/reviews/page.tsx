import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ListingPageTemplate } from "@/components/templates/listing-page-template";
import { buttonVariants } from "@/components/ui/button";
import { ReviewsContent } from "@/features/review-cycles/components/reviews-content";
import { ReviewsTable } from "@/features/review-cycles/components/reviews-table";
import type { RawSearchParams } from "@/features/review-cycles/services/review-list-params";

const title = "Reviews";

export const metadata: Metadata = { title };

export default function ReviewsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return (
    <ListingPageTemplate
      title={title}
      description="View, complete, and manage employee performance evaluations."
      actions={
        <Link href="/reviews/results" className={buttonVariants({ variant: "outline", className: "min-h-pms-touch rounded-pms-control" })}>
          View Results
        </Link>
      }
    >
      <Suspense fallback={<ReviewsTable rows={[]} isLoading emptyMessage="" />}>
        <ReviewsContent searchParams={searchParams} />
      </Suspense>
    </ListingPageTemplate>
  );
}
