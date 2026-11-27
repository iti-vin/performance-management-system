import type { EvaluatorType } from '@pms/shared-types';

/** The words that stand for an evaluator whose name nobody else reads (PRD Res-008). */
const ANONYMOUS_NAMES: Partial<Record<EvaluatorType, string>> = {
  peer: 'Anonymous peer',
  upward: 'Anonymous direct report',
};

export const isAnonymous = (perspective: EvaluatorType) => perspective in ANONYMOUS_NAMES;

/** The name of an evaluator as the caller may read it: only the evaluator reads their own on an anonymous stage. */
export function evaluatorNameFor(perspective: EvaluatorType, name: string, isOwn: boolean): string {
  return isOwn ? name : (ANONYMOUS_NAMES[perspective] ?? name);
}
