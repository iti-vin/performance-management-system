import { EVALUATION_STATUSES, type EvaluationStatus } from "@pms/shared-types";

import { EVALUATION_STATUS_LABELS } from "@/constants/domain-labels";

/** Late work is not a stored status: it is a flag beside one. */
export const OVERDUE = "overdue";

export const STATUS_FILTER_OPTIONS = [
  ...EVALUATION_STATUSES.map((value) => ({ value: value as string, label: EVALUATION_STATUS_LABELS[value] })),
  { value: OVERDUE, label: "Overdue" },
];

export function matchesStatus(row: { state: EvaluationStatus; isOverdue: boolean }, wanted: string): boolean {
  return wanted === OVERDUE ? row.isOverdue : row.state === wanted;
}
