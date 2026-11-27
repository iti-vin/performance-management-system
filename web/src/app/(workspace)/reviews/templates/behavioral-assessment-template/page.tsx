import type { Metadata } from "next";
import { Suspense } from "react";

import { ListingPageTemplate } from "@/components/templates/listing-page-template";
import { BehavioralTemplateCreateAction } from "@/features/review-templates/components/behavioral-template-create-action";
import { BehavioralTemplateList } from "@/features/review-templates/components/behavioral-template-list";
import { GoalTemplateNotice } from "@/features/review-templates/components/goal-template-notice";
import { GoalTemplateSavedNotice } from "@/features/review-templates/components/goal-template-saved-notice";
import { getBehavioralTemplates } from "@/features/review-templates/services/behavioral-template-reader";

const title = "Behavioral Assessment Templates";
const SUBJECT = "behavioral assessment templates";

export const metadata: Metadata = { title };

interface BehavioralTemplatePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function BehavioralTemplates({ searchParams }: BehavioralTemplatePageProps) {
  const [result, params] = await Promise.all([getBehavioralTemplates(), searchParams]);

  if (result.kind !== "ok") {
    return (
      <GoalTemplateNotice
        kind={result.kind === "not_found" ? "unavailable" : result.kind}
        subject={SUBJECT}
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      <GoalTemplateSavedNotice saved={params.saved} />
      <BehavioralTemplateList templates={result.data} />
    </div>
  );
}

export default function BehavioralAssessmentTemplatePage({
  searchParams,
}: BehavioralTemplatePageProps) {
  return (
    <ListingPageTemplate
      title={title}
      description="Create and manage reusable forms for employee performance evaluations."
      actions={
        <Suspense fallback={null}>
          <BehavioralTemplateCreateAction />
        </Suspense>
      }
    >
      <Suspense fallback={<BehavioralTemplateList templates={[]} isLoading />}>
        <BehavioralTemplates searchParams={searchParams} />
      </Suspense>
    </ListingPageTemplate>
  );
}
