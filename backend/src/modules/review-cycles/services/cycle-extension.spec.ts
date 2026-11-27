import { describe, expect, it } from 'vitest';
import { planExtension } from './cycle-extension.js';

const day = (value: string) => new Date(`${value}T15:59:59Z`);
const MESSAGE = 'The manager assessment deadline must be after the manager verification deadline.';

/** A running cycle: verification, then the manager, then HR. */
function running(verification = '2027-01-12', goalsWeight = 0.5) {
  return {
    assessmentStart: day('2027-01-01'),
    verificationDeadline: day(verification),
    accomplishmentDeadline: null,
    goalsWeight,
    stages: [
      { stageId: 's-mgr', perspective: 'manager' as const, sortOrder: 1, deadline: day('2027-01-15') },
      { stageId: 's-hr', perspective: 'hr' as const, sortOrder: 2, deadline: day('2027-01-20') },
    ],
  };
}

describe('planExtension, the manager deadline (D6)', () => {
  it('refuses a verification deadline that reaches the manager deadline', () => {
    const plan = planExtension({ ...running(), asked: { verificationDeadline: day('2027-01-16').toISOString() } });

    expect(plan.issues).toEqual([{ field: 'stages.0.deadline', message: MESSAGE }]);
  });

  it('allows it when the manager deadline moves after it in the same request', () => {
    const asked = { verificationDeadline: day('2027-01-16').toISOString(), stages: [{ stageId: 's-mgr', deadline: day('2027-01-17').toISOString() }] };

    expect(planExtension({ ...running(), asked }).issues).toEqual([]);
  });

  it('lets a cycle that already breaks the rule extend another date', () => {
    const asked = { stages: [{ stageId: 's-hr', deadline: day('2027-01-25').toISOString() }] };

    expect(planExtension({ ...running('2027-01-31'), asked }).issues).toEqual([]);
  });

  it('asks nothing when goals do not apply', () => {
    const asked = { verificationDeadline: day('2027-01-16').toISOString() };

    expect(planExtension({ ...running('2027-01-12', 0), asked }).issues).toEqual([]);
  });
});
