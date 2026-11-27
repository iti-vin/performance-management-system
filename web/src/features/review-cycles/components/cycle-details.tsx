"use client";

import type { CycleHistoryEntryDto, ReleaseResultsRequestDto, ResultRowDto, ReviewCycleDetailDto, ReviewCycleParticipantDto } from "@pms/shared-types";
import { ChevronLeftIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { StatusBadge } from "@/components/atoms/status-badge";
import { ListingTabs } from "@/components/molecules/listing-tabs";
import { ConfirmationDialog } from "@/components/molecules/confirmation-dialog";
import { ReasonDialog } from "@/components/molecules/reason-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { CYCLE_STATUS_LABELS, CYCLE_STATUS_TONES, REVIEW_TYPE_LABELS } from "@/constants/domain-labels";
import { CycleHistoryTab } from "@/features/review-cycles/components/cycle-history-tab";
import { CycleOverview } from "@/features/review-cycles/components/cycle-overview";
import { CycleParticipantsTab } from "@/features/review-cycles/components/cycle-participants-tab";
import { CycleProgressTab, type ReopenTarget } from "@/features/review-cycles/components/cycle-progress-tab";
import { CycleResultsTab, type CycleResultsTabProps } from "@/features/review-cycles/components/cycle-results-tab";
import { ExtendDeadlinesDialog, type ExtensionInput } from "@/features/review-cycles/components/extend-deadlines-dialog";
import { describeReopening, isOpenToChanges } from "@/features/review-cycles/services/cycle-changes";
import { formatWorkspaceDate } from "@/utils/workspace-date";

const LIST_PATH = "/review-cycles";
const TABS = [
  { value: "overview", label: "Overview" },
  { value: "participants", label: "Participants" },
  { value: "progress", label: "Progress" },
  { value: "results", label: "Results" },
  { value: "history", label: "History" },
] as const;
type Tab = (typeof TABS)[number]["value"];

/** A draft is cancelled from the wizard. A completed or cancelled cycle is final. */
const CANCELLABLE: readonly ReviewCycleDetailDto["state"][] = ["scheduled", "active"];

interface TabBodyProps {
  tab: Tab;
  cycle: ReviewCycleDetailDto;
  participants: readonly ReviewCycleParticipantDto[];
  onReopen?: (target: ReopenTarget) => void;
  results: Omit<CycleResultsTabProps, "cycle">;
  history: readonly CycleHistoryEntryDto[] | null;
}

function TabBody({ tab, cycle, participants, onReopen, results, history }: TabBodyProps) {
  switch (tab) {
    case "overview":
      return <CycleOverview cycle={cycle} />;
    case "participants":
      return (
        <div className="rounded-pms-card border border-border bg-card p-4">
          <CycleParticipantsTab participants={participants} listKey={`participants:${cycle.cycleId}`} />
        </div>
      );
    case "progress":
      return <CycleProgressTab participants={participants} onReopen={onReopen} listKey={`progress:${cycle.cycleId}`} />;
    case "results":
      return <CycleResultsTab cycle={cycle} {...results} />;
    case "history":
      return <CycleHistoryTab entries={history} />;
  }
}

/** When a scheduled cycle starts, and what would keep it from starting (PRD Cyc-008). */
function ScheduleNotice({ activationDate, problems }: { activationDate: string | null; problems: readonly string[] }) {
  return (
    <>
      <p className="text-pms-body">{`Starts on ${formatWorkspaceDate(activationDate)}.`}</p>
      {problems.length > 0 && (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>This cycle cannot activate yet</AlertTitle>
          <AlertDescription>
            <ul>
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
            <p>Return it to draft to repair it.</p>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

export interface CycleDetailsProps {
  cycle: ReviewCycleDetailDto;
  participants: readonly ReviewCycleParticipantDto[];
  /** The tab of the address. An unknown one opens the overview. */
  tab: string;
  onCancel: (input: { reason: string }) => Promise<{ message: string }>;
  onExtend: (input: ExtensionInput) => Promise<{ message: string }>;
  onReopen: (input: { assignmentId: string; reason: string }) => Promise<{ message: string }>;
  /** The recorded changes, read for the History tab only. Null when they could not be read. */
  history?: readonly CycleHistoryEntryDto[] | null;
  /** The finalized results: empty before finalization. */
  results: readonly ResultRowDto[];
  onFinalize: () => Promise<{ message: string }>;
  onRelease: (readers: ReleaseResultsRequestDto) => Promise<{ message: string }>;
  onUnschedule: () => Promise<{ message: string }>;
  /** What readiness finds in a scheduled cycle: it activates only without any. */
  problems: readonly string[];
}

/** One launched or finished cycle: its header, and its tabs. The tab lives in the address. */
export function CycleDetails(props: CycleDetailsProps) {
  const { history = [], cycle, participants, tab, results, problems, onCancel, onExtend, onReopen, onFinalize, onRelease, onUnschedule } =
    props;
  const [isReturning, setIsReturning] = useState(false);
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [reopening, setReopening] = useState<ReopenTarget | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const shown = TABS.find((item) => item.value === tab)?.value ?? "overview";
  const period = `${formatWorkspaceDate(cycle.evaluationStart)} to ${formatWorkspaceDate(cycle.evaluationEnd)}`;

  const isOpen = isOpenToChanges(cycle);

  /** A change of the header or a row: a refusal shows above the cycle. */
  function run(change: () => Promise<{ message: string }>) {
    setMessage("");
    startTransition(async () => setMessage((await change()).message));
  }

  function cancel(reason: string) {
    setIsCancelling(false);
    // A success redirects, so a result here is always a refusal.
    run(() => onCancel({ reason }));
  }

  function reopen(reason: string) {
    if (!reopening) return;
    const { assignmentId } = reopening;
    setReopening(null);
    run(() => onReopen({ assignmentId, reason }));
  }

  return (
    <div className="grid min-w-0 gap-4">
      <Link href={LIST_PATH} className={buttonVariants({ variant: "ghost", className: "min-h-pms-touch w-fit text-muted-foreground" })}>
        <ChevronLeftIcon aria-hidden="true" />
        Back to Cycles
      </Link>
      {message && (
        <Alert variant="destructive" role="alert">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <section className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-pms-card border border-border bg-card p-4">
        <div className="grid min-w-0 gap-1">
          <h2 className="text-pms-section-title wrap-break-word">{cycle.name}</h2>
          {cycle.description && (
            <p className="max-w-pms-copy text-pms-body whitespace-pre-wrap wrap-break-word">{cycle.description}</p>
          )}
          <p className="text-pms-label text-muted-foreground">{`${REVIEW_TYPE_LABELS[cycle.reviewType]} · ${period}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge label={CYCLE_STATUS_LABELS[cycle.state]} tone={CYCLE_STATUS_TONES[cycle.state]} />
          {cycle.state === "scheduled" && (
            <Button
              type="button"
              variant="outline"
              className="min-h-pms-touch rounded-pms-control"
              disabled={isPending}
              onClick={() => setIsReturning(true)}
            >
              Back to Draft
            </Button>
          )}
          {isOpen && (
            <Button
              type="button"
              variant="outline"
              className="min-h-pms-touch rounded-pms-control"
              disabled={isPending}
              onClick={() => setIsExtending(true)}
            >
              Extend Deadlines
            </Button>
          )}
          {CANCELLABLE.includes(cycle.state) && (
            <Button
              type="button"
              variant="outline"
              className="min-h-pms-touch rounded-pms-control"
              disabled={isPending}
              onClick={() => setIsCancelling(true)}
            >
              Cancel Cycle
            </Button>
          )}
        </div>
      </section>
      {cycle.state === "scheduled" && <ScheduleNotice activationDate={cycle.activationDate} problems={problems} />}
      <ListingTabs
        label="Cycle sections"
        tabs={TABS}
        value={shown}
        onChange={(next) => router.replace(`${LIST_PATH}/${cycle.cycleId}?tab=${next}`, { scroll: false })}
      />
      <TabBody
        tab={shown}
        cycle={cycle}
        participants={participants}
        onReopen={isOpen && !isPending ? setReopening : undefined}
        history={history}
        results={{ results, isPending, onFinalize: () => run(onFinalize), onRelease: (readers) => run(() => onRelease(readers)) }}
      />
      <ConfirmationDialog
        open={isReturning}
        title="Return this cycle to draft?"
        description="It no longer activates by itself. Change it, then launch or schedule it again."
        confirmLabel="Back to Draft"
        onClose={() => setIsReturning(false)}
        onConfirm={() => {
          setIsReturning(false);
          run(onUnschedule);
        }}
      />
      <ExtendDeadlinesDialog open={isExtending} cycle={cycle} onClose={() => setIsExtending(false)} onSubmit={onExtend} />
      <ReasonDialog
        open={reopening !== null}
        title="Reopen this review?"
        description={reopening ? describeReopening(reopening.person, reopening.assignmentId) : ""}
        confirmLabel="Reopen Review"
        onClose={() => setReopening(null)}
        onConfirm={reopen}
      />
      <ReasonDialog
        open={isCancelling}
        title="Cancel this cycle?"
        description="The cycle accepts no new work and releases no results. It is kept for the record. This cannot be undone."
        confirmLabel="Cancel Cycle"
        onClose={() => setIsCancelling(false)}
        onConfirm={cancel}
      />
    </div>
  );
}
