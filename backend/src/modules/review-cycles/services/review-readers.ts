import type { EvaluatorType } from '@pms/shared-types';
import type { Assignment } from '../entities/assignment.entity.js';
import type { CycleStage } from '../entities/cycle-stage.entity.js';
import type { Cycle } from '../entities/cycle.entity.js';
import { isAnonymous } from './anonymity.js';
import { readsAfterRelease, type Readers } from './result-readers.js';
import { PARTICIPANT_CYCLE_STATES } from './viewer.js';

/** The stages whose reviewer may read earlier answers. A peer or upward reviewer never does. */
const LATER_READERS: readonly EvaluatorType[] = ['manager', 'hr'];

/** One person and one review that they neither answer nor administer. */
export interface Colleague {
  actorId: string;
  cycle: Pick<Cycle, 'state' | 'releasedAt'>;
  subjectId: string;
  /** The stage of the review that is read. */
  stage: CycleStage;
  stages: CycleStage[];
  /** The assignments of the participant. */
  assignments: Assignment[];
  readers: Readers;
  /** The employees whom the person manages today. */
  team: ReadonlySet<string>;
}

/** While the cycle runs and allows it, the reviewer of a later stage reads an earlier one. */
function isLaterReviewer({ actorId, cycle, subjectId, stage, stages, assignments, readers }: Colleague): boolean {
  if (cycle.state !== 'active' || !readers.earlierAnswersVisible || actorId === subjectId) return false;
  return stages.some(
    (later) =>
      LATER_READERS.includes(later.perspective) &&
      later.sortOrder > stage.sortOrder &&
      assignments.some((row) => row.stageId === later.stageId && row.evaluatorId === actorId),
  );
}

/**
 * Whether the person reads the submitted answers of the review (decision D5): as a later
 * reviewer, or after the release as the employee or their current manager. A peer or upward
 * review stays with its evaluator (Res-008).
 */
export function readsColleagueReview(colleague: Colleague): boolean {
  const { actorId, cycle, subjectId, stage, readers, team } = colleague;
  if (isAnonymous(stage.perspective)) return false;
  if (isLaterReviewer(colleague)) return true;
  const isReleased = Boolean(cycle.releasedAt) && PARTICIPANT_CYCLE_STATES.includes(cycle.state);
  return isReleased && readsAfterRelease({ actorId, employeeId: subjectId, team, readers });
}
