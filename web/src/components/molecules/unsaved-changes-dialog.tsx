"use client";

import { ConfirmationDialog } from "@/components/molecules/confirmation-dialog";

interface UnsavedChangesDialogProps {
  open: boolean;
  /** Keep editing. */
  onStay: () => void;
  /** Discard changes and leave. */
  onLeave: () => void;
}

/**
 * Open it from a Cancel or Back button while the form is dirty. Pair it with
 * `useUnsavedChangesWarning` for tab close and reload.
 */
export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
}: UnsavedChangesDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      title="Leave without saving?"
      description="Your unsaved changes will be discarded. Save your draft before leaving if you want to keep these changes."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      onClose={onStay}
      onConfirm={onLeave}
    />
  );
}
