import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { FormPageSkeleton } from "@/components/templates/form-page-template";
import { GoalTemplateEditForm } from "@/features/review-templates/components/goal-template-edit-form";
import { GoalTemplateNotice } from "@/features/review-templates/components/goal-template-notice";
import { GOAL_TEMPLATE_PATH } from "@/constants/goal-template-path";
import { stateKey } from "@/features/review-templates/services/goal-template-editor-state";
import {
  getGoalTemplate,
  getGoalTemplatePositions,
} from "@/features/review-templates/services/goal-template-reader";
import { toPositionOptions } from "@/features/review-templates/services/goal-template-format";

export const metadata: Metadata = { title: "Edit KPI Goal Template" };

interface EditKpiGoalTemplatePageProps {
  params: Promise<{ "template-id": string }>;
}

async function EditKpiGoalTemplate({ params }: EditKpiGoalTemplatePageProps) {
  const { "template-id": templateId } = await params;
  const [result, positions] = await Promise.all([
    getGoalTemplate(templateId),
    getGoalTemplatePositions(),
  ]);
  if (result.kind === "not_found") notFound();
  if (result.kind !== "ok") return <GoalTemplateNotice kind={result.kind} />;
  if (positions.kind !== "ok") {
    return <GoalTemplateNotice kind={positions.kind === "not_found" ? "unavailable" : positions.kind} />;
  }
  // An archived template is read-only: send it back to its details.
  if (result.data.template.status === "archived") {
    redirect(`${GOAL_TEMPLATE_PATH}/${templateId}`);
  }

  return (
    <GoalTemplateEditForm
      key={stateKey(result.data)}
      detail={result.data}
      positions={toPositionOptions(positions.data, result.data.template.position)}
    />
  );
}

export default function EditKpiGoalTemplatePage(props: EditKpiGoalTemplatePageProps) {
  return (
    <Suspense fallback={<FormPageSkeleton />}>
      <EditKpiGoalTemplate {...props} />
    </Suspense>
  );
}
