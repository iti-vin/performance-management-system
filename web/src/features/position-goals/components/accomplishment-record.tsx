"use client";

import type { AccomplishmentDecisionRequestDto, AccomplishmentDetailDto, ReportIndicatorActualsRequestDto } from "@pms/shared-types";
import { ChevronLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { ConfirmationDialog } from "@/components/molecules/confirmation-dialog";
import { FormSelect } from "@/components/molecules/form-select";
import { UnsavedChangesDialog } from "@/components/molecules/unsaved-changes-dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { AccomplishmentHistory } from "@/features/position-goals/components/accomplishment-history";
import { AccomplishmentSummary } from "@/features/position-goals/components/accomplishment-summary";
import { AccomplishmentValues } from "@/features/position-goals/components/accomplishment-values";
import { IndicatorCriteria } from "@/features/position-goals/components/indicator-criteria";
import { KpiReportingForm } from "@/features/position-goals/components/kpi-reporting-form";
import { KpiVerificationPanel } from "@/features/position-goals/components/kpi-verification-panel";
import {
  isReportChanged,
  missingForSubmission,
  toReportDraft,
  toReportRequest,
  type ReportDraft,
} from "@/features/position-goals/services/actuals-request";
import { useProblemFocus } from "@/hooks/use-problem-focus";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import type { FormActionResult } from "@/types/form-action";
import { withoutProblems } from "@/utils/form-problems";
import { formatWorkspaceDate } from "@/utils/workspace-date";

const LIST_PATH = "/goals";
/** A pending action stays focusable: the `disabled` attribute would drop the focus to the page body. */
const ACTION_CLASS = "min-h-pms-touch rounded-pms-control data-disabled:opacity-50";
const NO_PROBLEMS: FormActionResult = { message: null, fieldErrors: {} };
const NOT_NUMBERS = "Check your values and try again.";
const INCOMPLETE = "Complete the report before you submit.";

/** The fields of the report that differ between two drafts, named as their problems are. */
function editedFields(before: ReportDraft, after: ReportDraft): string[] {
  const values = Object.keys(after.values).filter((id) => after.values[id] !== before.values[id]);
  const texts = (["remarks", "correctionReason"] as const).filter((field) => after[field] !== before[field]);
  return [...values, ...texts];
}

type Dialog = "submit" | "verify" | "return" | "leave";

interface Sending {
  action: () => Promise<FormActionResult>;
  success: string;
  /** Empties what the API took and does not send back. */
  afterTaken?: () => void;
}

/** What each confirmation says: the record, and what cannot be undone (PRD 7.11). */
function confirmationOf(dialog: "submit" | "verify" | "return", detail: AccomplishmentDetailDto) {
  const { employeeName, cycleName, verificationDeadline } = detail;
  const until = verificationDeadline ? ` until ${formatWorkspaceDate(verificationDeadline)}` : "";
  return {
    submit: {
      title: "Submit your report?",
      description: `You cannot change the report of ${cycleName} unless your manager returns it.`,
      confirmLabel: "Submit",
    },
    verify: {
      title: `Verify the report of ${employeeName}?`,
      description:
        "This accepts the report as evidence. It does not say that a target was met. A verified report cannot be changed.",
      confirmLabel: "Verify",
    },
    return: {
      title: `Return the report to ${employeeName}?`,
      description: `They can correct and resubmit it${until}.`,
      confirmLabel: "Return",
    },
  }[dialog];
}

export interface AccomplishmentRecordProps {
  detail: AccomplishmentDetailDto;
  onSave: (body: ReportIndicatorActualsRequestDto) => Promise<FormActionResult>;
  onSubmit: (body: ReportIndicatorActualsRequestDto) => Promise<FormActionResult>;
  onDecide: (body: AccomplishmentDecisionRequestDto) => Promise<FormActionResult>;
  /** The reports of the caller by cycle. With them, a choice of cycle takes the place of the way back. */
  choices?: readonly { value: string; label: string }[];
}

/**
 * One KPI report. The flags of the API choose what the caller sees: fields for the employee,
 * a decision for the current manager, or words. This component holds what was typed and what
 * happened, so both stay when an action changes the flags.
 */
export function AccomplishmentRecord({ detail, onSave, onSubmit, onDecide, choices }: AccomplishmentRecordProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => toReportDraft(detail));
  const [reason, setReason] = useState("");
  const [problems, setProblems] = useState(NO_PROBLEMS);
  const [done, setDone] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [target, setTarget] = useState(LIST_PATH);
  const [isPending, startTransition] = useTransition();
  const ids = detail.kpi.indicators.map((indicator) => indicator.indicatorId);
  const isDirty =
    (detail.canEdit && isReportChanged(ids, draft, toReportDraft(detail))) || (detail.canDecide && reason.trim() !== "");
  useUnsavedChangesWarning(isDirty);

  const formRef = useRef<HTMLFormElement>(null);
  const showProblems = useProblemFocus(formRef, problems, setProblems);

  const resultRef = useRef<HTMLParagraphElement>(null);
  const hasActions = detail.canEdit || detail.canDecide;
  // A submission or a decision takes the actions away: the focus goes to what happened.
  useEffect(() => {
    if (!hasActions && done) resultRef.current?.focus();
  }, [hasActions, done]);

  function send({ action, success, afterTaken }: Sending) {
    setProblems(NO_PROBLEMS);
    setDone("");
    startTransition(async () => {
      try {
        const result = await action();
        showProblems(result);
        if (result.message !== null) return;
        setDone(success);
        afterTaken?.();
      } catch {
        setProblems({ message: "Something went wrong. Try again.", fieldErrors: {} });
      }
    });
  }

  /** The body of the report, or null after it marks the values that are not numbers. */
  function checkedReport(): ReportIndicatorActualsRequestDto | null {
    const report = toReportRequest(ids, draft);
    if (report.success) return report.data;
    showProblems({ message: NOT_NUMBERS, fieldErrors: report.fieldErrors });
    return null;
  }

  function save() {
    const body = checkedReport();
    if (body) send({ action: () => onSave(body), success: "Draft saved." });
  }

  function askToSubmit() {
    if (!checkedReport()) return;
    const missing = missingForSubmission(ids, draft, detail.status === "returned");
    if (Object.keys(missing).length > 0) {
      showProblems({ message: INCOMPLETE, fieldErrors: missing });
      return;
    }
    setProblems(NO_PROBLEMS);
    setDialog("submit");
  }

  function askToReturn() {
    if (!reason.trim()) {
      showProblems({ message: null, fieldErrors: { reason: "Say why you return it." } });
      return;
    }
    setProblems(NO_PROBLEMS);
    setDialog("return");
  }

  function confirm(asked: "submit" | "verify" | "return") {
    setDialog(null);
    if (asked === "verify") {
      send({ action: () => onDecide({ outcome: "verified", reason: "" }), success: "Report verified." });
      return;
    }
    if (asked === "return") {
      send({
        action: () => onDecide({ outcome: "returned", reason: reason.trim() }),
        success: "Report returned.",
        afterTaken: () => setReason(""),
      });
      return;
    }
    const body = checkedReport();
    if (!body) return;
    send({
      action: () => onSubmit(body),
      success: "Report submitted.",
      // A later return must not find the old correction in the field.
      afterTaken: () => setDraft((current) => ({ ...current, correctionReason: "" })),
    });
  }

  function clearProblems(edited: readonly string[]) {
    setProblems((current) => withoutProblems(current, edited, [NOT_NUMBERS, INCOMPLETE]));
  }

  function change(next: ReportDraft) {
    clearProblems(editedFields(draft, next));
    setDraft(next);
    setDone("");
  }

  function leave() {
    setDialog(null);
    // Next keeps a page that the user left, hidden: a return must not show discarded edits.
    setDraft(toReportDraft(detail));
    setReason("");
    setProblems(NO_PROBLEMS);
    router.push(target);
  }

  /** Another page of Goals. Typed values are dropped only after the user says so. */
  function goTo(path: string) {
    if (!isDirty) return router.push(path);
    setTarget(path);
    setDialog("leave");
  }

  const asked = dialog && dialog !== "leave" ? dialog : null;

  return (
    <form ref={formRef} noValidate className="grid min-w-0 gap-4" onSubmit={(event) => event.preventDefault()}>
      {choices ? (
        choices.length > 1 && (
          <div className="max-w-pms-copy">
            <FormSelect
              label="Review Cycle"
              value={detail.accomplishmentId}
              options={choices}
              onChange={(id) => goTo(`${LIST_PATH}?record=${id}`)}
            />
          </div>
        )
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="min-h-pms-touch w-fit rounded-pms-control text-pms-label text-muted-foreground"
          onClick={() => goTo(LIST_PATH)}
        >
          <ChevronLeftIcon aria-hidden="true" />
          Back to Goals
        </Button>
      )}
      <AccomplishmentSummary detail={detail} />
      {detail.canEdit ? (
        <KpiReportingForm detail={detail} draft={draft} errors={problems.fieldErrors} onChange={change} />
      ) : (
        <AccomplishmentValues detail={detail} />
      )}
      <IndicatorCriteria kpi={detail.kpi} />
      <FieldError>{problems.message}</FieldError>
      <p ref={resultRef} role="status" tabIndex={-1} className="rounded-pms-control text-pms-body">
        {done}
      </p>
      {detail.canEdit && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className={ACTION_CLASS} disabled={isPending} focusableWhenDisabled onClick={save}>
            Save as Draft
          </Button>
          <Button
            type="button"
            className={ACTION_CLASS}
            disabled={isPending || !detail.canSubmit}
            focusableWhenDisabled={isPending}
            onClick={askToSubmit}
          >
            Submit Accomplishments
          </Button>
        </div>
      )}
      {detail.canDecide && (
        <KpiVerificationPanel
          reason={reason}
          error={problems.fieldErrors.reason}
          isPending={isPending}
          onReasonChange={(next) => {
            clearProblems(["reason"]);
            setReason(next);
            setDone("");
          }}
          onReturn={askToReturn}
          onVerify={() => setDialog("verify")}
        />
      )}
      <AccomplishmentHistory detail={detail} />
      {asked && (
        <ConfirmationDialog
          open
          {...confirmationOf(asked, detail)}
          onClose={() => setDialog(null)}
          onConfirm={() => confirm(asked)}
        />
      )}
      <UnsavedChangesDialog open={dialog === "leave"} onStay={() => setDialog(null)} onLeave={leave} />
    </form>
  );
}
