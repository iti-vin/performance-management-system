/**
 * The scoring rules of a finalized cycle (PRD Res-004 to Res-008), as pure functions.
 * `pg` returns numeric columns as text, so every stored number is read with `Number`.
 */
import { FEEDBACK_KEY } from './review-feedback.js';
import { scaleScore, type EvaluatorType, type KpiDirection, type ResultBehaviorDto, type ScaleBound } from '@pms/shared-types';

export interface ScoredIndicator {
  target: number | null;
  direction: KpiDirection;
  scoreTargetMet: number;
  scoreBelowTarget: number;
  useForScoring: boolean;
  scaleBound: ScaleBound | null;
  scales: { lowerBound: number | null; upperBound: number | null; label: string | null; score: number }[];
}

/** One submitted response of one participant. */
export interface SubmittedAnswers {
  perspective: EvaluatorType;
  evaluatorName: string;
  submittedAt: string | null;
  answers: Record<string, number | string>;
}

export interface ScoredQuestion {
  questionId: string;
  sectionTitle: string;
  prompt: string;
  questionType: string;
}

const numberOrNull = (value: number | string | null) => (value === null ? null : Number(value));

export function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** The score of the scale when it scores, otherwise null. */
function scoreOfScale(indicator: ScoredIndicator, actual: number): number | null {
  const scales = indicator.scales.map((row) => ({
    lowerBound: numberOrNull(row.lowerBound),
    upperBound: numberOrNull(row.upperBound),
    label: row.label ?? '',
    score: Number(row.score),
  }));
  return scaleScore({ scaleBound: indicator.scaleBound, scales }, actual);
}

/** One verified actual against the frozen target, direction, and scores (Res-004). */
export function scoreIndicator(indicator: ScoredIndicator, actual: number | null): { score: number | null; isTargetMet: boolean | null } {
  if (actual === null) return { score: null, isTargetMet: null };
  const target = numberOrNull(indicator.target);
  const isTargetMet =
    target === null ? null : indicator.direction === 'higher_is_better' ? actual >= target : actual <= target;
  if (indicator.useForScoring) return { score: scoreOfScale(indicator, actual), isTargetMet };
  if (isTargetMet === null) return { score: null, isTargetMet };
  return { score: Number(isTargetMet ? indicator.scoreTargetMet : indicator.scoreBelowTarget), isTargetMet };
}

/** The goals component. An indicator with no score leaves it without one: nothing counts as zero (Res-007). */
export function weightedScore(rows: { weight: number; score: number | null }[]): number | null {
  let total = 0;
  let weights = 0;
  for (const { weight, score } of rows) {
    if (score === null) return null;
    total += Number(weight) * score;
    weights += Number(weight);
  }
  return weights > 0 ? total / weights : null;
}

/** The components that apply, by their weights (Res-005). One without a score leaves no overall score (Res-007). */
export function overallScore(components: { weight: number; score: number | null }[]): number | null {
  const applied = components.filter((component) => Number(component.weight) > 0);
  return applied.length === 0 ? null : weightedScore(applied);
}

const ANONYMOUS: readonly EvaluatorType[] = ['peer', 'upward'];
const WRITTEN = ['paragraph', 'short_answer'];

/** The responses of one perspective, and whether the reader may see anything of them. */
interface Group {
  perspective: EvaluatorType;
  isAnonymous: boolean;
  isWithheld: boolean;
  responses: SubmittedAnswers[];
}

/**
 * The responses of an anonymous group without the ratings that fewer than the minimum gave to
 * a question. Such a rating enters nothing: a group mean or the score would give it back.
 */
function withoutThinRatings(responses: SubmittedAnswers[], minimum: number): SubmittedAnswers[] {
  const counts = new Map<string, number>();
  for (const { answers } of responses) {
    for (const [key, value] of Object.entries(answers)) {
      if (typeof value === 'number') counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return responses.map((response) => ({
    ...response,
    answers: Object.fromEntries(
      Object.entries(response.answers).filter(([key, value]) => typeof value !== 'number' || (counts.get(key) ?? 0) >= minimum),
    ),
  }));
}

/** An anonymous perspective shows only from the minimum of evaluators on, and never without a minimum (Res-008). */
function groupsOf(responses: SubmittedAnswers[], anonymityThreshold: number | null): Group[] {
  return [...new Set(responses.map((response) => response.perspective))].map((perspective) => {
    const own = responses.filter((response) => response.perspective === perspective);
    const isAnonymous = ANONYMOUS.includes(perspective);
    const isWithheld = isAnonymous && (anonymityThreshold === null || own.length < anonymityThreshold);
    return { perspective, isAnonymous, isWithheld, responses: isAnonymous && !isWithheld ? withoutThinRatings(own, anonymityThreshold as number) : own };
  });
}

/** The observed ratings of some responses to some questions: "Not observed" and blanks are left out. */
function ratingsOf(responses: SubmittedAnswers[], questions: ScoredQuestion[]): number[] {
  const rated = questions.filter((question) => question.questionType === 'rating_scale');
  return responses.flatMap((response) =>
    rated.flatMap(({ questionId }) => {
      const value = response.answers[questionId];
      return typeof value === 'number' ? [value] : [];
    }),
  );
}

/** One row for each assessment. An anonymous group is one row, with no name and no date. */
function assessmentsOf(group: Group, questions: ScoredQuestion[]): ResultBehaviorDto['assessments'] {
  const { perspective, isWithheld } = group;
  if (group.isAnonymous) {
    const rating = isWithheld ? null : mean(ratingsOf(group.responses, questions));
    return [{ perspective, evaluatorName: null, submittedCount: group.responses.length, submittedAt: null, rating, isWithheld }];
  }
  return group.responses.map((response) => ({
    perspective,
    evaluatorName: response.evaluatorName,
    submittedCount: 1,
    submittedAt: response.submittedAt,
    rating: mean(ratingsOf([response], questions)),
    isWithheld: false,
  }));
}

/** The written answers of one group. */
function feedbackOf(group: Group, questions: ScoredQuestion[]): ResultBehaviorDto['feedback'] {
  const written = [
    ...questions.filter((question) => WRITTEN.includes(question.questionType)),
    { questionId: FEEDBACK_KEY, prompt: 'Written Feedback' },
  ];
  const entriesOf = (response: SubmittedAnswers, { questionId, prompt }: (typeof written)[number]) => {
    const text = response.answers[questionId];
    if (typeof text !== 'string' || text.trim() === '') return [];
    return [{ perspective: group.perspective, evaluatorName: group.isAnonymous ? null : response.evaluatorName, prompt, text }];
  };
  if (!group.isAnonymous) return group.responses.flatMap((response) => written.flatMap((question) => entriesOf(response, question)));
  // Question by question, in the order of the words: the position of an entry says nothing about its author.
  return written.flatMap((question) =>
    group.responses.flatMap((response) => entriesOf(response, question)).sort((a, b) => a.text.localeCompare(b.text)),
  );
}

/**
 * The behavioral component: the mean of every observed rating that the reader may see
 * (Res-006), with the ratings by perspective, the assessments, and the written answers.
 */
export function summarizeBehavior({
  questions,
  responses,
  anonymityThreshold,
}: {
  questions: ScoredQuestion[];
  responses: SubmittedAnswers[];
  anonymityThreshold: number | null;
}): Omit<ResultBehaviorDto, 'templateName' | 'templateVersion'> & { score: number | null } {
  const groups = groupsOf(responses, anonymityThreshold);
  const visible = groups.filter((group) => !group.isWithheld);
  return {
    score: mean(ratingsOf(visible.flatMap((group) => group.responses), questions)),
    questions: questions
      .filter((question) => question.questionType === 'rating_scale')
      .map((question) => ({
        questionId: question.questionId,
        sectionTitle: question.sectionTitle,
        prompt: question.prompt,
        ratings: visible.flatMap((group) => {
          const rating = mean(ratingsOf(group.responses, [question]));
          return rating === null ? [] : [{ perspective: group.perspective, rating }];
        }),
      })),
    assessments: groups.flatMap((group) => assessmentsOf(group, questions)),
    feedback: visible.flatMap((group) => feedbackOf(group, questions)),
  };
}
