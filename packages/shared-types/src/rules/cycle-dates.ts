/** The company works in Asia/Manila (PRD 2.6): the day of an instant is the day there. */
const MANILA_MS = 8 * 60 * 60 * 1000;

export interface AccomplishmentDates {
  accomplishmentDeadline: Date;
  /** The last day of the evaluation period, as YYYY-MM-DD. */
  evaluationEnd: string;
  verificationDeadline: Date | null;
}

/**
 * One rule for the API, the save schema, and the readiness check. A report is submitted
 * after the evaluation period (Acc-002), so its deadline falls after that period, and a
 * manager still verifies it, so it is not after the verification deadline (Acc-006).
 */
export function accomplishmentDeadlineProblem({
  accomplishmentDeadline,
  evaluationEnd,
  verificationDeadline,
}: AccomplishmentDates): string | null {
  const day = new Date(accomplishmentDeadline.getTime() + MANILA_MS)
    .toISOString()
    .slice(0, 10);
  if (day <= evaluationEnd)
    return "The accomplishment deadline must be after the evaluation period ends.";
  if (verificationDeadline && accomplishmentDeadline > verificationDeadline) {
    return "The accomplishment deadline cannot be after the verification deadline.";
  }
  return null;
}

export interface ManagerDates {
  /** The deadline of the manager assessment stage. */
  managerDeadline: Date | null;
  verificationDeadline: Date | null;
  goalsWeight: number;
}

/**
 * While goals apply, the manager verifies the report before the assessment can be submitted
 * (Acc-005), so the assessment is due after the verification deadline (decision D6).
 */
export function managerDeadlineProblem({
  managerDeadline,
  verificationDeadline,
  goalsWeight,
}: ManagerDates): string | null {
  if (goalsWeight <= 0 || !managerDeadline || !verificationDeadline)
    return null;
  return managerDeadline > verificationDeadline
    ? null
    : "The manager assessment deadline must be after the manager verification deadline.";
}
