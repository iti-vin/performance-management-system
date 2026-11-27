"use client";

import { ArrowLeftIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import type { ReviewCycleOptionsDto, ReviewCycleReadinessDto } from "@pms/shared-types";

import { UnsavedChangesDialog } from "@/components/molecules/unsaved-changes-dialog";
import { PageHeader } from "@/components/molecules/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CycleManage } from "@/features/review-cycles/components/cycle-manage";
import { CycleDetailsForm } from "@/features/review-cycles/components/cycle-details-form";
import { CycleReviewSummary } from "@/features/review-cycles/components/cycle-review-summary";
import { CycleSetupStepper } from "@/features/review-cycles/components/cycle-setup-stepper";
import { CycleStagesStep } from "@/features/review-cycles/components/cycle-stages-step";
import { CycleTemplatesStep } from "@/features/review-cycles/components/cycle-templates-step";
import { ParticipantSelection } from "@/features/review-cycles/components/participant-selection";
import {
  newCycleDraft,
  stepOfPath,
  toCycleRequest,
  type CycleDraft,
  type WizardStep,
} from "@/features/review-cycles/services/cycle-draft";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";

interface CycleWizardProps {
  options: ReviewCycleOptionsDto;
  /** Set to edit a saved draft: the draft to start from, and what blocks its launch. */
  edit?: {
    draft: CycleDraft;
    issues: ReviewCycleReadinessDto;
    removedParticipants?: number;
    /** Launches the saved draft. It redirects on success, and returns a message when it cannot. */
    onLaunch?: () => Promise<{ message: string }>;
    /** Schedules the saved draft for the day its assessment starts. */
    onSchedule?: () => Promise<{ message: string }>;
    /** Cancels the cycle with a reason. It redirects on success, and returns a message when it cannot. */
    onCancel?: (input: { reason: string }) => Promise<{ message: string }>;
  };
  /** Saves the draft. It redirects on success, and returns a message when it cannot. */
  onSave: (body: unknown) => Promise<{ message: string }>;
  /** Where the back link and the leave dialog go: the register. */
  backHref: string;
}

/** Saved participants that the options no longer list: the save removes them, so HR is told first. */
function removedNote(count: number): string {
  return count === 1
    ? "1 saved participant is no longer active in your company. A save removes it."
    : `${count} saved participants are no longer active in your company. A save removes them.`;
}

const SAVE_FAILED = "The cycle was not saved";

const STEP_ORDER: readonly WizardStep[] = ["details", "participants", "templates", "stages"];
const REVIEW_STEP = STEP_ORDER.length + 1;

/** Keys of the issues by their path, for example "name" or "stages.1.deadline": the first message of each. */
function errorsOf(issues: readonly { path: readonly PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[issue.path.join(".")] ??= issue.message;
  return errors;
}

interface WizardNoticesProps {
  step: number;
  removed: number;
  /** What did not happen: "The cycle was not saved", "...not launched", or "...not cancelled". */
  title: string;
  message: string;
  notes: readonly string[];
}

/** What HR must read before the next move: saved participants that a save removes, and why a save failed. */
function WizardNotices({ step, removed, title, message, notes }: WizardNoticesProps) {
  const showRemoved = removed > 0 && (step === 2 || step === REVIEW_STEP);
  const failure = [message, ...notes].filter(Boolean).join(" ");
  return (
    <>
      {showRemoved && (
        <Alert role="status">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertDescription>{removedNote(removed)}</AlertDescription>
        </Alert>
      )}
      {failure && (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
    </>
  );
}

interface StepBodyProps {
  step: number;
  draft: CycleDraft;
  options: ReviewCycleOptionsDto;
  errors: Record<string, string>;
  selectedEmployees: ReviewCycleOptionsDto["employees"];
  issues?: ReviewCycleReadinessDto;
  onEdit: (change: Partial<CycleDraft>) => void;
  onStep: (step: number) => void;
}

/** The body of the current step. */
function StepBody({ step, draft, options, errors, selectedEmployees, issues, onEdit, onStep }: StepBodyProps) {
  switch (step) {
    case 1:
      return <CycleDetailsForm values={draft} onChange={onEdit} errors={errors} />;
    case 2:
      return (
        <ParticipantSelection
          employees={options.employees}
          selectedIds={draft.participantIds}
          onSelectionChange={(participantIds) =>
            onEdit({
              participantIds,
              kpiChoices: Object.fromEntries(
                Object.entries(draft.kpiChoices).filter(([employeeId]) => participantIds.includes(employeeId)),
              ),
            })
          }
        />
      );
    case 3:
      return (
        <CycleTemplatesStep
          participants={selectedEmployees}
          kpiTemplates={options.kpiTemplates}
          behavioralTemplates={options.behavioralTemplates}
          choices={draft}
          onChange={onEdit}
          usesGoals={draft.usesGoals}
          usesBehavioral={draft.usesBehavioral}
        />
      );
    case 4:
      return (
        <CycleStagesStep
          stages={draft.stages}
          hrEvaluators={options.hrEvaluators}
          participantIds={draft.participantIds}
          onChange={(stages) => onEdit({ stages })}
          peers={{
            employees: options.employees,
            choices: draft.peerChoices,
            minimum: draft.anonymityMinimum,
            onChange: (peerChoices) => onEdit({ peerChoices }),
            onMinimumChange: (anonymityMinimum) => onEdit({ anonymityMinimum }),
          }}
          errors={errors}
        />
      );
    default:
      return <CycleReviewSummary draft={draft} issues={issues} onFix={onStep} />;
  }
}

interface WizardActionsProps {
  step: number;
  isPending: boolean;
  onStep: (step: number) => void;
  onSave: () => void;
  /** Launch Cycle and Cancel Cycle: only the review step of a saved draft has them. */
  manage?: ReactNode;
}

/** Back and Continue move between the steps. Save as Draft is on every step. */
function WizardActions({ step, isPending, onStep, onSave, manage }: WizardActionsProps) {
  const isLast = step === REVIEW_STEP;
  return (
    <div className="flex flex-wrap gap-2">
      {step > 1 && (
        <Button type="button" variant="outline" className="min-h-pms-touch rounded-pms-control" onClick={() => onStep(step - 1)}>
          Back
        </Button>
      )}
      {!isLast && (
        <Button type="button" className="min-h-pms-touch rounded-pms-control" onClick={() => onStep(step + 1)}>
          Continue
        </Button>
      )}
      <Button
        type="button"
        variant={isLast ? "default" : "outline"}
        className="min-h-pms-touch rounded-pms-control"
        disabled={isPending}
        onClick={onSave}
      >
        {isPending ? "Saving…" : "Save as Draft"}
      </Button>
      {isLast && manage}
    </div>
  );
}

export function CycleWizard({ options, edit, onSave, backHref }: CycleWizardProps) {
  const router = useRouter();
  // A new cycle starts blank. A saved draft starts as saved, and a leave or a hide returns to that.
  const initialDraft = useMemo(() => edit?.draft ?? newCycleDraft(), [edit?.draft]);
  const [draft, setDraft] = useState<CycleDraft>(initialDraft);
  const [step, setStep] = useState(1);
  // A saved draft has been through every step, so HR may open any of them.
  const firstFurthest = edit ? REVIEW_STEP : 1;
  const [furthest, setFurthest] = useState(firstFurthest);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [failureTitle, setFailureTitle] = useState(SAVE_FAILED);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  useUnsavedChangesWarning(isDirty);

  /** Next keeps a page that the user left, hidden. A return must show a blank wizard, as the template builders do. */
  const startOver = useCallback(() => {
    setDraft(initialDraft);
    setStep(1);
    setFurthest(firstFurthest);
    setErrors({});
    setMessage("");
    setIsLeaving(false);
  }, [initialDraft, firstFurthest]);
  useEffect(() => startOver, [startOver]);

  function change(changes: Partial<CycleDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setErrors({});
    setMessage("");
  }

  function goTo(target: number) {
    setStep(target);
    setFurthest((current) => Math.max(current, target));
  }

  function save() {
    const result = toCycleRequest(draft, options);
    if (!result.success) {
      setErrors(errorsOf(result.error.issues));
      const owner = stepOfPath(result.error.issues[0]?.path ?? []);
      setStep(STEP_ORDER.indexOf(owner) + 1);
      return;
    }
    setErrors({});
    setMessage("");
    startTransition(async () => {
      // A success redirects, so a result here is always a failure message.
      const outcome = await onSave(result.data);
      fail(SAVE_FAILED, outcome.message);
      setStep(REVIEW_STEP);
    });
  }

  /** Shows what did not happen. The words come from the action: a success redirects. */
  function fail(title: string, text: string) {
    setFailureTitle(title);
    setMessage(text);
  }

  /** Runs a launch or a cancel. It redirects on success, so a result here is the message of a refusal. */
  function run(job: () => Promise<{ message: string }>, title: string) {
    startTransition(async () => {
      const outcome = await job();
      fail(title, outcome.message);
    });
  }

  const removed = edit?.removedParticipants ?? 0;
  const selectedEmployees = options.employees.filter((person) => draft.participantIds.includes(person.employeeId));
  // Problems that have no field of their own: the participants and their template choices.
  const stepNotes = Object.entries(errors)
    .filter(([path]) => path.startsWith("participants"))
    .map(([, text]) => text);

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-pms-dashboard gap-pms-section px-pms-gutter">
      <Link
        href={backHref}
        className="inline-flex min-h-pms-touch w-fit items-center gap-2 rounded-pms-control text-pms-body text-primary hover:underline"
        onClick={(event) => {
          if (!isDirty) return;
          event.preventDefault();
          setIsLeaving(true);
        }}
      >
        <ArrowLeftIcon aria-hidden="true" className="size-pms-icon-control" />
        Back to Cycles
      </Link>
      <PageHeader
        title={edit ? "Edit Review Cycle" : "Create Review Cycle"}
        description="Configure position-based performance indicators, behavioral assessments, and the assessment sequence."
      />

      <CycleSetupStepper currentStep={step} furthestStep={furthest} onStepChange={goTo} />

      <WizardNotices step={step} removed={removed} title={failureTitle} message={message} notes={stepNotes} />

      <StepBody
        step={step}
        draft={draft}
        options={options}
        errors={errors}
        selectedEmployees={selectedEmployees}
        issues={edit?.issues}
        onEdit={change}
        onStep={goTo}
      />

      <WizardActions
        step={step}
        isPending={isPending}
        onStep={goTo}
        onSave={save}
        manage={
          edit?.onLaunch && edit.onCancel ? (
            <CycleManage
              cycleName={initialDraft.name.trim()}
              participantCount={initialDraft.participantIds.length}
              problemCount={edit.issues.length}
              isDirty={isDirty}
              isPending={isPending}
              onLaunch={edit.onLaunch}
              assessmentStart={initialDraft.assessmentStart}
              onSchedule={edit.onSchedule}
              onCancel={edit.onCancel}
              run={run}
            />
          ) : undefined
        }
      />

      <UnsavedChangesDialog
        open={isLeaving}
        onStay={() => setIsLeaving(false)}
        onLeave={() => {
          startOver();
          router.push(backHref);
        }}
      />
    </div>
  );
}
