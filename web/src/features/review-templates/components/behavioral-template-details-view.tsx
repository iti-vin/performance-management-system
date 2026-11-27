"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { BehavioralTemplateTreeResponseDto } from "@pms/shared-types";

import { StatusBadge } from "@/components/atoms/status-badge";
import { ConfirmationDialog } from "@/components/molecules/confirmation-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { BEHAVIORAL_TEMPLATE_PATH } from "@/constants/behavioral-template-path";
import {
  TEMPLATE_VERSION_STATUS_LABELS,
  TEMPLATE_VERSION_STATUS_TONES,
} from "@/constants/domain-labels";
import { BehavioralTemplateEditor } from "@/features/review-templates/components/behavioral-template-editor";
import { fromBehavioralTemplateTree } from "@/features/review-templates/services/behavioral-template-editor-state";
import { TemplateArchiveAction } from "@/features/review-templates/components/template-archive-action";
import { PUBLISH_CONFIRMATION } from "@/features/review-templates/services/publish-confirmation";
import { archiveBehavioralTemplate, publishBehavioralTemplate } from "@/features/review-templates/services/manage-behavioral-template";

/**
 * The details page: the form as text. A draft offers Edit Draft and Publish
 * Template. A published template offers Edit Template: the edit publishes its
 * next version, and the published version stays as it is. An archived one has
 * no action.
 */
export function BehavioralTemplateDetailsView({ tree, shownVersion }: { tree: BehavioralTemplateTreeResponseDto; shownVersion?: number }) {
  const [message, setMessage] = useState("");
  const [asking, setAsking] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { templateId, status, currentVersion } = tree.template;

  function publish() {
    setMessage("");
    startTransition(async () => {
      // A success redirects, so a result here is always a failure message.
      setMessage((await publishBehavioralTemplate(templateId)).message);
    });
  }

  function archive() {
    setMessage("");
    startTransition(async () => {
      // A success redirects, so a result here is always a failure message.
      setMessage((await archiveBehavioralTemplate(templateId)).message);
    });
  }

  const archiveAction = <TemplateArchiveAction disabled={isPending} onConfirm={archive} />;

  return (
    <>
      {message && (
        <Alert variant="destructive" role="alert" className="mx-auto mb-2 max-w-pms-form">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <BehavioralTemplateEditor
        readOnly
        initialTemplate={fromBehavioralTemplateTree(tree)}
        backHref={BEHAVIORAL_TEMPLATE_PATH}
        onSave={() => undefined}
        statusLine={
          <span className="inline-flex items-center gap-2 text-pms-label">
            <StatusBadge
              label={TEMPLATE_VERSION_STATUS_LABELS[status]}
              tone={TEMPLATE_VERSION_STATUS_TONES[status]}
            />
            <span className="text-muted-foreground">Version {shownVersion ?? currentVersion}</span>
          </span>
        }
        headerActions={
          shownVersion ? null : status === "draft" ? (
            <>
              {archiveAction}
              <Link
                href={`${BEHAVIORAL_TEMPLATE_PATH}/${templateId}/edit`}
                className={buttonVariants({ variant: "outline", className: "min-h-pms-touch" })}
              >
                Edit Draft
              </Link>
              <Button type="button" className="min-h-pms-touch" disabled={isPending} onClick={() => setAsking(true)}>
                Publish Template
              </Button>
            </>
          ) : status === "published" ? (
            <>
              {archiveAction}
              <Link
              href={`${BEHAVIORAL_TEMPLATE_PATH}/${templateId}/edit`}
              className={buttonVariants({ className: "min-h-pms-touch" })}
            >
              Edit Template
            </Link>
            </>
          ) : null
        }
      />
      <ConfirmationDialog
        open={asking}
        title={PUBLISH_CONFIRMATION.title}
        description={PUBLISH_CONFIRMATION.description}
        confirmLabel={PUBLISH_CONFIRMATION.confirmLabel}
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          publish();
        }}
      />
    </>
  );
}
