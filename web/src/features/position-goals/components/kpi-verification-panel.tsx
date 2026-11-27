import { Button } from "@/components/ui/button";
import { ReportTextField } from "@/features/position-goals/components/kpi-reporting-form";

const ACTION_CLASS = "min-h-pms-touch rounded-pms-control data-disabled:opacity-50";

interface KpiVerificationPanelProps {
  reason: string;
  error?: string;
  isPending: boolean;
  onReasonChange: (reason: string) => void;
  onReturn: () => void;
  onVerify: () => void;
}

/** The decision of the current manager on a submitted report. */
export function KpiVerificationPanel({ reason, error, isPending, onReasonChange, onReturn, onVerify }: KpiVerificationPanelProps) {
  return (
    <>
      <ReportTextField
        label="Reason for correction (needed to return the report)"
        value={reason}
        error={error}
        onChange={onReasonChange}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" className={ACTION_CLASS} disabled={isPending} focusableWhenDisabled onClick={onReturn}>
          Return for Correction
        </Button>
        <Button type="button" className={ACTION_CLASS} disabled={isPending} focusableWhenDisabled onClick={onVerify}>
          Verify Accomplishments
        </Button>
      </div>
    </>
  );
}
