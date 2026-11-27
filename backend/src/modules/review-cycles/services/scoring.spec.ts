import { describe, expect, it } from 'vitest';
import { overallScore, scoreIndicator, summarizeBehavior, weightedScore, type ScoredIndicator, type SubmittedAnswers } from './scoring.js';

/** `pg` returns numeric columns as text, so the fixtures do too. */
const indicator = (change: Partial<ScoredIndicator> = {}): ScoredIndicator => ({
  target: '90' as unknown as number,
  direction: 'higher_is_better',
  scoreTargetMet: '5.00' as unknown as number,
  scoreBelowTarget: '2.00' as unknown as number,
  useForScoring: false,
  scaleBound: null,
  scales: [],
  ...change,
});

describe('scoreIndicator (Res-004)', () => {
  it.each([
    ['higher is better, above the target', 'higher_is_better', 91, 5, true],
    ['higher is better, on the target', 'higher_is_better', 90, 5, true],
    ['higher is better, below the target', 'higher_is_better', 89.99, 2, false],
    ['lower is better, below the target', 'lower_is_better', 89, 5, true],
    ['lower is better, on the target', 'lower_is_better', 90, 5, true],
    ['lower is better, above the target', 'lower_is_better', 100, 2, false],
  ] as const)('%s', (_label, direction, actual, score, isTargetMet) => {
    expect(scoreIndicator(indicator({ direction }), actual)).toEqual({ score, isTargetMet });
  });

  it('takes the score of the scale when the scale is set to score', () => {
    const scales = [
      { lowerBound: '0' as unknown as number, upperBound: null, label: 'Low', score: '1.00' as unknown as number },
      { lowerBound: '50' as unknown as number, upperBound: null, label: 'Mid', score: '3.50' as unknown as number },
      { lowerBound: '90' as unknown as number, upperBound: null, label: 'Met', score: '5.00' as unknown as number },
    ];

    expect(scoreIndicator(indicator({ useForScoring: true, scaleBound: 'minimum', scales }), 60)).toEqual({ score: 3.5, isTargetMet: false });
    // A reference scale does not score.
    expect(scoreIndicator(indicator({ useForScoring: false, scaleBound: 'minimum', scales }), 60)).toEqual({ score: 2, isTargetMet: false });
  });

  it.each([
    ['no actual result', {}, null],
    ['no target and no scoring scale', { target: null }, 50],
  ])('gives no score for %s', (_label, change, actual) => {
    expect(scoreIndicator(indicator(change), actual)).toEqual({ score: null, isTargetMet: null });
  });
});

describe('weightedScore', () => {
  it('weighs each score by the weight of its indicator, read as numbers', () => {
    const rows = [
      { weight: '75' as unknown as number, score: 5 },
      { weight: '25' as unknown as number, score: 1 },
    ];

    expect(weightedScore(rows)).toBe(4);
  });

  it.each([
    ['no indicator', []],
    ['an indicator with no score', [{ weight: 50, score: 5 }, { weight: 50, score: null }]],
  ])('is null, not zero, for %s (Res-007)', (_label, rows) => {
    expect(weightedScore(rows)).toBeNull();
  });
});

describe('overallScore (Res-005, Res-007)', () => {
  it('weighs the components that apply', () => {
    expect(overallScore([{ weight: 0.6, score: 4.505 }, { weight: 0.4, score: 4 }])).toBeCloseTo(4.303, 6);
  });

  it('leaves a component with weight zero out', () => {
    expect(overallScore([{ weight: 0, score: null }, { weight: 1, score: 3 }])).toBe(3);
  });

  it('is null when a component that applies has no score: it is never counted as zero', () => {
    expect(overallScore([{ weight: 0.5, score: null }, { weight: 0.5, score: 5 }])).toBeNull();
    expect(overallScore([{ weight: 0, score: null }])).toBeNull();
  });
});

const QUESTIONS = [
  { questionId: 'q1', sectionTitle: 'Work', prompt: 'Delivers', questionType: 'rating_scale' as const },
  { questionId: 'q2', sectionTitle: 'Work', prompt: 'Helps', questionType: 'rating_scale' as const },
  { questionId: 'q3', sectionTitle: 'Notes', prompt: 'Strengths', questionType: 'paragraph' as const },
  { questionId: 'q4', sectionTitle: 'Notes', prompt: 'Often?', questionType: 'multiple_choice' as const },
];
const response = (perspective: SubmittedAnswers['perspective'], name: string, answers: SubmittedAnswers['answers']): SubmittedAnswers => ({
  perspective,
  evaluatorName: name,
  submittedAt: '2026-12-01T00:00:00.000Z',
  answers,
});

describe('summarizeBehavior (Res-006)', () => {
  const summary = () =>
    summarizeBehavior({
      questions: QUESTIONS,
      anonymityThreshold: null,
      responses: [
        response('self', 'Ana', { q1: 5, q2: 'not_observed', q3: 'Calm.', q4: 'option-1' }),
        response('manager', 'Maria', { q1: 3, q2: 4 }),
      ],
    });

  it('averages every observed rating, and nothing else', () => {
    expect(summary().score).toBe(4);
  });

  it('shows each rating question by perspective', () => {
    expect(summary().questions).toEqual([
      { questionId: 'q1', sectionTitle: 'Work', prompt: 'Delivers', ratings: [{ perspective: 'self', rating: 5 }, { perspective: 'manager', rating: 3 }] },
      { questionId: 'q2', sectionTitle: 'Work', prompt: 'Helps', ratings: [{ perspective: 'manager', rating: 4 }] },
    ]);
  });

  it('lists each assessment with its rating, and the written answers with their author', () => {
    expect(summary().assessments).toEqual([
      { perspective: 'self', evaluatorName: 'Ana', submittedCount: 1, submittedAt: '2026-12-01T00:00:00.000Z', rating: 5, isWithheld: false },
      { perspective: 'manager', evaluatorName: 'Maria', submittedCount: 1, submittedAt: '2026-12-01T00:00:00.000Z', rating: 3.5, isWithheld: false },
    ]);
    expect(summary().feedback).toEqual([{ perspective: 'self', evaluatorName: 'Ana', prompt: 'Strengths', text: 'Calm.' }]);
  });

  it('is null with no observed rating', () => {
    const empty = summarizeBehavior({ questions: QUESTIONS, anonymityThreshold: null, responses: [response('self', 'Ana', { q1: 'not_observed' })] });

    expect(empty.score).toBeNull();
    expect(empty.assessments[0]?.rating).toBeNull();
  });

  describe('anonymous perspectives (Res-008)', () => {
    const peers = (count: number) =>
      Array.from({ length: count }, (_, index) => response('peer', `Peer ${index}`, { q1: 1, q3: `Note ${index}` }));
    const of = (count: number, anonymityThreshold: number | null) =>
      summarizeBehavior({ questions: QUESTIONS, anonymityThreshold, responses: [response('self', 'Ana', { q1: 5 }), ...peers(count)] });

    it('pools them without a name once the minimum is met', () => {
      const result = of(3, 3);

      expect(result.score).toBe(2);
      expect(result.assessments[1]).toEqual({ perspective: 'peer', evaluatorName: null, submittedCount: 3, submittedAt: null, rating: 1, isWithheld: false });
      expect(result.feedback.map((entry) => entry.evaluatorName)).toEqual([null, null, null]);
      expect(result.questions[0]?.ratings).toContainEqual({ perspective: 'peer', rating: 1 });
      expect(JSON.stringify(result)).not.toContain('Peer 0');
    });

    it.each([
      ['one below the minimum', 2, 3],
      ['no minimum set', 5, null],
    ])('withholds their ratings and texts, %s', (_label, count, threshold) => {
      const result = of(count, threshold);

      expect(result.score).toBe(5);
      expect(result.assessments[1]).toEqual({ perspective: 'peer', evaluatorName: null, submittedCount: count, submittedAt: null, rating: null, isWithheld: true });
      expect(result.feedback).toEqual([]);
      expect(result.questions[0]?.ratings).toEqual([{ perspective: 'self', rating: 5 }]);
      expect(JSON.stringify(result)).not.toContain('Note 0');
    });
  });
});

describe('the written feedback of a response', () => {
  it('shows with the other written answers, by its author', () => {
    const result = summarizeBehavior({
      questions: QUESTIONS,
      anonymityThreshold: null,
      responses: [response('manager', 'Maria', { written_feedback: 'Good quarter.' })],
    });

    expect(result.feedback).toEqual([{ perspective: 'manager', evaluatorName: 'Maria', prompt: 'Written Feedback', text: 'Good quarter.' }]);
    expect(result.score).toBeNull();
  });
});

describe('anonymity inside a group that meets the minimum (Res-008)', () => {
  const peer = (name: string, answers: SubmittedAnswers['answers']) => response('peer', name, answers);
  const summary = () =>
    summarizeBehavior({
      questions: QUESTIONS,
      anonymityThreshold: 3,
      responses: [
        peer('Ann', { q1: 4, q2: 1, q3: 'zeta', written_feedback: 'zulu' }),
        peer('Bo', { q1: 4, q2: 'not_observed', q3: 'alpha' }),
        peer('Cy', { q1: 4, written_feedback: 'bravo' }),
      ],
    });

  it('shows no rating of a question that fewer than the minimum rated: it would be one person', () => {
    expect(summary().questions.map((question) => [question.questionId, question.ratings])).toEqual([
      ['q1', [{ perspective: 'peer', rating: 4 }]],
      ['q2', []],
    ]);
  });

  it('leaves such a rating out of the group rating and the score too: a mean would give it back', () => {
    expect(summary().assessments[0]?.rating).toBe(4);
    expect(summary().score).toBe(4);
  });

  it('orders the written answers by their question and their words, so none follows its author', () => {
    expect(summary().feedback.map((entry) => entry.text)).toEqual(['alpha', 'zeta', 'bravo', 'zulu']);
  });
});
