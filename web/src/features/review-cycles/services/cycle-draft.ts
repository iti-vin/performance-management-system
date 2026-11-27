import {
  createReviewCycleRequestSchema,
  type ReviewCycleDetailDto,
  type ReviewCycleOptionsDto,
  type ReviewType,
} from "@pms/shared-types";

import { weightsOf } from "@/features/review-cycles/services/cycle-components";

/** The stages of a cycle (PRD Cyc-003): self, manager, and HR, with optional peer and upward ones. */
export type StageKind = "self" | "manager" | "peer" | "upward" | "hr";

export interface StageDraft {
  perspective: StageKind;
  /** A calendar day, "YYYY-MM-DD". */
  deadline: string;
  /** The HR evaluator. Empty for self and manager: launch finds them. */
  evaluatorId: string;
}

/** What the wizard holds while HR types. Dates are calendar days, as a date input gives them. */
export interface CycleDraft {
  name: string;
  reviewType: ReviewType;
  evaluationStart: string;
  evaluationEnd: string;
  assessmentStart: string;
  verificationDeadline: string;
  /** Optional: "" when the cycle has none. */
  accomplishmentDeadline: string;
  description: string;
  usesGoals: boolean;
  usesBehavioral: boolean;
  employeeVisible: boolean;
  managerVisible: boolean;
  earlierAnswersVisible: boolean;
  participantIds: string[];
  /** The peers of each participant, by participant. Used with a peer stage. */
  peerChoices: Record<string, string[]>;
  /** The anonymity minimum as typed. Used with a peer or upward stage. */
  anonymityMinimum: string;
  /** A KPI template that HR chose for one employee, by employee id. */
  kpiChoices: Record<string, string>;
  behavioralDefaultId: string;
  /** A behavioral template for one position, by position text. */
  behavioralOverrides: Record<string, string>;
  stages: StageDraft[];
}

export type WizardStep = "details" | "participants" | "templates" | "stages";

export type KpiMatch =
  | { kind: "matched"; template: ReviewCycleOptionsDto["kpiTemplates"][number] }
  | { kind: "choose"; templates: ReviewCycleOptionsDto["kpiTemplates"] }
  | { kind: "none" };

export function newCycleDraft(): CycleDraft {
  return {
    name: "",
    reviewType: "standard",
    evaluationStart: "",
    evaluationEnd: "",
    assessmentStart: "",
    verificationDeadline: "",
    accomplishmentDeadline: "",
    description: "",
    usesGoals: true,
    usesBehavioral: true,
    employeeVisible: true,
    managerVisible: true,
    earlierAnswersVisible: true,
    participantIds: [],
    peerChoices: {},
    anonymityMinimum: "3",
    kpiChoices: {},
    behavioralDefaultId: "",
    behavioralOverrides: {},
    stages: [
      { perspective: "self", deadline: "", evaluatorId: "" },
      { perspective: "manager", deadline: "", evaluatorId: "" },
      { perspective: "hr", deadline: "", evaluatorId: "" },
    ],
  };
}

/** The company works in Asia/Manila (PRD 2.6): a day the user types means that day there. */
const MANILA_OFFSET = "+08:00";
const MANILA_HOURS = 8;

/** The start or the end of a calendar day in Manila, as the offset time that the API takes. */
export function toInstant(day: string, edge: "start" | "end"): string {
  if (day === "") return "";
  return `${day}T${edge === "start" ? "00:00:00" : "23:59:59"}${MANILA_OFFSET}`;
}

/** The Manila calendar day of an instant that the API sends back, usually as UTC ("...Z"). */
export function toDateInput(instant: string): string {
  const manila = new Date(new Date(instant).getTime() + MANILA_HOURS * 60 * 60 * 1000);
  return manila.toISOString().slice(0, 10);
}

/**
 * What the server will do for an employee, so the step can say it first: the one published
 * template of the exact position matches; several need a choice; none (or no position) leaves
 * the employee without a KPI template. The server keeps the same rule.
 */
export function matchKpi(templates: ReviewCycleOptionsDto["kpiTemplates"], position: string | null): KpiMatch {
  const matches = position === null ? [] : templates.filter((template) => template.position === position);
  if (matches.length === 1 && matches[0]) return { kind: "matched", template: matches[0] };
  return matches.length > 1 ? { kind: "choose", templates: matches } : { kind: "none" };
}

/** The wizard step that owns the field of a schema issue, so a failed save shows the message where it can be fixed. */
export function stepOfPath(path: readonly PropertyKey[]): WizardStep {
  const [root, , field] = path;
  if (root === "stages") return "stages";
  if (root === "participants") {
    return field === "kpiTemplateId" || field === "behavioralTemplateId" ? "templates" : "participants";
  }
  // Every other field (name, review type, the dates, the weights) belongs to the details step.
  return "details";
}

const EVALUATOR_ROLES = {
  self: "employee",
  manager: "manager",
  peer: "peer",
  upward: "direct_report",
  hr: "hr_officer",
} as const satisfies Record<StageKind, string>;

const isAnonymousStage = ({ perspective }: StageDraft) => perspective === "peer" || perspective === "upward";

/** One behavioral template per participant: the override of the position, else the default, else none. */
function behavioralTemplateFor(draft: CycleDraft, position: string | null): string | undefined {
  const chosen = (position !== null ? draft.behavioralOverrides[position] : undefined) || draft.behavioralDefaultId;
  return chosen || undefined;
}

/**
 * The body of the create and replace routes, checked with the shared schema. The weights follow
 * the chosen components (PRD 6.6). A KPI template is sent only when HR chose one: with none, the
 * server matches the one published template of the position. A failure keeps its path, so
 * `stepOfPath` can open the step that owns the first problem.
 */
export function toCycleRequest(draft: CycleDraft, options: ReviewCycleOptionsDto) {
  const hasPeers = draft.stages.some((stage) => stage.perspective === "peer");
  const participants = draft.participantIds.map((employeeId) => {
    const position = options.employees.find((employee) => employee.employeeId === employeeId)?.position ?? null;
    // A component that the cycle leaves out sends no template.
    const kpiTemplateId = draft.usesGoals ? draft.kpiChoices[employeeId] : undefined;
    const behavioralTemplateId = draft.usesBehavioral ? behavioralTemplateFor(draft, position) : undefined;
    return {
      employeeId,
      ...(kpiTemplateId ? { kpiTemplateId } : {}),
      ...(behavioralTemplateId ? { behavioralTemplateId } : {}),
      peerIds: hasPeers ? (draft.peerChoices[employeeId] ?? []) : [],
    };
  });

  return createReviewCycleRequestSchema.safeParse({
    name: draft.name,
    reviewType: draft.reviewType,
    evaluationStart: draft.evaluationStart,
    evaluationEnd: draft.evaluationEnd,
    assessmentStart: toInstant(draft.assessmentStart, "start"),
    verificationDeadline: toInstant(draft.verificationDeadline, "end"),
    accomplishmentDeadline: toInstant(draft.accomplishmentDeadline, "end") || null,
    description: draft.description,
    ...weightsOf(draft),
    employeeVisible: draft.employeeVisible,
    managerVisible: draft.managerVisible,
    earlierAnswersVisible: draft.earlierAnswersVisible,
    anonymityThreshold: draft.stages.some(isAnonymousStage) ? Number(draft.anonymityMinimum) || null : null,
    stages: draft.stages.map((stage) => ({
      perspective: stage.perspective,
      evaluatorRole: EVALUATOR_ROLES[stage.perspective],
      ...(stage.evaluatorId ? { evaluatorId: stage.evaluatorId } : {}),
      deadline: toInstant(stage.deadline, "end"),
    })),
    participants,
  });
}

type DetailParticipant = ReviewCycleDetailDto["participants"][number];
type OptionEmployee = ReviewCycleOptionsDto["employees"][number];

/** The template id that most participants share, or "" when none is given. */
function mostUsed(ids: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  // The first one to reach the highest count wins, so the result is the same every time.
  return [...counts.entries()].reduce<[string, number]>((best, entry) => (entry[1] > best[1] ? entry : best), ["", 0])[0];
}

/**
 * The behavioral default and the override of each position, from the templates that the
 * participants hold. A template that the options no longer offer (archived) is left out.
 */
function behavioralChoicesOf(
  participants: readonly DetailParticipant[],
  employees: ReadonlyMap<string, OptionEmployee>,
  offered: ReadonlySet<string>,
): Pick<CycleDraft, "behavioralDefaultId" | "behavioralOverrides"> {
  const chosenBy = (person: DetailParticipant) =>
    person.behavioralTemplateId && offered.has(person.behavioralTemplateId) ? person.behavioralTemplateId : "";
  const behavioralDefaultId = mostUsed(participants.map(chosenBy).filter(Boolean));

  const behavioralOverrides: Record<string, string> = {};
  for (const person of participants) {
    const position = employees.get(person.employeeId)?.position ?? null;
    const chosen = chosenBy(person);
    if (position !== null && chosen && chosen !== behavioralDefaultId) behavioralOverrides[position] ??= chosen;
  }
  return { behavioralDefaultId, behavioralOverrides };
}

/** The KPI template of each participant, kept only when it still fits the position of the employee. */
function kpiChoicesOf(
  participants: readonly DetailParticipant[],
  employees: ReadonlyMap<string, OptionEmployee>,
  templates: ReviewCycleOptionsDto["kpiTemplates"],
): Record<string, string> {
  const positions = new Map(templates.map((template) => [template.templateId, template.position]));
  const choices: Record<string, string> = {};
  for (const person of participants) {
    const templateId = person.kpiTemplateId;
    if (templateId && positions.get(templateId) === (employees.get(person.employeeId)?.position ?? null)) {
      choices[person.employeeId] = templateId;
    }
  }
  return choices;
}

/** The stages of a cycle in order, with the day of each deadline in Manila. */
function stagesOf(stages: ReviewCycleDetailDto["stages"]): StageDraft[] {
  return [...stages]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((stage) => ({ perspective: stage.perspective, deadline: dayOf(stage.deadline), evaluatorId: stage.evaluatorId ?? "" }));
}

const dayOf = (instant: string | null) => (instant ? toDateInput(instant) : "");

/**
 * The wizard draft of a saved cycle, so a draft can be edited. A saved choice is kept only
 * when the options still offer it: an archived template, or an employee who left, would make
 * the save answer 400 and block HR from fixing the draft. A save re-resolves each template
 * to its current published version, which is right for a draft: the version freezes at launch.
 */
export function draftFromDetail(detail: ReviewCycleDetailDto, options: ReviewCycleOptionsDto): CycleDraft {
  const employees = new Map(options.employees.map((person) => [person.employeeId, person]));
  const participants = detail.participants.filter((person) => employees.has(person.employeeId));
  const offeredBehavioral = new Set(options.behavioralTemplates.map((template) => template.templateId));

  return {
    name: detail.name,
    reviewType: detail.reviewType,
    evaluationStart: detail.evaluationStart,
    evaluationEnd: detail.evaluationEnd,
    assessmentStart: dayOf(detail.assessmentStart),
    verificationDeadline: dayOf(detail.verificationDeadline),
    accomplishmentDeadline: dayOf(detail.accomplishmentDeadline),
    description: detail.description ?? "",
    usesGoals: detail.goalsWeight > 0,
    usesBehavioral: detail.behavioralWeight > 0,
    employeeVisible: detail.employeeVisible,
    managerVisible: detail.managerVisible,
    earlierAnswersVisible: detail.earlierAnswersVisible,
    participantIds: participants.map((person) => person.employeeId),
    // A peer who left is not offered any more, so the save leaves them out.
    peerChoices: Object.fromEntries(
      participants.map((person) => [person.employeeId, (person.peerIds ?? []).filter((peer) => employees.has(peer))]),
    ),
    anonymityMinimum: String(detail.anonymityThreshold ?? 3),
    kpiChoices: kpiChoicesOf(participants, employees, options.kpiTemplates),
    ...behavioralChoicesOf(participants, employees, offeredBehavioral),
    stages: stagesOf(detail.stages),
  };
}
