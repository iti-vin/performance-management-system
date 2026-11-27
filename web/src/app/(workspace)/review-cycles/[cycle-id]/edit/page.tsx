import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CycleWizard } from "@/features/review-cycles/components/cycle-wizard";
import { ReviewCycleNotice } from "@/features/review-cycles/components/review-cycles-content";
import { draftFromDetail } from "@/features/review-cycles/services/cycle-draft";
import {
  getReviewCycle,
  getReviewCycleOptions,
  getReviewCycleReadiness,
} from "@/features/review-cycles/services/review-cycle-reader";
import { cancelReviewCycle, launchReviewCycle, scheduleReviewCycle } from "@/features/review-cycles/services/manage-review-cycle";
import { updateReviewCycle } from "@/features/review-cycles/services/save-review-cycle";

export const metadata: Metadata = { title: "Edit Review Cycle" };

interface EditReviewCyclePageProps {
  params: Promise<{ "cycle-id": string }>;
}

async function EditReviewCycle({ params }: EditReviewCyclePageProps) {
  const { "cycle-id": cycleId } = await params;
  const [cycle, options, readiness] = await Promise.all([
    getReviewCycle(cycleId),
    getReviewCycleOptions(),
    getReviewCycleReadiness(cycleId),
  ]);

  if (cycle.kind === "not_found") notFound();
  if (cycle.kind !== "ok") return <ReviewCycleNotice kind={cycle.kind} />;
  if (options.kind !== "ok") return <ReviewCycleNotice kind={options.kind} />;
  if (readiness.kind !== "ok") return <ReviewCycleNotice kind={readiness.kind} />;
  if (cycle.data.state !== "draft") return <ReviewCycleNotice kind="not_draft" />;

  // A saved participant that the options no longer list is left out of the draft: the wizard says how many.
  const draft = draftFromDetail(cycle.data, options.data);
  const removedParticipants = cycle.data.participants.length - draft.participantIds.length;

  // The wizard draws its own back link, header, and actions.
  return (
    <CycleWizard
      options={options.data}
      edit={{
        draft,
        issues: readiness.data,
        removedParticipants,
        onLaunch: launchReviewCycle.bind(null, cycleId),
        onSchedule: scheduleReviewCycle.bind(null, cycleId),
        onCancel: cancelReviewCycle.bind(null, cycleId),
      }}
      onSave={updateReviewCycle.bind(null, cycleId)}
      backHref="/review-cycles"
    />
  );
}

export default function EditReviewCyclePage({ params }: EditReviewCyclePageProps) {
  return (
    <Suspense fallback={null}>
      <EditReviewCycle params={params} />
    </Suspense>
  );
}
