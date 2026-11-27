/**
 * The evidence and the scores of every participant of a cycle, read inside the finalizing
 * transaction: one query for each table, however many participants the cycle has.
 */
import { randomUUID } from 'node:crypto';
import { UnprocessableEntityException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import type { EvaluatorType, ResultBehaviorDto, ResultGoalsDto } from '@pms/shared-types';
import { BehavioralQuestion } from '../../behavioral-assessment/entities/behavioral-question.entity.js';
import { BehavioralSection } from '../../behavioral-assessment/entities/behavioral-section.entity.js';
import { BehavioralTemplateVersion } from '../../behavioral-assessment/entities/behavioral-template-version.entity.js';
import { BehavioralTemplate } from '../../behavioral-assessment/entities/behavioral-template.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { KpiGoalTemplate } from '../../kpi-goals/entities/kpi-goal-template.entity.js';
import { KpiIndicatorScale } from '../../kpi-goals/entities/kpi-indicator-scale.entity.js';
import { KpiIndicator } from '../../kpi-goals/entities/kpi-indicator.entity.js';
import { KpiTemplateVersion } from '../../kpi-goals/entities/kpi-template-version.entity.js';
import { AccomplishmentActual } from '../entities/accomplishment-actual.entity.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { AssignmentResponse } from '../entities/assignment-response.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CycleStage } from '../entities/cycle-stage.entity.js';
import type { Cycle } from '../entities/cycle.entity.js';
import type { EvaluationSnapshot, SnapshotEvidence } from '../entities/evaluation-snapshot.entity.js';
import { nameOf, peopleOf } from './reviews.service.js';
import { overallScore, scoreIndicator, summarizeBehavior, weightedScore, type ScoredQuestion } from './scoring.js';

const PERSPECTIVE_WORDS: Record<EvaluatorType, string> = {
  self: 'Self',
  manager: 'Manager',
  hr: 'HR',
  peer: 'Peer',
  upward: 'Upward',
};
const LOCK_FOR_WRITE = { mode: 'pessimistic_write' } as const;

export type NewSnapshot = Omit<EvaluationSnapshot, 'finalizedBy' | 'finalizedAt' | 'releasedAt'>;
type Facts = Awaited<ReturnType<typeof readFacts>>;

/** `find` with an empty list of ids reads nothing, so it asks nothing. */
async function findIn<T extends object>(
  manager: EntityManager,
  entity: new () => T,
  key: keyof T & string,
  ids: (string | null | undefined)[],
): Promise<T[]> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return [];
  return manager.getRepository(entity).find({ where: { [key]: In(unique) } as never });
}

async function readFacts(manager: EntityManager, company: string, cycle: Cycle) {
  const { cycleId } = cycle;
  const participants = await manager.getRepository(CycleParticipant).find({ where: { cycleId } });
  const stages = await manager.getRepository(CycleStage).find({ where: { cycleId } });
  const assignments = await manager
    .getRepository(Assignment)
    .find({ where: { cycleId }, order: { assignmentId: 'ASC' }, lock: LOCK_FOR_WRITE });
  const accomplishments = await manager.getRepository(Accomplishment).find({ where: { cycleId }, lock: LOCK_FOR_WRITE });
  const people = await peopleOf(manager.getRepository(EmployeeDomain), company, [
    ...participants.map((participant) => participant.employeeId),
    ...assignments.map((assignment) => assignment.evaluatorId),
  ]);

  const kpiVersionIds = participants.map((participant) => participant.kpiVersionId);
  const indicators = await findIn(manager, KpiIndicator, 'versionId', kpiVersionIds);
  const scales = await findIn(manager, KpiIndicatorScale, 'indicatorId', indicators.map((row) => row.indicatorId));
  const actuals = await findIn(manager, AccomplishmentActual, 'accomplishmentId', accomplishments.map((row) => row.accomplishmentId));
  const kpiVersions = await findIn(manager, KpiTemplateVersion, 'versionId', kpiVersionIds);
  const kpiTemplates = await findIn(manager, KpiGoalTemplate, 'templateId', kpiVersions.map((row) => row.templateId));

  const behaviorVersionIds = participants.map((participant) => participant.behavioralVersionId);
  const sections = await findIn(manager, BehavioralSection, 'versionId', behaviorVersionIds);
  const questions = await findIn(manager, BehavioralQuestion, 'sectionId', sections.map((row) => row.sectionId));
  const behaviorVersions = await findIn(manager, BehavioralTemplateVersion, 'versionId', behaviorVersionIds);
  const behaviorTemplates = await findIn(manager, BehavioralTemplate, 'templateId', behaviorVersions.map((row) => row.templateId));
  const responses = await findIn(manager, AssignmentResponse, 'assignmentId', assignments.map((row) => row.assignmentId));

  return {
    participants,
    stages,
    assignments,
    accomplishments,
    people,
    indicators,
    scales,
    actuals,
    kpiVersions,
    kpiTemplates,
    sections,
    questions,
    behaviorVersions,
    behaviorTemplates,
    responses,
  };
}

/** Everything that still holds finalization back, in the order of the names (Res-001). */
function missingOf(cycle: Cycle, facts: Facts) {
  const stageById = new Map(facts.stages.map((stage) => [stage.stageId, stage]));
  return facts.participants
    .map((participant) => ({ participant, name: nameOf(facts.people.get(participant.employeeId)) }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(({ participant, name }) => {
      const reviews = facts.assignments
        .filter((row) => row.participantId === participant.participantId)
        .filter((row) => row.state !== 'submitted' && row.state !== 'completed')
        .map((row) => stageById.get(row.stageId)?.perspective)
        .map((perspective) => `${name}: the ${perspective ? PERSPECTIVE_WORDS[perspective] : 'assigned'} review is not submitted.`);
      const isVerified = facts.accomplishments.some(
        (row) => row.participantId === participant.participantId && row.status === 'verified',
      );
      const report = Number(cycle.goalsWeight) > 0 && !isVerified ? [`${name}: the KPI accomplishments are not verified.`] : [];
      return [...reviews, ...report].map((message) => ({ field: `participants.${participant.participantId}`, code: 'NOT_READY', message }));
    });
}

/** The verified actual results of one participant against the frozen indicators (Res-004). */
function goalsOf(participant: CycleParticipant, facts: Facts): ResultGoalsDto {
  const version = facts.kpiVersions.find((row) => row.versionId === participant.kpiVersionId);
  const template = facts.kpiTemplates.find((row) => row.templateId === version?.templateId);
  const accomplishment = facts.accomplishments.find((row) => row.participantId === participant.participantId);
  const actuals = facts.actuals.filter((row) => row.accomplishmentId === accomplishment?.accomplishmentId);

  return {
    templateName: template?.name ?? null,
    templateVersion: version?.version ?? null,
    indicators: facts.indicators
      .filter((indicator) => indicator.versionId === participant.kpiVersionId)
      .map((indicator) => {
        const actual = actuals.find((row) => row.indicatorId === indicator.indicatorId);
        const actualValue = actual?.actualValue ?? null;
        const scales = facts.scales
          .filter((row) => row.indicatorId === indicator.indicatorId)
          // The threshold order of the KPI screens: the row with no upper limit comes last.
          .sort((a, b) => Number(a.lowerBound ?? 0) - Number(b.lowerBound ?? 0) || Number(a.upperBound ?? Infinity) - Number(b.upperBound ?? Infinity));
        return {
          indicatorId: indicator.indicatorId,
          name: indicator.name,
          unit: indicator.unit ?? null,
          target: indicator.target === null ? null : Number(indicator.target),
          direction: indicator.direction,
          weight: Number(indicator.weight),
          actualValue,
          ...scoreIndicator({ ...indicator, scales }, actualValue),
          remarks: actual?.remarks ?? null,
        };
      }),
  };
}

/** The questions of one frozen version, in the order of the form. */
function questionsOf(versionId: string | null, facts: Facts): ScoredQuestion[] {
  return facts.sections
    .filter((section) => section.versionId === versionId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((section) =>
      facts.questions
        .filter((question) => question.sectionId === section.sectionId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ questionId, prompt, questionType }) => ({ questionId, prompt, questionType, sectionTitle: section.title })),
    );
}

/** The latest submitted version of each assignment: an older one was replaced after a reopening. */
function behaviorOf(participant: CycleParticipant, cycle: Cycle, facts: Facts): ResultBehaviorDto & { score: number | null } {
  const stageById = new Map(facts.stages.map((stage) => [stage.stageId, stage]));
  const own = facts.assignments
    .filter((row) => row.participantId === participant.participantId)
    .flatMap((assignment) => {
      const stage = stageById.get(assignment.stageId);
      return stage ? [{ assignment, stage }] : [];
    })
    .sort((a, b) => a.stage.sortOrder - b.stage.sortOrder);
  const responses = own.flatMap(({ assignment, stage }) => {
    const [latest] = facts.responses
      .filter((row) => row.assignmentId === assignment.assignmentId && row.status === 'submitted')
      .sort((a, b) => b.version - a.version);
    if (!latest) return [];
    return [
      {
        perspective: stage.perspective,
        evaluatorName: nameOf(facts.people.get(assignment.evaluatorId)),
        submittedAt: latest.submittedAt?.toISOString() ?? null,
        answers: latest.answersJson,
      },
    ];
  });
  const version = facts.behaviorVersions.find((row) => row.versionId === participant.behavioralVersionId);
  const template = facts.behaviorTemplates.find((row) => row.templateId === version?.templateId);

  return {
    templateName: template?.name ?? null,
    templateVersion: version?.version ?? null,
    ...summarizeBehavior({
      questions: questionsOf(participant.behavioralVersionId, facts),
      responses,
      anonymityThreshold: cycle.anonymityThreshold ?? null,
    }),
  };
}

function snapshotOf(participant: CycleParticipant, cycle: Cycle, facts: Facts): NewSnapshot {
  const person = facts.people.get(participant.employeeId);
  const goalsWeight = Number(cycle.goalsWeight);
  const behavioralWeight = Number(cycle.behavioralWeight);
  // A component with weight zero does not apply: it has no evidence and no score (Res-007).
  const goals = goalsWeight > 0 ? goalsOf(participant, facts) : null;
  const behavior = behavioralWeight > 0 ? behaviorOf(participant, cycle, facts) : null;
  const goalsScore = goals ? weightedScore(goals.indicators) : null;
  const behavioralScore = behavior?.score ?? null;
  const { score: _score, ...behavioral } = behavior ?? { score: null };
  const evidence: SnapshotEvidence = {
    employeeName: nameOf(person),
    position: participant.frozenPosition ?? null,
    department: person?.department ?? null,
    goalsWeight,
    behavioralWeight,
    goals,
    behavioral: behavior ? (behavioral as ResultBehaviorDto) : null,
  };

  return {
    snapshotId: randomUUID(),
    cycleId: cycle.cycleId,
    participantId: participant.participantId,
    goalsComponentScore: goalsScore,
    behavioralComponentScore: behavioralScore,
    overallScore: overallScore([
      { weight: goalsWeight, score: goalsScore },
      { weight: behavioralWeight, score: behavioralScore },
    ]),
    evidenceJson: evidence,
  };
}

/** Checks the completion gates, then builds one snapshot for each participant. */
export async function snapshotsOf(
  manager: EntityManager,
  company: string,
  cycle: Cycle,
): Promise<{ snapshots: NewSnapshot[]; assignments: Assignment[] }> {
  const facts = await readFacts(manager, company, cycle);
  const missing = missingOf(cycle, facts);
  if (missing.length > 0) {
    throw new UnprocessableEntityException({ message: 'The cycle cannot be finalized yet.', details: missing });
  }
  return {
    snapshots: facts.participants.map((participant) => snapshotOf(participant, cycle, facts)),
    assignments: facts.assignments,
  };
}
