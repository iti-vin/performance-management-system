import { describe, expect, it } from 'vitest';
import type { CycleParticipant } from '../entities/cycle-participant.entity.js';
import type { CycleStage } from '../entities/cycle-stage.entity.js';
import { buildAssignments } from './cycle-work.js';

const repo = { create: (row: object) => row } as never;
const rows = [
  { participantId: 'p-1', employeeId: 'ana' },
  { participantId: 'p-2', employeeId: 'boss' },
] as CycleParticipant[];
const stage = (stageId: string, perspective: string, sortOrder: number, evaluatorId: string | null = null) =>
  ({ stageId, perspective, sortOrder, evaluatorId, deadline: new Date('2027-01-10') }) as CycleStage;
const evaluators = {
  managerOf: new Map([['ana', 'boss'], ['boss', 'chief']]),
  peersOf: new Map([['p-1', ['ben', 'cara']], ['p-2', ['dino', 'ella']]]),
  reportsOf: new Map([['boss', ['ana', 'ben']]]),
};
const made = (stages: CycleStage[], participantId: string) =>
  buildAssignments(repo, { cycleId: 'c-1', stages, rows, evaluators })
    .filter((row) => row.participantId === participantId)
    .map((row) => [row.stageId, row.evaluatorId, row.state]);

describe('buildAssignments with anonymous stages', () => {
  const stages = [stage('s', 'self', 1), stage('peer', 'peer', 2), stage('up', 'upward', 3), stage('hr', 'hr', 4, 'hana')];

  it('gives each named peer and each direct report an assignment of their stage', () => {
    expect(made(stages, 'p-2')).toEqual([
      ['s', 'boss', 'not_started'],
      ['peer', 'dino', 'locked'],
      ['peer', 'ella', 'locked'],
      ['up', 'ana', 'locked'],
      ['up', 'ben', 'locked'],
      ['hr', 'hana', 'locked'],
    ]);
  });

  it('gives no upward assignment to a participant with no eligible report', () => {
    expect(made(stages, 'p-1').map(([stageId]) => stageId)).toEqual(['s', 'peer', 'peer', 'hr']);
  });

  it('opens the first stage that has an evaluator for the participant', () => {
    const upwardFirst = [stage('up', 'upward', 1), stage('hr', 'hr', 2, 'hana')];

    expect(made(upwardFirst, 'p-1')).toEqual([['hr', 'hana', 'not_started']]);
    expect(made(upwardFirst, 'p-2')).toEqual([
      ['up', 'ana', 'not_started'],
      ['up', 'ben', 'not_started'],
      ['hr', 'hana', 'locked'],
    ]);
  });

  it('stops when a manager or an HR evaluator is missing: readiness ran first', () => {
    expect(() => made([stage('hr', 'hr', 1)], 'p-1')).toThrow('No evaluator for stage hr');
  });
});
