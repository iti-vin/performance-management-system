import type { ReviewDetailDto } from '@pms/shared-types';
import type { Assignment } from '../entities/assignment.entity.js';
import type { CycleStage } from '../entities/cycle-stage.entity.js';
import { evaluatorNameFor, isAnonymous } from './anonymity.js';

type State = Assignment['state'];

/** Where a stage with several evaluators stands, without saying who did what. */
function stateOf(states: State[]): State {
  if (states.every((state) => state === 'submitted' || state === 'completed')) return states[0] as State;
  if (states.includes('locked')) return 'locked';
  return states.every((state) => state === 'not_started') ? 'not_started' : 'in_progress';
}

/**
 * Every stage of one participant, in order. A peer or upward stage is one entry with no name
 * (Res-008); its answers never appear here.
 */
export function stageCards({
  stages,
  rows,
  current,
  nameOfEvaluator,
}: {
  stages: CycleStage[];
  rows: Assignment[];
  current: Assignment;
  nameOfEvaluator: (evaluatorId: string) => string;
}): ReviewDetailDto['stages'] {
  return [...stages]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((stage) => {
      const own = rows.filter((row) => row.stageId === stage.stageId);
      const [first] = own;
      if (!first) return [];
      const names = own.map((row) => evaluatorNameFor(stage.perspective, nameOfEvaluator(row.evaluatorId), false));
      return [
        {
          perspective: stage.perspective,
          evaluatorName: [...new Set(names)].join(', '),
          deadline: first.deadline?.toISOString() ?? null,
          state: stateOf(own.map((row) => row.state)),
          // An anonymous card never marks the caller: it would say that they are one of the group.
          isCurrent: !isAnonymous(stage.perspective) && own.some((row) => row.assignmentId === current.assignmentId),
        },
      ];
    });
}
