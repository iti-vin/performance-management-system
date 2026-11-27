"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { GoalTemplateDetailResponseDto } from "@pms/shared-types";

import { StatusBadge } from "@/components/atoms/status-badge";
import { ConfirmationDialog } from "@/components/molecules/confirmation-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { GOAL_TEMPLATE_PATH } from "@/constants/goal-template-path";
import {
  TEMPLATE_VERSION_STATUS_LABELS,
  TEMPLATE_VERSION_STATUS_TONES,
} from "@/constants/domain-labels";
import { KpiGoalTemplateEditor } from "@/features/review-templates/components/kpi-goal-template-editor";
import { fromGoalTemplateDetail } from "@/features/review-templates/services/goal-template-editor-state";
import { TemplateArchiveAction } from "@/features/review-templates/components/template-archive-action";
import { PUBLISH_CONFIRMATION } from "@/features/review-templates/services/publish-confirmation";
import { archiveGoalTemplate, publishGoalTemplate } from "@/features/review-templates/services/manage-goal-template";

interface GoalTemplateDetailsViewProps {
  detail: GoalTemplateDetailResponseDto;
  positions: readonly { value: string; label: string }[];
  /** An older version that the page shows: it has no action. */
  shownVersion?: number;
}

/**
 * The details page: the builder layout, read-only. A draft offers Edit Draft and
 * Publish Template. A published template offers Edit Template, and stays
 * editable. An archived one has no actions.
 */
export function GoalTemplateDetailsView({ detail, positions, shownVersion }: GoalTemplateDetailsViewProps) {
  const [message, setMessage] = useState("");
  const [asking, setAsking] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { templateId, status, currentVersion } = detail.template;
  const editHref = `${GOAL_TEMPLATE_PATH}/${templateId}/edit`;

  function publish() {
    setMessage("");
    startTransition(async () => {
      // A success redirects, so a result here is always a failure message.
      setMessage((await publishGoalTemplate(templateId)).message);
    });
  }

  function archive() {
    setMessage("");
    startTransition(async () => {
      // A success redirects, so a result here is always a failure message.
      setMessage((await archiveGoalTemplate(templateId)).message);
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
      <KpiGoalTemplateEditor
        readOnly
        initialTemplate={fromGoalTemplateDetail(detail)}
        positions={positions}
        backHref={GOAL_TEMPLATE_PATH}
        onSave={() => undefined}
        statusLine={
          <span className="inline-flex items-center gap-2 text-pms-label">
            <StatusBadge
              label={TEMPLATE_VERSION_STATUS_LABELS[status]}
              tone={TEMPLATE_VERSION_STATUS_TONES[status]}
            />
            {currentVersion !== null && (
              <span className="text-muted-foreground">Version {shownVersion ?? currentVersion}</span>
            )}
          </span>
        }
        headerActions={
          shownVersion ? null : status === "draft" ? (
            <>
              {archiveAction}
              <Link
                href={editHref}
                className={buttonVariants({ variant: "outline", className: "min-h-pms-touch" })}
              >
                Edit Draft
              </Link>
              <Button
                type="button"
                className="min-h-pms-touch"
                disabled={isPending}
                onClick={() => setAsking(true)}
              >
                Publish Template
              </Button>
            </>
          ) : status === "published" ? (
            <>
              {archiveAction}
              <Link href={editHref} className={buttonVariants({ className: "min-h-pms-touch" })}>
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
