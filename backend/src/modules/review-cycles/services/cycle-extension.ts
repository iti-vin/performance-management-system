import { managerDeadlineProblem, type EvaluatorType } from '@pms/shared-types';
import { stageOrderProblem, type ReadinessIssue } from './cycle-readiness.js';

export interface ExtensionStage {
  stageId: string;
  perspective: EvaluatorType;
  sortOrder: number;
  deadline: Date | null;
}

export interface ExtensionInput<T extends ExtensionStage> {
  assessmentStart: Date | null;
  verificationDeadline: Date | null;
  accomplishmentDeadline: Date | null;
  goalsWeight: number;
  stages: T[];
  asked: { verificationDeadline?: string; accomplishmentDeadline?: string; stages?: { stageId: string; deadline: string }[] };
}

export interface ExtensionPlan<T extends ExtensionStage> {
  /** Empty when the extension may be saved. */
  issues: Pick<ReadinessIssue, 'field' | 'message'>[];
  /** The stages whose deadline moves, each with the new one. */
  stages: { stage: T; deadline: Date }[];
  /** The new verification deadline, or null when it stays. */
  verificationDeadline: Date | null;
  /** The new accomplishment deadline, or null when it stays. */
  accomplishmentDeadline: Date | null;
}

const isSame = (a: Date | null, b: Date) => a !== null && a.getTime() === b.getTime();
const isEarlier = (a: Date, b: Date | null) => b !== null && a < b;

/** Checks an extension (PRD Rec-001): no deadline moves earlier, the order holds, and one date changes. */
export function planExtension<T extends ExtensionStage>(input: ExtensionInput<T>): ExtensionPlan<T> {
  const ordered = [...input.stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const asked = input.asked.stages ?? [];
  const wanted = new Map(asked.map((stage) => [stage.stageId, new Date(stage.deadline)]));
  const issues: ExtensionPlan<T>['issues'] = [];
  const report = (field: string, message: string) => issues.push({ field, message });

  if (wanted.size !== asked.length) report('stages', 'Name each stage once.');
  if (asked.some((stage) => !ordered.some((known) => known.stageId === stage.stageId))) {
    report('stages', 'A named stage is not part of this cycle.');
  }

  const merged = ordered.map((stage) => wanted.get(stage.stageId) ?? stage.deadline);
  const stages: ExtensionPlan<T>['stages'] = [];
  ordered.forEach((stage, index) => {
    const field = `stages.${index}.deadline`;
    const next = wanted.get(stage.stageId);
    if (next && isEarlier(next, stage.deadline)) report(field, `The deadline of stage ${index + 1} cannot move earlier.`);
    const order = stageOrderProblem(merged, index, input.assessmentStart);
    if (order) report(field, order);
    if (next && !isSame(stage.deadline, next)) stages.push({ stage, deadline: next });
  });

  const verification = movedDate(input.asked.verificationDeadline, input.verificationDeadline);
  if (verification && isEarlier(verification, input.verificationDeadline)) {
    report('verificationDeadline', 'The verification deadline cannot move earlier.');
  }
  const accomplishment = movedDate(input.asked.accomplishmentDeadline, input.accomplishmentDeadline);
  const problem = accomplishment && accomplishmentMoveProblem(accomplishment, input, verification ?? input.verificationDeadline);
  if (problem) report('accomplishmentDeadline', problem);

  // Checked only when one of its two dates moves: a running cycle in the old order can still extend others (D6).
  const managerAt = ordered.findIndex((stage) => stage.perspective === 'manager');
  const manager = ordered[managerAt];
  if (manager && (verification || wanted.has(manager.stageId))) {
    const message = managerDeadlineProblem({
      managerDeadline: merged[managerAt] ?? null,
      verificationDeadline: verification ?? input.verificationDeadline,
      goalsWeight: Number(input.goalsWeight),
    });
    if (message) report(`stages.${managerAt}.deadline`, message);
  }

  if (issues.length === 0 && stages.length === 0 && !verification && !accomplishment) {
    report('stages', 'Move at least one deadline later.');
  }
  return { issues, stages, verificationDeadline: verification, accomplishmentDeadline: accomplishment };
}

/** The asked date when it differs from the saved one, otherwise null. */
function movedDate(asked: string | undefined, saved: Date | null): Date | null {
  if (!asked) return null;
  const date = new Date(asked);
  return isSame(saved, date) ? null : date;
}

/** A cycle with no accomplishment deadline gets none here: a new one would close work that is open now. */
function accomplishmentMoveProblem<T extends ExtensionStage>(
  next: Date,
  { accomplishmentDeadline }: ExtensionInput<T>,
  verification: Date | null,
): string | null {
  if (!accomplishmentDeadline) return 'This cycle has no accomplishment deadline to extend.';
  if (next < accomplishmentDeadline) return 'The accomplishment deadline cannot move earlier.';
  return verification && next > verification ? 'The accomplishment deadline cannot be after the verification deadline.' : null;
}
