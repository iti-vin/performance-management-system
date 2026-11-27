import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { FormPageSkeleton } from "@/components/templates/form-page-template";
import { BEHAVIORAL_TEMPLATE_PATH } from "@/constants/behavioral-template-path";
import { BehavioralTemplateEditForm } from "@/features/review-templates/components/behavioral-template-edit-form";
import { GoalTemplateNotice } from "@/features/review-templates/components/goal-template-notice";
import { getBehavioralTemplate } from "@/features/review-templates/services/behavioral-template-reader";

export const metadata: Metadata = { title: "Edit Behavioral Assessment Template" };

interface EditBehavioralTemplatePageProps {
  params: Promise<{ "template-id": string }>;
}

async function EditBehavioralTemplate({ params }: EditBehavioralTemplatePageProps) {
  const { "template-id": templateId } = await params;
  const result = await getBehavioralTemplate(templateId);

  if (result.kind === "not_found") notFound();
  if (result.kind !== "ok") {
    return <GoalTemplateNotice kind={result.kind} subject="behavioral assessment templates" />;
  }
  // A draft is saved in place and a published template gets its next version. An archived one has no edit.
  if (result.data.template.status !== "draft" && result.data.template.status !== "published") {
    redirect(`${BEHAVIORAL_TEMPLATE_PATH}/${templateId}`);
  }

  return <BehavioralTemplateEditForm key={result.data.template.updatedAt} tree={result.data} />;
}

export default function EditBehavioralTemplatePage(props: EditBehavioralTemplatePageProps) {
  return (
    <Suspense fallback={<FormPageSkeleton />}>
      <EditBehavioralTemplate {...props} />
    </Suspense>
  );
}
