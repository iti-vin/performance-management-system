import { z } from "zod";
import {
  dateOnlySchema,
  idSchema,
  nonNegativeInputSchema,
  requiredTextSchema,
  storableTextSchema,
} from "../common.js";
import {
  assignmentResponsesRowSchema,
  assignmentsRowSchema,
  auditEventsRowSchema,
  cycleParticipantsRowSchema,
  evaluationSnapshotsRowSchema,
  journalEntriesRowSchema,
} from "../rows/index.js";

/**
 * One employee's review inside one cycle: the cycle participant, with the
 * finalized snapshot once there is one.
 */
export const evaluationDtoSchema = cycleParticipantsRowSchema.extend({
  snapshot: evaluationSnapshotsRowSchema.nullable().optional(),
});
export type EvaluationDto = z.infer<typeof evaluationDtoSchema>;

/** One evaluator's assignment for one participant and stage. */
export const evaluatorAssignmentDtoSchema = assignmentsRowSchema;
export type EvaluatorAssignmentDto = z.infer<
  typeof evaluatorAssignmentDtoSchema
>;

/** A behavioral assessment is one response row; the answers are in `answersJson`. */
export const behavioralAssessmentDtoSchema = assignmentResponsesRowSchema;
export type BehavioralAssessmentDto = z.infer<
  typeof behavioralAssessmentDtoSchema
>;

export const evaluationHistoryDtoSchema = auditEventsRowSchema;
export type EvaluationHistoryDto = z.infer<typeof evaluationHistoryDtoSchema>;

export const journalEntryDtoSchema = journalEntriesRowSchema;
export type JournalEntryDto = z.infer<typeof journalEntryDtoSchema>;

/** The longest remarks or reason of an accomplishment, and the most values of one report. */
export const ACCOMPLISHMENT_TEXT_MAX_LENGTH = 2000;
export const MAX_ACCOMPLISHMENT_ACTUALS = 200;

const accomplishmentTextSchema = storableTextSchema
  .trim()
  .max(ACCOMPLISHMENT_TEXT_MAX_LENGTH);

/**
 * The actual results of one accomplishment: one value per indicator, zero or more, or none
 * yet in a draft. Each value may have remarks, and so may the accomplishment. A resubmission after a return says
 * what was corrected.
 */
export const reportIndicatorActualsRequestSchema = z.object({
  actuals: z
    .array(
      z.object({
        indicatorId: idSchema,
        actualValue: nonNegativeInputSchema.nullable(),
        remarks: accomplishmentTextSchema.default(""),
      }),
    )
    .max(MAX_ACCOMPLISHMENT_ACTUALS)
    .superRefine((actuals, ctx) => {
      const seen = new Set<string>();
      actuals.forEach(({ indicatorId }, index) => {
        if (seen.has(indicatorId)) {
          ctx.addIssue({
            code: "custom",
            message: "An indicator has one value.",
            path: [index, "indicatorId"],
          });
        }
        seen.add(indicatorId);
      });
    }),
  remarks: accomplishmentTextSchema.default(""),
  correctionReason: accomplishmentTextSchema.default(""),
});
export type ReportIndicatorActualsRequestDto = z.output<
  typeof reportIndicatorActualsRequestSchema
>;

/** The decision of the manager on a submitted accomplishment. A return needs a reason (PRD Acc-004). */
export const accomplishmentDecisionRequestSchema = z
  .object({
    outcome: z.enum(["verified", "returned"]),
    reason: accomplishmentTextSchema.default(""),
  })
  .superRefine((decision, ctx) => {
    if (decision.outcome === "returned" && !decision.reason) {
      ctx.addIssue({
        code: "custom",
        message: "Say why you return it.",
        path: ["reason"],
      });
    }
  });
export type AccomplishmentDecisionRequestDto = z.output<
  typeof accomplishmentDecisionRequestSchema
>;

/** The longest text of one answer, and the most answers of one response: both bound what one request stores. */
export const REVIEW_TEXT_MAX_LENGTH = 5000;
export const MAX_REVIEW_ANSWERS = 500;

/**
 * One answer. It holds one kind of value: a rating, a text, the chosen option, or "Not
 * observed". Which kind a question takes is a rule of its frozen type, checked by the API.
 * An answer with no value means that the question is not answered yet.
 */
export const reviewAnswerSchema = z
  .object({
    questionId: idSchema,
    score: z.number().int().min(1).max(5).nullable().default(null),
    writtenAnswer: storableTextSchema
      .trim()
      .max(REVIEW_TEXT_MAX_LENGTH)
      .nullable()
      .default(null),
    optionId: idSchema.nullable().default(null),
    isNotObserved: z.boolean().default(false),
  })
  .superRefine((answer, ctx) => {
    const values = [
      answer.score !== null,
      Boolean(answer.writtenAnswer),
      answer.optionId !== null,
    ];
    const filled = values.filter(Boolean).length;
    if (answer.isNotObserved && filled > 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "A not-observed answer cannot have a score, a text, or an option.",
        path: ["isNotObserved"],
      });
    } else if (filled > 1) {
      ctx.addIssue({
        code: "custom",
        message: "Give one of a score, a text, or an option.",
        path: ["questionId"],
      });
    }
  });
export type ReviewAnswerDto = z.output<typeof reviewAnswerSchema>;

/** The answers of a response, as a save and a submission send them. */
export const submitBehavioralAssessmentRequestSchema = z.object({
  /** A free text beside the questions of the template. Blank means none. */
  writtenFeedback: storableTextSchema
    .trim()
    .max(REVIEW_TEXT_MAX_LENGTH)
    .default(""),
  answers: z
    .array(reviewAnswerSchema)
    .max(MAX_REVIEW_ANSWERS)
    .superRefine((answers, ctx) => {
      const seen = new Set<string>();
      answers.forEach(({ questionId }, index) => {
        if (seen.has(questionId)) {
          ctx.addIssue({
            code: "custom",
            message: "A question has one answer.",
            path: [index, "questionId"],
          });
        }
        seen.add(questionId);
      });
    }),
});
export type SubmitBehavioralAssessmentRequestDto = z.infer<
  typeof submitBehavioralAssessmentRequestSchema
>;

export const createJournalEntryRequestSchema = z.object({
  employeeId: idSchema,
  entryDate: dateOnlySchema,
  entryType: requiredTextSchema,
  title: requiredTextSchema,
  description: requiredTextSchema,
  cycleId: idSchema.nullable().default(null),
});
export type CreateJournalEntryRequestDto = z.infer<
  typeof createJournalEntryRequestSchema
>;
