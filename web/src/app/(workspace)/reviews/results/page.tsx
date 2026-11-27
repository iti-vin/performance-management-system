import type { Metadata } from "next";
import { Suspense } from "react";

import { ListingPageTemplate } from "@/components/templates/listing-page-template";

import { ResultsContent } from "./results-content";

const title = "Results";

export const metadata: Metadata = { title };

export default function ResultsPage() {
  return (
    <ListingPageTemplate title={title} description="Finalized performance results that you may read.">
      <Suspense
        fallback={
          <p role="status" className="text-pms-body text-muted-foreground">
            Loading the results.
          </p>
        }
      >
        <ResultsContent />
      </Suspense>
    </ListingPageTemplate>
  );
}
