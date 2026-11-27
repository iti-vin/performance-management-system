import type { Metadata } from "next";
import { Suspense } from "react";

import { ListingPageTemplate } from "@/components/templates/listing-page-template";

import { GoalsContent } from "./goals-content";
import { GoalsDescription } from "./goals-description";

const title = "Goals";

export const metadata: Metadata = { title };

export default function GoalsPage({ searchParams }: { searchParams?: Promise<{ record?: string | string[] }> }) {
  return (
    <ListingPageTemplate
      title={title}
      description={
        <Suspense fallback={null}>
          <GoalsDescription />
        </Suspense>
      }
    >
      <Suspense
        fallback={
          <p role="status" className="text-pms-body text-muted-foreground">
            Loading your goals.
          </p>
        }
      >
        <GoalsContent searchParams={searchParams} />
      </Suspense>
    </ListingPageTemplate>
  );
}
