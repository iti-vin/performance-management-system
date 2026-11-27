import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/molecules/page-header";

import { DetailsContent, type DetailsContentProps } from "./details-content";

const title = "Cycle Details";

export const metadata: Metadata = { title };

export default function CycleDetailsPage({ params, searchParams }: DetailsContentProps) {
  return (
    <div className="grid w-full min-w-0 gap-4 px-3 py-6">
      <PageHeader title={title} />
      <Suspense
        fallback={
          <p role="status" className="text-pms-body text-muted-foreground">
            Loading the cycle.
          </p>
        }
      >
        <DetailsContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
