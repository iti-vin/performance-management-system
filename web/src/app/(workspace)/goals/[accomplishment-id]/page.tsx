import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/molecules/page-header";

import { GoalsDescription } from "../goals-description";
import { RecordContent, type RecordContentProps } from "./record-content";

const title = "Goals";

export const metadata: Metadata = { title };

export default function AccomplishmentPage({ params }: RecordContentProps) {
  return (
    <div className="grid w-full min-w-0 gap-4 px-3 py-6">
      <PageHeader
        title={title}
        description={
          <Suspense fallback={null}>
            <GoalsDescription />
          </Suspense>
        }
      />
      <Suspense
        fallback={
          <p role="status" className="text-pms-body text-muted-foreground">
            Loading the report.
          </p>
        }
      >
        <RecordContent params={params} />
      </Suspense>
    </div>
  );
}
