import type { Metadata } from "next";
import { Suspense } from "react";

import { ListingPageTemplate } from "@/components/templates/listing-page-template";
import { GoalTemplateCreateAction } from "@/features/review-templates/components/goal-template-create-action";
import { GoalTemplateList } from "@/features/review-templates/components/goal-template-list";
import { GoalTemplateListing } from "@/features/review-templates/components/goal-template-listing";
import { GoalTemplateNotice } from "@/features/review-templates/components/goal-template-notice";
import { GoalTemplateSavedNotice } from "@/features/review-templates/components/goal-template-saved-notice";
import { getGoalTemplates } from "@/features/review-templates/services/goal-template-reader";
import {
  parseGoalTemplateParams,
  selectGoalTemplates,
} from "@/features/review-templates/services/goal-template-selection";

const title = "KPI Goal Templates";

export const metadata: Metadata = { title };

interface KpiGoalTemplatePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function KpiGoalTemplates({ searchParams }: KpiGoalTemplatePageProps) {
  const [result, rawParams] = await Promise.all([
    getGoalTemplates(),
    searchParams,
  ]);

  if (result.kind !== "ok") {
    return (
      <GoalTemplateNotice
        kind={result.kind === "not_found" ? "unavailable" : result.kind}
      />
    );
  }
  const notice = <GoalTemplateSavedNotice saved={rawParams.saved} />;
  // No templates at all: show the empty state, not an empty filtered table.
  if (result.data.length === 0) {
    return (
      <div className="grid min-w-0 gap-4">
        {notice}
        <GoalTemplateList templates={[]} />
      </div>
    );
  }

  const params = parseGoalTemplateParams(rawParams);
  const selection = selectGoalTemplates(result.data, params);
  return (
    <div className="grid min-w-0 gap-4">
      {notice}
      <GoalTemplateListing
        rows={selection.rows}
        total={selection.total}
        page={selection.page}
        params={params}
      />
    </div>
  );
}

export default function KpiGoalTemplatePage({
  searchParams,
}: KpiGoalTemplatePageProps) {
  return (
    <ListingPageTemplate
      title={title}
      description="Define measurable, role-specific performance indicators."
      actions={
        <Suspense fallback={null}>
          <GoalTemplateCreateAction />
        </Suspense>
      }
    >
      <Suspense fallback={<GoalTemplateList templates={[]} isLoading />}>
        <KpiGoalTemplates searchParams={searchParams} />
      </Suspense>
    </ListingPageTemplate>
  );
}
