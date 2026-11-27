import { accomplishmentDeadlineProblem, managerDeadlineProblem, type EvaluatorType } from '@pms/shared-types';

/** The wizard step that owns a problem, so the page can link the error to it. */
export type ReadinessStep = 'details' | 'participants' | 'kpi' | 'behavioral' | 'stages';

export interface ReadinessIssue {
  step: ReadinessStep;
  field: string;
  message: string;
}

export interface ReadinessParticipant {
  employeeId: string;
  name: string;
  /** False when the employee is inactive or has left the company since the cycle chose them. */
  isActive: boolean;
  position: string | null;
  /** The frozen KPI version, or null when none is chosen yet. */
  kpiVersionId: string | null;
  /** False when the template of the stored KPI version has since been archived. */
  isKpiTemplatePublished: boolean;
  behavioralVersionId: string | null;
  isBehavioralTemplatePublished: boolean;
  /** The manager of today, from an applied assignment. Null when none is in force. */
  managerId: string | null;
  /** The named peers who are active employees of the company, the participant left out. */
  peers: readonly { employeeId: string; name: string }[];
  /** The employees whom this person manages today. */
  reportCount: number;
}

export interface ReadinessInput {
  now: Date;
  cycle: {
    evaluationStart: string;
    evaluationEnd: string;
    assessmentStart: Date | null;
    verificationDeadline: Date | null;
    accomplishmentDeadline: Date | null;
    anonymityThreshold: number | null;
    goalsWeight: number;
    behavioralWeight: number;
  };
  stages: {
    perspective: EvaluatorType;
    sortOrder: number;
    evaluatorId: string | null;
    deadline: Date | null;
  }[];
  participants: ReadinessParticipant[];
  /** Employee GUIDs that may evaluate a named stage: an admin login, in the company of the cycle. */
  eligibleHrEvaluatorIds: ReadonlySet<string>;
}

const WEIGHT_TOLERANCE = 0.0001;

/** The accomplishment deadline is optional. A set one follows the shared date rule, and has not passed. */
function accomplishmentProblem(cycle: ReadinessInput['cycle'], now: Date): string | null {
  const { accomplishmentDeadline } = cycle;
  if (!accomplishmentDeadline) return null;
  if (accomplishmentDeadline < now) return 'The accomplishment deadline has passed.';
  return accomplishmentDeadlineProblem({ ...cycle, accomplishmentDeadline });
}

function checkDetails({ cycle, now }: ReadinessInput): ReadinessIssue[] {
  const issue = (field: string, message: string): ReadinessIssue => ({ step: 'details', field, message });
  const issues: ReadinessIssue[] = [];
  if (cycle.evaluationEnd < cycle.evaluationStart) {
    issues.push(issue('evaluationEnd', 'The period end cannot be before the period start.'));
  }
  if (!cycle.assessmentStart) issues.push(issue('assessmentStart', 'Set the assessment start.'));
  if (!cycle.verificationDeadline) {
    issues.push(issue('verificationDeadline', 'Set the verification deadline.'));
  } else if (cycle.assessmentStart && cycle.verificationDeadline < cycle.assessmentStart) {
    issues.push(issue('verificationDeadline', 'The verification deadline cannot be before assessment starts.'));
  }
  const deadlineProblem = accomplishmentProblem(cycle, now);
  if (deadlineProblem) issues.push(issue('accomplishmentDeadline', deadlineProblem));
  if (Math.abs(cycle.goalsWeight + cycle.behavioralWeight - 1) > WEIGHT_TOLERANCE) {
    issues.push(issue('behavioralWeight', 'Goal and behavioral weights must total 1.'));
  }
  return issues;
}

/** One problem per participant and template kind: missing, or chosen once and archived since. */
function checkTemplate(
  person: ReadinessParticipant,
  step: 'kpi' | 'behavioral',
  versionId: string | null,
  isPublished: boolean,
): ReadinessIssue[] {
  const kind = step === 'kpi' ? 'KPI goal' : 'behavioral';
  const field = `participants.${person.employeeId}.${step}`;
  if (versionId === null) {
    const needs =
      step === 'kpi'
        ? person.position
          ? ` for the position ${person.position}`
          : '. The employee has no position, so none can match'
        : '';
    return [{ step, field, message: `${person.name}: choose a published ${kind} template${needs}.` }];
  }
  if (!isPublished) {
    return [{ step, field, message: `${person.name}: the ${kind} template is no longer published. Choose another.` }];
  }
  return [];
}

type ReadinessStage = ReadinessInput['stages'][number];

const firstOf = (first: ReadinessIssue[], second: ReadinessIssue[]) => (first.length > 0 ? first : second);

/** One deadline problem of a stage at most: missing, passed, before assessment starts, or not after the stage before. */
function checkStageDeadline(stage: ReadinessStage, index: number, ordered: ReadinessStage[], input: ReadinessInput): ReadinessIssue[] {
  const position = index + 1;
  const issue = (message: string): ReadinessIssue[] => [{ step: 'stages', field: `stages.${index}.deadline`, message }];
  const { deadline } = stage;
  if (!deadline) return issue(`Set the deadline of stage ${position}.`);
  if (deadline < input.now) return issue(`The deadline of stage ${position} has passed.`);

  const problem = stageOrderProblem(ordered.map((each) => each.deadline), index, input.cycle.assessmentStart);
  return problem ? issue(problem) : [];
}

/** The manager assessment comes after the verification of the goals (decision D6). */
function checkManagerDeadline(stage: ReadinessStage, index: number, cycle: ReadinessInput['cycle']): ReadinessIssue[] {
  if (stage.perspective !== 'manager') return [];
  const message = managerDeadlineProblem({ ...cycle, managerDeadline: stage.deadline });
  return message ? [{ step: 'stages', field: `stages.${index}.deadline`, message }] : [];
}

/**
 * The order rule of the stage deadlines: the first is not before assessment starts, and each
 * later one is after the stage before it. The deadlines are in stage order.
 */
export function stageOrderProblem(deadlines: (Date | null)[], index: number, assessmentStart: Date | null): string | null {
  const deadline = deadlines[index];
  if (!deadline) return null;
  if (index === 0) {
    return assessmentStart && deadline < assessmentStart ? 'The first stage deadline cannot be before assessment starts.' : null;
  }
  const previous = deadlines[index - 1];
  return previous && deadline <= previous ? `The deadline of stage ${index + 1} must be after stage ${index}.` : null;
}

/** An HR stage names its evaluator. The other stages derive theirs at launch. */
function checkStagePerspective(stage: ReadinessStage, index: number, input: ReadinessInput): ReadinessIssue[] {
  return stage.perspective === 'hr' ? checkHrEvaluator(stage, index, input) : [];
}

function checkHrEvaluator(stage: ReadinessStage, index: number, input: ReadinessInput): ReadinessIssue[] {
  const position = index + 1;
  const issue = (message: string): ReadinessIssue[] => [{ step: 'stages', field: `stages.${index}.evaluatorId`, message }];
  if (!stage.evaluatorId) return issue(`Choose the HR evaluator of stage ${position}.`);
  if (input.participants.some((person) => person.employeeId === stage.evaluatorId)) {
    return issue(`The evaluator of stage ${position} is a participant of this cycle. Choose someone else.`);
  }
  if (!input.eligibleHrEvaluatorIds.has(stage.evaluatorId)) {
    return issue(`The evaluator of stage ${position} must be an HR administrator of the company.`);
  }
  return [];
}

/**
 * A peer or upward stage is anonymous, so it needs the minimum below which nothing shows
 * (Res-008). Each participant needs that many peers. An upward stage assesses the
 * participants who have that many direct reports, so at least one must.
 */
function checkAnonymousStages({ cycle, stages, participants }: ReadinessInput): ReadinessIssue[] {
  const ordered = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const issue = (field: string, message: string): ReadinessIssue => ({ step: 'stages', field, message });
  const found = (['peer', 'upward'] as const).flatMap((perspective) => {
    const positions = ordered.flatMap((stage, index) => (stage.perspective === perspective ? [index] : []));
    return positions.slice(1).map((index) => issue(`stages.${index}.perspective`, `Stage ${index + 1}: use one ${perspective} stage.`));
  });
  const has = (perspective: 'peer' | 'upward') => ordered.some((stage) => stage.perspective === perspective);
  if (!has('peer') && !has('upward')) return found;

  const minimum = cycle.anonymityThreshold;
  if (minimum === null) return [...found, issue('anonymityThreshold', 'Set the anonymity minimum for the peer and upward stages.')];
  const short = has('peer') ? participants.filter((person) => person.isActive && person.peers.length < minimum) : [];
  const peers = short.map((person) => issue(`participants.${person.employeeId}.peers`, `${person.name} needs at least ${minimum} peers.`));
  const upwardAt = ordered.findIndex((stage) => stage.perspective === 'upward');
  const upward =
    upwardAt >= 0 && !participants.some((person) => person.reportCount >= minimum)
      ? [issue(`stages.${upwardAt}.perspective`, `No participant has ${minimum} direct reports, so the upward stage has no evaluator.`)]
      : [];
  return [...found, ...peers, ...upward];
}

/**
 * A peer stays anonymous only while they read no pooled result. The manager of the participant,
 * the HR evaluator, and HR administrators do (decision D12, Res-008). Peers are read for a
 * cycle with a peer stage only.
 */
function checkPeerChoices({ stages, participants, eligibleHrEvaluatorIds }: ReadinessInput): ReadinessIssue[] {
  const evaluators = new Set(stages.flatMap((stage) => (stage.perspective === 'hr' && stage.evaluatorId ? [stage.evaluatorId] : [])));
  return participants
    .filter((person) => person.isActive)
    .flatMap((person) =>
      person.peers
        .filter(({ employeeId }) => employeeId === person.managerId || evaluators.has(employeeId) || eligibleHrEvaluatorIds.has(employeeId))
        .map(({ name }) => ({
          step: 'stages' as const,
          field: `participants.${person.employeeId}.peers`,
          message: `${person.name}: ${name} cannot be an anonymous peer. The manager of the participant, the HR evaluator, and HR administrators read the results. Choose someone else.`,
        })),
    );
}

/** With a manager stage, each participant needs an applied manager: that person is the evaluator. */
function checkManagers({ stages, participants }: ReadinessInput): ReadinessIssue[] {
  if (!stages.some((stage) => stage.perspective === 'manager')) return [];
  return participants
    .filter((person) => person.isActive && person.managerId === null)
    .map((person) => ({
      step: 'stages' as const,
      field: `participants.${person.employeeId}.manager`,
      message: `${person.name} has no manager assigned yet, so the manager stage has no evaluator.`,
    }));
}

function checkStages(input: ReadinessInput): ReadinessIssue[] {
  if (input.stages.length === 0) {
    return [{ step: 'stages', field: 'stages', message: 'Add at least one assessment stage.' }];
  }
  const ordered = [...input.stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const verificationPassed =
    input.cycle.verificationDeadline !== null && input.cycle.verificationDeadline < input.now
      ? [{ step: 'stages' as const, field: 'verificationDeadline', message: 'The verification deadline has passed.' }]
      : [];

  return [
    ...ordered.flatMap((stage, index) => [
      // One problem of a deadline at most: the order of the stages first.
      ...firstOf(checkStageDeadline(stage, index, ordered, input), checkManagerDeadline(stage, index, input.cycle)),
      ...checkStagePerspective(stage, index, input),
    ]),
    ...verificationPassed,
    ...checkManagers(input),
    ...checkAnonymousStages(input),
    ...checkPeerChoices(input),
  ];
}

/** An inactive participant is one problem: the template and manager checks of that person would only pile on. */
function checkParticipant(person: ReadinessParticipant, { goalsWeight, behavioralWeight }: ReadinessInput['cycle']): ReadinessIssue[] {
  if (!person.isActive) {
    return [
      {
        step: 'participants',
        field: `participants.${person.employeeId}.employee`,
        message: `${person.name} is no longer an active employee of the company. Remove them from the cycle.`,
      },
    ];
  }
  // A component with weight zero does not apply, so it needs no template (Res-007).
  return [
    ...(goalsWeight > 0 ? checkTemplate(person, 'kpi', person.kpiVersionId, person.isKpiTemplatePublished) : []),
    ...(behavioralWeight > 0
      ? checkTemplate(person, 'behavioral', person.behavioralVersionId, person.isBehavioralTemplatePublished)
      : []),
  ];
}

export function checkReadiness(input: ReadinessInput): ReadinessIssue[] {
  const participantIssues: ReadinessIssue[] =
    input.participants.length === 0
      ? [{ step: 'participants', field: 'participants', message: 'Select at least one participant.' }]
      : input.participants.flatMap((person) => checkParticipant(person, input.cycle));
  return [...checkDetails(input), ...participantIssues, ...checkStages(input)];
}
