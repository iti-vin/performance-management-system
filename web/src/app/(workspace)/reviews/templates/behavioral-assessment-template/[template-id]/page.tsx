import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DetailPageSkeleton } from "@/components/templates/detail-page-template";
import { BehavioralTemplateDetailsView } from "@/features/review-templates/components/behavioral-template-details-view";
import { GoalTemplateNotice } from "@/features/review-templates/components/goal-template-notice";
import { TemplateVersionHistory, parseTemplateVersion } from "@/features/review-templates/components/template-version-history";
import { BEHAVIORAL_TEMPLATE_PATH } from "@/constants/behavioral-template-path";
import { getBehavioralTemplate, getBehavioralTemplateVersions } from "@/features/review-templates/services/behavioral-template-reader";

export const metadata: Metadata = { title: "Behavioral Assessment Template Details" };

interface BehavioralTemplatePageProps {
  params: Promise<{ "template-id": string }>;
  searchParams: Promise<{ version?: string | string[] }>;
}

async function BehavioralTemplateRecord({ params, searchParams }: BehavioralTemplatePageProps) {
  const { "template-id": templateId } = await params;
  const shownVersion = parseTemplateVersion((await searchParams).version);
  const [result, history] = await Promise.all([
    getBehavioralTemplate(templateId, shownVersion),
    getBehavioralTemplateVersions(templateId),
  ]);

  if (result.kind === "not_found") notFound();
  if (result.kind !== "ok") {
    return <GoalTemplateNotice kind={result.kind} subject="behavioral assessment templates" />;
  }

  // A new key when the template changes, so the page never keeps the state of an older one.
  return (
    <>
      <BehavioralTemplateDetailsView
        key={`${result.data.template.updatedAt}-${shownVersion ?? ""}`}
        tree={result.data}
        shownVersion={shownVersion}
      />
      {history.kind === "ok" && (
        <TemplateVersionHistory versions={history.data} href={`${BEHAVIORAL_TEMPLATE_PATH}/${templateId}`} shownVersion={shownVersion} />
      )}
    </>
  );
}

export default function BehavioralTemplatePage(props: BehavioralTemplatePageProps) {
  return (
    <Suspense fallback={<DetailPageSkeleton aside={false} actions={0} />}>
      <BehavioralTemplateRecord {...props} />
    </Suspense>
  );
}
