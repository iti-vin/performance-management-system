"use client";

import type { ReviewCycleDetailDto } from "@pms/shared-types";
import { useState, useTransition } from "react";

import { FormField } from "@/components/molecules/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EVALUATOR_TYPE_LABELS } from "@/constants/domain-labels";
import { toDateInput, toInstant } from "@/features/review-cycles/services/cycle-draft";

export interface ExtensionInput {
  reason: string;
  verificationDeadline?: string;
  accomplishmentDeadline?: string;
  stages: { stageId: string; deadline: string }[];
}

interface ExtendDeadlinesDialogProps {
  cycle: ReviewCycleDetailDto;
  onClose: () => void;
  /** An empty message means that the extension is saved. */
  onSubmit: (input: ExtensionInput) => Promise<{ message: string }>;
}

/** The cycle dates that are not a stage: each id is the field of the request. */
const CYCLE_FIELDS = ["accomplishmentDeadline", "verificationDeadline"] as const;
const dayOf = (instant: string | null) => (instant ? toDateInput(instant) : "");

/** One date field for each deadline of the cycle: the stages in order, then those of the cycle. A cycle with no accomplishment deadline gets none here. */
function fieldsOf(cycle: ReviewCycleDetailDto) {
  const stages = [...(cycle.stages ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  return [
    ...stages.map((stage) => ({
      id: stage.stageId,
      label: `${EVALUATOR_TYPE_LABELS[stage.perspective]} Stage Deadline`,
      day: dayOf(stage.deadline),
    })),
    ...(cycle.accomplishmentDeadline
      ? [{ id: "accomplishmentDeadline", label: "Accomplishment Deadline", day: dayOf(cycle.accomplishmentDeadline) }]
      : []),
    { id: "verificationDeadline", label: "Verification Deadline", day: dayOf(cycle.verificationDeadline) },
  ];
}

/** Only the changed days go to the API, each as the end of that day. */
function toRequest(fields: ReturnType<typeof fieldsOf>, days: Record<string, string>, reason: string): ExtensionInput {
  const changed = fields.flatMap(({ id, day }) => {
    const next = days[id] ?? day;
    return next && next !== day ? [{ id, deadline: toInstant(next, "end") }] : [];
  });
  const isCycleField = (id: string) => CYCLE_FIELDS.some((field) => field === id);
  return {
    reason,
    ...Object.fromEntries(changed.filter(({ id }) => isCycleField(id)).map(({ id, deadline }) => [id, deadline])),
    stages: changed.filter(({ id }) => !isCycleField(id)).map(({ id, deadline }) => ({ stageId: id, deadline })),
  };
}

function ExtendForm({ cycle, onClose, onSubmit }: ExtendDeadlinesDialogProps) {
  const fields = fieldsOf(cycle);
  const [days, setDays] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    const trimmed = reason.trim();
    if (trimmed === "") {
      setReasonError("Reason is required.");
      return;
    }
    setMessage("");
    startTransition(async () => {
      const result = await onSubmit(toRequest(fields, days, trimmed));
      if (result.message === "") onClose();
      else setMessage(result.message);
    });
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Extend deadlines</DialogTitle>
        <DialogDescription>
          Move one or more deadlines later. No deadline can move earlier. Saved answers stay.
        </DialogDescription>
      </DialogHeader>
      {message && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {fields.map((field) => (
        <FormField key={field.id} label={field.label}>
          {(control) => (
            <Input
              {...control}
              type="date"
              className="min-h-pms-touch rounded-pms-control"
              min={field.day}
              value={days[field.id] ?? field.day}
              onChange={(event) => {
                const day = event.currentTarget.value;
                setDays((current) => ({ ...current, [field.id]: day }));
              }}
            />
          )}
        </FormField>
      ))}
      <FormField label="Reason" required error={reasonError}>
        {(control) => (
          <Textarea
            {...control}
            maxLength={2000}
            value={reason}
            onChange={(event) => {
              setReason(event.currentTarget.value);
              setReasonError(undefined);
            }}
          />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" className="min-h-pms-touch" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="min-h-pms-touch" disabled={isPending}>
          Extend Deadlines
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Later deadlines for a running cycle (PRD Rec-001). The form mounts on each open, so it starts from the saved dates. */
export function ExtendDeadlinesDialog({ open, ...form }: ExtendDeadlinesDialogProps & { open: boolean }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-pms-overlay">
        {open && <ExtendForm {...form} />}
      </DialogContent>
    </Dialog>
  );
}
