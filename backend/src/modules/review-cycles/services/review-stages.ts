import type { Assignment } from '../entities/assignment.entity.js';
import type { CycleStage } from '../entities/cycle-stage.entity.js';

/** Work that a stage no longer waits for (PRD Rev-003). */
const isDone = (assignment: Assignment) => assignment.state === 'submitted' || assignment.state === 'completed';

/**
 * The earliest stage where an assignment of one participant is not finished, or null when all
 * are. `assignments` are those of one participant: each participant moves on their own.
 */
export function firstUnfinishedStage(stages: readonly CycleStage[], assignments: readonly Assignment[]): CycleStage | null {
  const ordered = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  return ordered.find((stage) => assignments.some((row) => row.stageId === stage.stageId && !isDone(row))) ?? null;
}
