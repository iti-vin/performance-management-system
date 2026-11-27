import { z } from "zod";
import { evaluatorTypeSchema } from "../domain/evaluator-type.enum.js";
import { evaluationStatusSchema } from "../domain/evaluation-status.enum.js";
import { reviewTypeSchema } from "../domain/review-type.enum.js";
import {
  dateOnlySchema,
  idSchema,
  requiredTextSchema,
  storableTextSchema,
  timestampSchema,
} from "../common.js";
import {
  accomplishmentDeadlineProblem,
  managerDeadlineProblem,
} from "../rules/cycle-dates.js";
import { cycleStagesRowSchema, cyclesRowSchema } from "../rows/index.js";

export const cycleStageDtoSchema = cycleStagesRowSchema;
export type CycleStageDto = z.infer<typeof cycleStageDtoSchema>;

export const reviewCycleDtoSchema = cyclesRowSchema.extend({
  /** ASSUMPTION: the API embeds stages. */
  stages: z.array(cycleStageDtoSchema).optional(),
});
export type ReviewCycleDto = z.infer<typeof reviewCycleDtoSchema>;

/** A fraction with two decimals: pms.cycles stores numeric(4,2), which rounds a third decimal away. */
const weightSchema = z.number().min(0).max(1).multipleOf(0.01);

const stageRequestSchema = z.object({
  perspective: evaluatorTypeSchema,
  evaluatorRole: requiredTextSchema,
  /** The named person. Left out for self and manager: launch derives the evaluator. */
  evaluatorId: idSchema.optional(),
  deadline: timestampSchema,
});

export const MAX_CYCLE_PARTICIPANTS = 500;
export const MAX_CYCLE_DESCRIPTION_LENGTH = 2000;

/** A launch creates one assignment per participant and stage, so both counts have a limit. */
export const MAX_CYCLE_STAGES = 10;

/** The most peers of one participant. */
export const MAX_CYCLE_PEERS = 20;

/**
 * One participant. The server turns each template id into the current frozen version.
 * With no KPI template named, the one published template of the exact position is used.
 */
const participantRequestSchema = z
  .object({
    employeeId: idSchema,
    kpiTemplateId: idSchema.optional(),
    behavioralTemplateId: idSchema.optional(),
    /** The peers who assess the participant in a peer stage (Cyc-003). */
    peerIds: z.array(idSchema).max(MAX_CYCLE_PEERS).default([]),
  })
  .superRefine(({ employeeId, peerIds }, ctx) => {
    if (new Set(peerIds).size !== peerIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Name each peer once.",
        path: ["peerIds"],
      });
    }
    if (peerIds.includes(employeeId)) {
      ctx.addIssue({
        code: "custom",
        message: "Nobody is their own peer.",
        path: ["peerIds"],
      });
    }
  });

/**
 * Mirrors the database CHECK rules so errors show before the request. The
 * weights are fractions (the column default is 0.50 each) and must total 1.
 */
export const createReviewCycleRequestSchema = z
  .object({
    name: requiredTextSchema,
    reviewType: reviewTypeSchema,
    evaluationStart: dateOnlySchema,
    evaluationEnd: dateOnlySchema,
    assessmentStart: timestampSchema,
    verificationDeadline: timestampSchema,
    /** The employee reports by then (Acc-006). Null: only the verification deadline closes a report. */
    accomplishmentDeadline: timestampSchema.nullable().default(null),
    description: storableTextSchema
      .trim()
      .max(MAX_CYCLE_DESCRIPTION_LENGTH)
      .default(""),
    goalsWeight: weightSchema,
    behavioralWeight: weightSchema,
    /** Who reads the released results, beside HR (Cyc-001). */
    employeeVisible: z.boolean().default(true),
    managerVisible: z.boolean().default(true),
    /** The reviewer of a later stage reads the submitted answers of an earlier one (D5). */
    earlierAnswersVisible: z.boolean().default(true),
    anonymityThreshold: z
      .number()
      .int()
      .min(2)
      .max(10)
      .nullable()
      .default(null),
    stages: z
      .array(stageRequestSchema)
      .min(1, "Add at least one stage.")
      .max(
        MAX_CYCLE_STAGES,
        `A cycle takes at most ${MAX_CYCLE_STAGES} stages.`,
      ),
    participants: z
      .array(participantRequestSchema)
      .max(MAX_CYCLE_PARTICIPANTS)
      .default([]),
  })
  .superRefine((cycle, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (cycle.evaluationEnd < cycle.evaluationStart) {
      issue(
        "evaluationEnd",
        "The period end cannot be before the period start.",
      );
    }
    if (
      Date.parse(cycle.verificationDeadline) < Date.parse(cycle.assessmentStart)
    ) {
      issue(
        "verificationDeadline",
        "The verification deadline cannot be before assessment starts.",
      );
    }
    const deadlineProblem =
      cycle.accomplishmentDeadline &&
      accomplishmentDeadlineProblem({
        accomplishmentDeadline: new Date(cycle.accomplishmentDeadline),
        evaluationEnd: cycle.evaluationEnd,
        verificationDeadline: new Date(cycle.verificationDeadline),
      });
    if (deadlineProblem) issue("accomplishmentDeadline", deadlineProblem);
    cycle.stages.forEach((stage, index) => {
      const previous = cycle.stages[index - 1];
      if (
        previous &&
        Date.parse(stage.deadline) <= Date.parse(previous.deadline)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["stages", index, "deadline"],
          message: "The deadline must be after the stage before it.",
        });
      }
    });
    const managerAt = cycle.stages.findIndex(
      (stage) => stage.perspective === "manager",
    );
    const managerStage = cycle.stages[managerAt];
    const managerProblem =
      managerStage &&
      managerDeadlineProblem({
        managerDeadline: new Date(managerStage.deadline),
        verificationDeadline: new Date(cycle.verificationDeadline),
        goalsWeight: cycle.goalsWeight,
      });
    if (managerProblem) {
      ctx.addIssue({
        code: "custom",
        path: ["stages", managerAt, "deadline"],
        message: managerProblem,
      });
    }
    if (Math.abs(cycle.goalsWeight + cycle.behavioralWeight - 1) > 0.0001) {
      issue("behavioralWeight", "Goal and behavioral weights must total 1.");
    }
  });
export type CreateReviewCycleRequestDto = z.infer<
  typeof createReviewCycleRequestSchema
>;

const countSchema = z.number().int().min(0);

/**
 * One row of the review cycle register: the cycle, its last stage deadline, and the
 * participant and assignment counts that the register shows.
 */
export const reviewCycleListRowSchema = cyclesRowSchema
  .pick({
    cycleId: true,
    name: true,
    reviewType: true,
    state: true,
    evaluationStart: true,
    evaluationEnd: true,
    releasedAt: true,
  })
  .extend({
    deadline: timestampSchema.nullable(),
    participantCount: countSchema,
    assignmentCount: countSchema,
    submittedCount: countSchema,
    completedCount: countSchema,
  });
export type ReviewCycleListRowDto = z.infer<typeof reviewCycleListRowSchema>;

/**
 * What the cycle wizard may offer, inside the company of the caller. The API reads the
 * employees that have a GUID, the published templates, and the admin logins.
 */
export const reviewCycleOptionsSchema = z.object({
  employees: z.array(
    z.object({
      employeeId: idSchema,
      name: z.string(),
      position: z.string().nullable(),
      department: z.string(),
      /** The employee ID that people know (pms.employees.code). */
      employeeCode: z.string(),
      /** The applied manager today. Null when none is in force. */
      managerId: idSchema.nullable(),
      managerName: z.string().nullable(),
    }),
  ),
  kpiTemplates: z.array(
    z.object({
      templateId: idSchema,
      name: z.string().nullable(),
      position: z.string().nullable(),
      version: z.number().int(),
    }),
  ),
  behavioralTemplates: z.array(
    z.object({
      templateId: idSchema,
      name: z.string().nullable(),
      version: z.number().int(),
    }),
  ),
  hrEvaluators: z.array(z.object({ employeeId: idSchema, name: z.string() })),
});
export type ReviewCycleOptionsDto = z.infer<typeof reviewCycleOptionsSchema>;

/**
 * A participant as the detail route sends it. The entity maps no `createdAt`, so the row
 * schema does not fit. The template ids name the template of each frozen version, so a
 * re-edit can send the same choice.
 */
const cycleParticipantDetailSchema = z.object({
  participantId: idSchema,
  cycleId: idSchema,
  employeeId: idSchema,
  frozenPosition: z.string().nullable(),
  kpiVersionId: idSchema.nullable(),
  behavioralVersionId: idSchema.nullable(),
  kpiTemplateId: idSchema.nullable(),
  behavioralTemplateId: idSchema.nullable(),
  peerIds: z.array(idSchema),
});

/** GET /review-cycles/:id: the cycle with its stages and its participants. */
export const reviewCycleDetailSchema = cyclesRowSchema.extend({
  employeeVisible: z.boolean(),
  managerVisible: z.boolean(),
  earlierAnswersVisible: z.boolean(),
  stages: z.array(cycleStageDtoSchema),
  participants: z.array(cycleParticipantDetailSchema),
});
export type ReviewCycleDetailDto = z.infer<typeof reviewCycleDetailSchema>;

/** GET /review-cycles/:id/participants: who takes part, who answers each stage, and where each assignment stands. */
export const reviewCycleParticipantsSchema = z.array(
  z.object({
    participantId: idSchema,
    name: z.string(),
    /** The position that the cycle froze. Null when none was frozen. */
    position: z.string().nullable(),
    /** The department of today. */
    department: z.string().nullable(),
    /** In stage order. A draft or scheduled cycle has none yet. */
    assignments: z.array(
      z.object({
        assignmentId: idSchema,
        perspective: evaluatorTypeSchema,
        evaluatorName: z.string(),
        state: evaluationStatusSchema,
        isOverdue: z.boolean(),
        deadline: timestampSchema.nullable(),
      }),
    ),
  }),
);
export type ReviewCycleParticipantDto = z.infer<
  typeof reviewCycleParticipantsSchema
>[number];

/** The wizard step that owns a readiness problem. */
export const READINESS_STEPS = [
  "details",
  "participants",
  "kpi",
  "behavioral",
  "stages",
] as const;

/** GET /review-cycles/:id/readiness: the problems of a cycle before launch. Empty when it is ready. */
export const reviewCycleReadinessSchema = z.array(
  z.object({
    step: z.enum(READINESS_STEPS),
    field: z.string(),
    message: z.string(),
  }),
);
export type ReviewCycleReadinessDto = z.infer<
  typeof reviewCycleReadinessSchema
>;

/** POST /review-cycles/:id/cancellation: a cancellation always has a reason (PRD 2.6). */
export const cancelReviewCycleRequestSchema = z.object({
  reason: requiredTextSchema.max(2000),
});
export type CancelReviewCycleRequestDto = z.infer<
  typeof cancelReviewCycleRequestSchema
>;

/**
 * POST /review-cycles/:id/extension: later deadlines for an active cycle, with a reason
 * (PRD Rec-001). A date left out stays as it is.
 */
export const extendReviewCycleRequestSchema = z.object({
  reason: requiredTextSchema.max(2000),
  verificationDeadline: timestampSchema.optional(),
  accomplishmentDeadline: timestampSchema.optional(),
  stages: z
    .array(z.object({ stageId: idSchema, deadline: timestampSchema }))
    .max(MAX_CYCLE_STAGES)
    .default([]),
});
export type ExtendReviewCycleRequestDto = z.infer<
  typeof extendReviewCycleRequestSchema
>;

/**
 * POST /review-cycles/:id/assignments/:assignmentId/reopening: opens a submitted review
 * again, with a reason (PRD Rec-003).
 */
export const reopenReviewRequestSchema = cancelReviewCycleRequestSchema;
export type ReopenReviewRequestDto = z.infer<typeof reopenReviewRequestSchema>;
