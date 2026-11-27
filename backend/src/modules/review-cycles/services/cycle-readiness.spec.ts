import { describe, expect, it } from 'vitest';
import { checkReadiness, type ReadinessInput, type ReadinessParticipant } from './cycle-readiness.js';

const NOW = new Date('2026-11-25T00:00:00Z');
const HR = '00000000-0000-0000-0000-000000000025';
const MARIA = '00000000-0000-0000-0000-000000000022';
const BOSS = '00000000-0000-0000-0000-000000000026';
const OTHER_ADMIN = '00000000-0000-0000-0000-000000000027';
const colleagues = (count: number) => Array.from({ length: count }, (_, index) => ({ employeeId: `peer-${index}`, name: `Peer ${index}` }));

function participant(overrides: Partial<ReadinessParticipant> = {}): ReadinessParticipant {
  return {
    employeeId: '00000000-0000-0000-0000-000000000021',
    name: 'Iging DotTech',
    isActive: true,
    position: 'Software Engineer',
    kpiVersionId: 'kpi-v1',
    isKpiTemplatePublished: true,
    behavioralVersionId: 'beh-v1',
    isBehavioralTemplatePublished: true,
    managerId: BOSS,
    peers: [],
    reportCount: 0,
    ...overrides,
  };
}

/** A cycle that passes every rule: change one thing per test. */
function ready(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    now: NOW,
    cycle: {
      evaluationStart: '2026-11-04',
      evaluationEnd: '2026-12-31',
      assessmentStart: new Date('2027-01-05T00:00:00Z'),
      verificationDeadline: new Date('2027-01-12T00:00:00Z'),
      accomplishmentDeadline: null,
      goalsWeight: 0.5,
      behavioralWeight: 0.5,
      anonymityThreshold: null,
    },
    stages: [
      { perspective: 'self', sortOrder: 1, evaluatorId: null, deadline: new Date('2027-01-10T00:00:00Z') },
      { perspective: 'manager', sortOrder: 2, evaluatorId: null, deadline: new Date('2027-01-15T00:00:00Z') },
      { perspective: 'hr', sortOrder: 3, evaluatorId: HR, deadline: new Date('2027-01-20T00:00:00Z') },
    ],
    participants: [participant()],
    eligibleHrEvaluatorIds: new Set([HR]),
    ...overrides,
  };
}

describe('checkReadiness', () => {
  it('finds nothing wrong with a complete cycle', () => {
    expect(checkReadiness(ready())).toEqual([]);
  });

  describe('who cannot be an anonymous peer (D12)', () => {
    /** A peer stage where the participant has two colleagues and one person to judge. */
    function withPeer(employeeId: string, eligible = [HR, OTHER_ADMIN]) {
      const input = ready({
        participants: [participant({ peers: [{ employeeId, name: 'Pat Reyes' }, ...colleagues(2)] })],
        eligibleHrEvaluatorIds: new Set(eligible),
      });
      input.cycle = { ...input.cycle, anonymityThreshold: 3 };
      input.stages = input.stages.map((stage) => (stage.perspective === 'self' ? { ...stage, perspective: 'peer' as const } : stage));
      return checkReadiness(input);
    }
    const barred = {
      step: 'stages',
      field: 'participants.00000000-0000-0000-0000-000000000021.peers',
      message:
        'Iging DotTech: Pat Reyes cannot be an anonymous peer. The manager of the participant, the HR evaluator, and HR administrators read the results. Choose someone else.',
    };

    it.each([
      ['the manager of the participant', BOSS],
      ['the HR evaluator of the cycle', HR],
      ['an HR administrator', OTHER_ADMIN],
    ])('flags %s as a peer, and names them', (_who, employeeId) => {
      expect(withPeer(employeeId)).toEqual([barred]);
    });

    it('flags the HR evaluator even without an administrator login', () => {
      expect(withPeer(HR, [OTHER_ADMIN])).toContainEqual(barred);
    });

    it('accepts a colleague', () => {
      expect(withPeer(MARIA)).toEqual([]);
    });
  });

  describe('details step', () => {
    it.each([
      ['no assessment start', { assessmentStart: null }, 'assessmentStart'],
      ['no verification deadline', { verificationDeadline: null }, 'verificationDeadline'],
      ['a period that ends before it starts', { evaluationEnd: '2026-10-01' }, 'evaluationEnd'],
      [
        'a verification deadline before assessment starts',
        { verificationDeadline: new Date('2027-01-01T00:00:00Z') },
        'verificationDeadline',
      ],
      ['an accomplishment deadline inside the period', { accomplishmentDeadline: new Date('2026-12-31T00:00:00Z') }, 'accomplishmentDeadline'],
      ['an accomplishment deadline after verification', { accomplishmentDeadline: new Date('2027-02-01T00:00:00Z') }, 'accomplishmentDeadline'],
      ['an accomplishment deadline that has passed', { accomplishmentDeadline: new Date('2026-11-24T00:00:00Z'), evaluationEnd: '2026-11-20' }, 'accomplishmentDeadline'],
      ['weights that do not total 1', { goalsWeight: 0.6, behavioralWeight: 0.5 }, 'behavioralWeight'],
    ])('flags %s', (_label, change, field) => {
      const input = ready();
      input.cycle = { ...input.cycle, ...change };

      expect(checkReadiness(input)).toEqual([expect.objectContaining({ step: 'details', field })]);
    });
  });

  describe('a component that does not apply (Res-007)', () => {
    it.each([
      ['goals', { goalsWeight: 0, behavioralWeight: 1 }, { kpiVersionId: null }],
      ['behavior', { goalsWeight: 1, behavioralWeight: 0 }, { behavioralVersionId: null }],
    ])('asks for no template of %s with weight zero', (_label, weights, missing) => {
      const input = ready({ participants: [participant(missing)] });
      input.cycle = { ...input.cycle, ...weights };

      expect(checkReadiness(input)).toEqual([]);
    });

    it('still asks for the template of the component that applies', () => {
      const input = ready({ participants: [participant({ kpiVersionId: null, behavioralVersionId: null })] });
      input.cycle = { ...input.cycle, goalsWeight: 0, behavioralWeight: 1 };

      expect(checkReadiness(input).map((issue) => issue.step)).toEqual(['behavioral']);
    });
  });

  describe('anonymous stages (Cyc-003, Res-008)', () => {
    const withStage = (perspective: 'peer' | 'upward', person: Partial<ReadinessParticipant>, anonymityThreshold: number | null) => {
      const input = ready({ participants: [participant(person)] });
      input.cycle = { ...input.cycle, anonymityThreshold };
      input.stages = [
        input.stages[0]!,
        { perspective, sortOrder: 2, evaluatorId: null, deadline: new Date('2027-01-15T00:00:00Z') },
      ];
      return checkReadiness(input);
    };

    it.each(['peer', 'upward'] as const)('needs the anonymity minimum for a %s stage', (perspective) => {
      expect(withStage(perspective, { peers: colleagues(3), reportCount: 3 }, null)).toContainEqual(
        expect.objectContaining({ step: 'stages', field: 'anonymityThreshold', message: 'Set the anonymity minimum for the peer and upward stages.' }),
      );
    });

    it('needs at least the minimum of peers for each participant', () => {
      expect(withStage('peer', { peers: colleagues(2) }, 3)).toEqual([
        expect.objectContaining({ step: 'stages', field: 'participants.00000000-0000-0000-0000-000000000021.peers', message: 'Iging DotTech needs at least 3 peers.' }),
      ]);
      expect(withStage('peer', { peers: colleagues(3) }, 3)).toEqual([]);
    });

    it('needs one participant with enough direct reports for an upward stage', () => {
      expect(withStage('upward', { reportCount: 2 }, 3)).toEqual([
        expect.objectContaining({ step: 'stages', field: 'stages.1.perspective', message: 'No participant has 3 direct reports, so the upward stage has no evaluator.' }),
      ]);
      expect(withStage('upward', { reportCount: 3 }, 3)).toEqual([]);
    });

    it('takes one stage of each', () => {
      const input = ready({ participants: [participant({ peers: colleagues(3) })] });
      input.cycle = { ...input.cycle, anonymityThreshold: 3 };
      input.stages = [
        { perspective: 'peer', sortOrder: 1, evaluatorId: null, deadline: new Date('2027-01-10T00:00:00Z') },
        { perspective: 'peer', sortOrder: 2, evaluatorId: null, deadline: new Date('2027-01-15T00:00:00Z') },
      ];

      expect(checkReadiness(input)).toEqual([expect.objectContaining({ field: 'stages.1.perspective', message: 'Stage 2: use one peer stage.' })]);
    });
  });

  describe('participants step', () => {
    it('flags a cycle with no participant', () => {
      expect(checkReadiness(ready({ participants: [] }))).toEqual([
        expect.objectContaining({ step: 'participants', field: 'participants', message: 'Select at least one participant.' }),
      ]);
    });
  });

  describe('participants step, an employee who is not active', () => {
    it('asks HR to remove the participant, because launch would give an inactive employee an assignment', () => {
      const issues = checkReadiness(ready({ participants: [participant({ isActive: false })] }));

      expect(issues).toEqual([
        {
          step: 'participants',
          field: 'participants.00000000-0000-0000-0000-000000000021.employee',
          message: 'Iging DotTech is no longer an active employee of the company. Remove them from the cycle.',
        },
      ]);
    });

    it('reports one problem for an inactive participant: the template and manager checks do not pile on', () => {
      const issues = checkReadiness(
        ready({ participants: [participant({ isActive: false, kpiVersionId: null, managerId: null })] }),
      );

      expect(issues.map((issue) => issue.step)).toEqual(['participants']);
    });
  });

  describe('KPI and behavioral steps', () => {
    it('names the participant whose KPI template is not chosen, and says which position needs one', () => {
      const issues = checkReadiness(ready({ participants: [participant({ kpiVersionId: null })] }));

      expect(issues).toEqual([
        {
          step: 'kpi',
          field: 'participants.00000000-0000-0000-0000-000000000021.kpi',
          message: 'Iging DotTech: choose a published KPI goal template for the position Software Engineer.',
        },
      ]);
    });

    it('flags a KPI template that was archived after it was chosen', () => {
      const issues = checkReadiness(ready({ participants: [participant({ isKpiTemplatePublished: false })] }));

      expect(issues).toEqual([
        expect.objectContaining({ step: 'kpi', message: expect.stringContaining('no longer published') }),
      ]);
    });

    it('flags a missing and an archived behavioral template at the behavioral step', () => {
      expect(checkReadiness(ready({ participants: [participant({ behavioralVersionId: null })] }))).toEqual([
        expect.objectContaining({ step: 'behavioral' }),
      ]);
      expect(checkReadiness(ready({ participants: [participant({ isBehavioralTemplatePublished: false })] }))).toEqual([
        expect.objectContaining({ step: 'behavioral', message: expect.stringContaining('no longer published') }),
      ]);
    });

    it('says an employee with no position needs one before a KPI template can match', () => {
      const issues = checkReadiness(ready({ participants: [participant({ position: null, kpiVersionId: null })] }));

      expect(issues).toEqual([
        expect.objectContaining({ step: 'kpi', message: expect.stringContaining('has no position') }),
      ]);
    });
  });

  describe('stages step', () => {
    it('flags a cycle with no stage', () => {
      expect(checkReadiness(ready({ stages: [] }))).toEqual([
        expect.objectContaining({ step: 'stages', field: 'stages', message: 'Add at least one assessment stage.' }),
      ]);
    });

    it('flags a manager deadline that is not after the verification deadline, at the manager stage (D6)', () => {
      const input = ready();
      input.cycle = { ...input.cycle, verificationDeadline: new Date('2027-01-15T00:00:00Z') };

      expect(checkReadiness(input)).toEqual([
        { step: 'stages', field: 'stages.1.deadline', message: 'The manager assessment deadline must be after the manager verification deadline.' },
      ]);

      input.cycle = { ...input.cycle, goalsWeight: 0, behavioralWeight: 1 };
      expect(checkReadiness(input)).toEqual([]);
    });

    it('flags a stage deadline that is not after the stage before it', () => {
      const input = ready();
      input.stages[1]!.deadline = new Date('2027-01-10T00:00:00Z');

      expect(checkReadiness(input)).toEqual([
        expect.objectContaining({ step: 'stages', field: 'stages.1.deadline' }),
      ]);
    });

    it('flags a first stage deadline before assessment starts, and a stage with no deadline', () => {
      const early = ready();
      early.stages[0]!.deadline = new Date('2027-01-02T00:00:00Z');
      expect(checkReadiness(early)).toEqual([
        expect.objectContaining({ step: 'stages', field: 'stages.0.deadline' }),
      ]);

      const none = ready();
      none.stages[2]!.deadline = null;
      expect(checkReadiness(none)).toEqual([
        expect.objectContaining({ step: 'stages', field: 'stages.2.deadline', message: 'Set the deadline of stage 3.' }),
      ]);
    });

    it('flags an expired work window: a stage deadline or the verification deadline already passed', () => {
      const input = ready();
      input.cycle.assessmentStart = new Date('2026-10-01T00:00:00Z');
      input.stages[0]!.deadline = new Date('2026-11-01T00:00:00Z');
      input.cycle.verificationDeadline = new Date('2026-11-10T00:00:00Z');

      const fields = checkReadiness(input).map((issue) => issue.field);
      expect(fields).toContain('stages.0.deadline');
      expect(fields).toContain('verificationDeadline');
    });

    it('needs a named, eligible HR evaluator for an HR stage', () => {
      const none = ready();
      none.stages[2]!.evaluatorId = null;
      expect(checkReadiness(none)).toEqual([
        expect.objectContaining({ step: 'stages', field: 'stages.2.evaluatorId', message: 'Choose the HR evaluator of stage 3.' }),
      ]);

      const notEligible = ready({ eligibleHrEvaluatorIds: new Set() });
      expect(checkReadiness(notEligible)).toEqual([
        expect.objectContaining({ step: 'stages', field: 'stages.2.evaluatorId', message: expect.stringContaining('HR administrator') }),
      ]);
    });


    it('refuses an HR evaluator who is also a participant of the cycle', () => {
      const input = ready({
        participants: [participant({ employeeId: HR, name: 'System Administrator' })],
      });

      expect(checkReadiness(input)).toEqual([
        expect.objectContaining({ step: 'stages', field: 'stages.2.evaluatorId', message: expect.stringContaining('participant') }),
      ]);
    });

    it('needs an applied manager for each participant when there is a manager stage', () => {
      const input = ready({
        participants: [participant({ employeeId: MARIA, name: 'Maria Santos', managerId: null })],
      });

      expect(checkReadiness(input)).toEqual([
        {
          step: 'stages',
          field: `participants.${MARIA}.manager`,
          message: 'Maria Santos has no manager assigned yet, so the manager stage has no evaluator.',
        },
      ]);
    });

    it('does not ask for a manager when no stage is a manager stage', () => {
      const input = ready({ participants: [participant({ managerId: null })] });
      input.stages = input.stages.filter((stage) => stage.perspective !== 'manager');

      expect(checkReadiness(input)).toEqual([]);
    });
  });
});
