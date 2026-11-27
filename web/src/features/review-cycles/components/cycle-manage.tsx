"use client";

import { useId, useState } from "react";

import { ConfirmationDialog } from "@/components/molecules/confirmation-dialog";
import { ReasonDialog } from "@/components/molecules/reason-dialog";
import { Button } from "@/components/ui/button";
import { toDateInput } from "@/features/review-cycles/services/cycle-draft";
import { launchConfirmation, scheduleConfirmation } from "@/features/review-cycles/services/launch-confirmation";

export const LAUNCH_FAILED = "The cycle was not launched";
export const SCHEDULE_FAILED = "The cycle was not scheduled";
export const CANCEL_FAILED = "The cycle was not cancelled";

type Outcome = Promise<{ message: string }>;

interface CycleManageProps {
  cycleName: string;
  participantCount: number;
  /** How many problems readiness found in the saved draft. */
  problemCount: number;
  /** True while the screen holds edits that are not saved: a launch uses the saved draft. */
  isDirty: boolean;
  isPending: boolean;
  /** The assessment start of the draft, as YYYY-MM-DD. A day ahead offers a schedule. */
  assessmentStart: string;
  onLaunch: () => Outcome;
  /** Left out where a draft cannot be scheduled. */
  onSchedule?: () => Outcome;
  onCancel: (input: { reason: string }) => Outcome;
  /** Runs an action as a transition and shows its message under the title when it fails. A success redirects. */
  run: (job: () => Outcome, failureTitle: string) => void;
}

/** Why a saved draft cannot launch yet: its problems first, then edits that are not saved. */
function launchBlockOf(problemCount: number, isDirty: boolean): string | null {
  if (problemCount > 0) return "Fix the problems above before you launch.";
  return isDirty ? "Save your changes first. A launch uses the saved draft." : null;
}

/** Launch Cycle and Cancel Cycle for the review step of a saved draft, each behind a dialog. */
export function CycleManage({
  cycleName,
  participantCount,
  problemCount,
  isDirty,
  isPending,
  assessmentStart,
  onLaunch,
  onSchedule,
  onCancel,
  run,
}: CycleManageProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const blockId = useId();
  const block = launchBlockOf(problemCount, isDirty);
  const confirmation = launchConfirmation(cycleName, participantCount);
  const [isScheduling, setIsScheduling] = useState(false);
  // Days compare as text. The server checks the day again, in Manila.
  const isAhead = assessmentStart > toDateInput(new Date().toISOString());

  return (
    <>
      <Button
        type="button"
        className="min-h-pms-touch rounded-pms-control"
        disabled={isPending || block !== null}
        aria-describedby={block ? blockId : undefined}
        onClick={() => setIsLaunching(true)}
      >
        Launch Cycle
      </Button>
      {isAhead && onSchedule && (
        <Button
          type="button"
          variant="outline"
          className="min-h-pms-touch rounded-pms-control"
          disabled={isPending || block !== null}
          aria-describedby={block ? blockId : undefined}
          onClick={() => setIsScheduling(true)}
        >
          Schedule Cycle
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        className="min-h-pms-touch rounded-pms-control"
        disabled={isPending}
        onClick={() => setIsCancelling(true)}
      >
        Cancel Cycle
      </Button>
      {block && (
        <p id={blockId} className="basis-full text-pms-label text-muted-foreground">
          {block}
        </p>
      )}

      <ConfirmationDialog
        open={isLaunching}
        title={confirmation.title}
        description={confirmation.description}
        confirmLabel={confirmation.confirmLabel}
        onClose={() => setIsLaunching(false)}
        onConfirm={() => {
          setIsLaunching(false);
          run(onLaunch, LAUNCH_FAILED);
        }}
      />
      <ConfirmationDialog
        open={isScheduling}
        {...scheduleConfirmation(cycleName, assessmentStart)}
        onClose={() => setIsScheduling(false)}
        onConfirm={() => {
          setIsScheduling(false);
          if (onSchedule) run(onSchedule, SCHEDULE_FAILED);
        }}
      />
      <ReasonDialog
        open={isCancelling}
        title="Cancel this cycle?"
        description="The cycle is kept for the record, but it can no longer be launched or edited. This cannot be undone."
        confirmLabel="Cancel Cycle"
        onClose={() => setIsCancelling(false)}
        onConfirm={(reason) => {
          setIsCancelling(false);
          run(() => onCancel({ reason }), CANCEL_FAILED);
        }}
      />
    </>
  );
}
