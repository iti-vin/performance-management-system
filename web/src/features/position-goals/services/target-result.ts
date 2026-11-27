import type { AccomplishmentDetailDto } from "@pms/shared-types";

export type TargetResult = "met" | "below";
type Indicator = Pick<AccomplishmentDetailDto["kpi"]["indicators"][number], "target" | "direction">;

/**
 * Where a reported value stands against the target, in the direction of the indicator. A draft
 * and a returned report say nothing. Verification accepts a report as evidence: it does not
 * make a target met (PRD 7.6).
 */
export function targetResult(
  status: AccomplishmentDetailDto["status"],
  { target, direction }: Indicator,
  actualValue: number | null,
): TargetResult | null {
  if (status === "draft" || status === "returned") return null;
  if (actualValue === null || target === null) return null;
  const isMet = direction === "higher_is_better" ? actualValue >= target : actualValue <= target;
  return isMet ? "met" : "below";
}
