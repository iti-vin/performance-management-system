import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DetailPageSkeleton } from "@/components/templates/detail-page-template";
import { GoalTemplateDetailsView } from "@/features/review-templates/components/goal-template-details-view";
import { GoalTemplateNotice } from "@/features/review-templates/components/goal-template-notice";
import { TemplateVersionHistory, parseTemplateVersion } from "@/features/review-templates/components/template-version-history";
import { GOAL_TEMPLATE_PATH } from "@/constants/goal-template-path";
import { stateKey } from "@/features/review-templates/services/goal-template-editor-state";
import {
  getGoalTemplate,
  getGoalTemplatePositions,
  getGoalTemplateVersions,
} from "@/features/review-templates/services/goal-template-reader";
import { toPositionOptions } from "@/features/review-templates/services/goal-template-format";

export const metadata: Metadata = { title: "KPI Goal Template Details" };

interface KpiGoalTemplatePageProps {
  params: Promise<{ "template-id": string }>;
  searchParams: Promise<{ version?: string | string[] }>;
}

async function KpiGoalTemplateRecord({ params, searchParams }: KpiGoalTemplatePageProps) {
  const { "template-id": templateId } = await params;
  const shownVersion = parseTemplateVersion((await searchParams).version);
  const [result, positions, history] = await Promise.all([
    getGoalTemplate(templateId, shownVersion),
    getGoalTemplatePositions(),
    getGoalTemplateVersions(templateId),
  ]);
  if (result.kind === "not_found") notFound();
  if (result.kind !== "ok") return <GoalTemplateNotice kind={result.kind} />;

  // The position list only names the position. Without it the page still shows the template.
  return (
    <>
      <GoalTemplateDetailsView
        key={`${stateKey(result.data)}-${shownVersion ?? ""}`}
        detail={result.data}
        shownVersion={shownVersion}
        positions={toPositionOptions(
          positions.kind === "ok" ? positions.data : [],
          result.data.template.position,
        )}
      />
      {history.kind === "ok" && (
        <TemplateVersionHistory versions={history.data} href={`${GOAL_TEMPLATE_PATH}/${templateId}`} shownVersion={shownVersion} />
      )}
    </>
  );
}

export default function KpiGoalTemplateRecordPage(props: KpiGoalTemplatePageProps) {
  return (
    <Suspense fallback={<DetailPageSkeleton aside={false} actions={0} />}>
      <KpiGoalTemplateRecord {...props} />
    </Suspense>
  );
}
