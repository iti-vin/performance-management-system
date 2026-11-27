import type { EntityManager } from 'typeorm';
import { Assignment } from '../entities/assignment.entity.js';
import type { CycleStage } from '../entities/cycle-stage.entity.js';

/** What a reopening does to one review. `copy` says whether it gets a draft of its submitted answers. */
export interface Reopening {
  assignment: Assignment;
  state: 'in_progress' | 'locked';
  copy: boolean;
}

/**
 * The reviews that change when HR reopens one (PRD Rec-003). The review itself and each
 * submitted later review open again. A later review that has not started is locked again
 * (Rev-003). A later draft stays as it is.
 */
export function planReopening(stages: readonly CycleStage[], rows: readonly Assignment[], target: Assignment): Reopening[] {
  const orderOf = (row: Assignment) => stages.find((stage) => stage.stageId === row.stageId)?.sortOrder ?? 0;
  const later = rows.filter((row) => orderOf(row) > orderOf(target));
  return [
    { assignment: target, state: 'in_progress', copy: true },
    ...later.flatMap((assignment): Reopening[] => {
      if (assignment.state === 'submitted') return [{ assignment, state: 'in_progress', copy: true }];
      if (assignment.state === 'not_started') return [{ assignment, state: 'locked', copy: false }];
      return [];
    }),
  ];
}

export async function saveState(manager: EntityManager, { assignment, state }: Reopening): Promise<void> {
  const cleared = state === 'in_progress' ? { submittedBy: null, submittedAt: null } : {};
  await manager.getRepository(Assignment).save({ ...assignment, ...cleared, state });
}
