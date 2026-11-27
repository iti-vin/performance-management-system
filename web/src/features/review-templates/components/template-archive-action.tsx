"use client";

import { useState } from "react";

import { ConfirmationDialog } from "@/components/molecules/confirmation-dialog";
import { Button } from "@/components/ui/button";

/** The Archive action of a KPI or a behavioral template: it asks first (Tpl-G-001, Tpl-B-001). */
export function TemplateArchiveAction({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Button type="button" variant="ghost" className="min-h-pms-touch" disabled={disabled} onClick={() => setAsking(true)}>
        Archive
      </Button>
      <ConfirmationDialog
        open={asking}
        title="Archive this template?"
        description="An archived template cannot be changed or chosen for a cycle. Launched cycles keep their version. A cycle that has not launched needs another template."
        confirmLabel="Archive Template"
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          onConfirm();
        }}
      />
    </>
  );
}
