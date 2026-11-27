import type { Accomplishment } from '../entities/accomplishment.entity.js';
import type { ActualsSnapshot } from '../entities/accomplishment-version.entity.js';
import type { Cycle } from '../entities/cycle.entity.js';
import { dayOf } from './cycle-facts.js';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DEADLINE_PASSED = 'The verification deadline has passed. HR must extend the cycle schedule.';

/** Who asks, as far as one record is concerned. */
export interface Relation {
  /** The caller is the employee who reports. */
  isOwn: boolean;
  /** The caller manages the employee today (PRD AUTH-004: a prior manager does not). */
  isCurrentManager: boolean;
}

export interface Permissions {
  canEdit: boolean;
  canSubmit: boolean;
  canDecide: boolean;
  /** Why an action that the caller might expect is not available. Null when nothing holds them. */
  notice: string | null;
}

/** The window of every write of a record: it stays open through the verification deadline (Acc-006). */
export function isWindowOpen(cycle: Pick<Cycle, 'verificationDeadline'>, now: Date): boolean {
  return cycle.verificationDeadline === null || now <= cycle.verificationDeadline;
}

/** The evaluation period ends with its last day in Manila (Acc-002). */
export function hasPeriodEnded(cycle: Pick<Cycle, 'evaluationEnd'>, now: Date): boolean {
  return dayOf(now) > cycle.evaluationEnd;
}

export const SUBMISSION_PASSED = 'The accomplishment deadline has passed. HR must extend the cycle schedule.';

/**
 * The first submission closes at the accomplishment deadline. A returned record stays open
 * through the verification deadline (Acc-006). A cycle with no accomplishment deadline has
 * only that window.
 */
export function isFirstSubmissionClosed(record: Pick<Accomplishment, 'status'>, cycle: Pick<Cycle, 'accomplishmentDeadline'>, now: Date): boolean {
  return record.status === 'draft' && Boolean(cycle.accomplishmentDeadline && now > cycle.accomplishmentDeadline);
}

const OPEN_TO_OWNER: Accomplishment['status'][] = ['draft', 'returned'];

function ownNotice(record: Accomplishment, windowOpen: boolean, isClosed: boolean): string {
  if (record.status === 'submitted') return 'Submitted. It waits for your manager.';
  if (record.status === 'verified') return 'Verified. It cannot be changed.';
  if (!windowOpen) return DEADLINE_PASSED;
  return isClosed ? SUBMISSION_PASSED : 'You can submit after the evaluation period ends.';
}

function otherNotice(record: Accomplishment, windowOpen: boolean): string {
  const waiting = windowOpen ? 'It waits for the current manager.' : DEADLINE_PASSED;
  return {
    draft: 'The employee has not submitted it yet.',
    returned: 'Returned to the employee.',
    verified: 'Verified. It cannot be changed.',
    submitted: waiting,
  }[record.status];
}

/** What the caller may do with a record now. */
export function permissionsOf(record: Accomplishment, cycle: Cycle, relation: Relation, now: Date): Permissions {
  const isActive = cycle.state === 'active';
  const windowOpen = isWindowOpen(cycle, now);
  const isClosed = isFirstSubmissionClosed(record, cycle, now);
  const canEdit = relation.isOwn && isActive && windowOpen && !isClosed && OPEN_TO_OWNER.includes(record.status);
  const canSubmit = canEdit && hasPeriodEnded(cycle, now);
  const canDecide = relation.isCurrentManager && !relation.isOwn && isActive && windowOpen && record.status === 'submitted';

  if (canSubmit || canDecide) return { canEdit, canSubmit, canDecide, notice: null };
  if (!isActive) {
    const closed = cycle.state === 'completed' ? 'completed' : 'not active';
    return { canEdit, canSubmit, canDecide, notice: `The cycle is ${closed}. This record cannot be changed.` };
  }
  const notice = relation.isOwn ? ownNotice(record, windowOpen, isClosed) : otherNotice(record, windowOpen);
  return { canEdit, canSubmit, canDecide, notice };
}

/** The values of a stored submission. A value whose indicator is not a whole GUID is left out. */
export function readSnapshot(snapshot: ActualsSnapshot | null): { indicatorId: string; actualValue: number | null; remarks: string | null }[] {
  return (snapshot?.actuals ?? [])
    .filter((entry) => GUID.test(entry.indicator_id))
    .map((entry) => ({
      indicatorId: entry.indicator_id,
      actualValue: entry.actual_value === null ? null : Number(entry.actual_value),
      remarks: entry.remarks ?? null,
    }));
}
