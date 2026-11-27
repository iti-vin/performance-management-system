import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/molecules/page-header";

import { RESULT_TITLE, ResultContent, type ResultContentProps } from "./result-content";

export const metadata: Metadata = { title: RESULT_TITLE };

export default function ResultPage({ params, searchParams }: ResultContentProps) {
  return (
    <div className="grid w-full min-w-0 gap-4 px-3 py-6">
      <Suspense
        fallback={
          <>
            <PageHeader title={RESULT_TITLE} />
            <p role="status" className="text-pms-body text-muted-foreground">
              Loading the result.
            </p>
          </>
        }
      >
        <ResultContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
