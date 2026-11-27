import { z } from "zod";
import { idSchema, timestampSchema } from "../common.js";
import { behavioralQuestionTypeSchema } from "../domain/behavioral-question-type.enum.js";
import { accomplishmentStatusSchema } from "../domain/accomplishment-status.enum.js";
import { evaluationStatusSchema } from "../domain/evaluation-status.enum.js";
import { evaluatorTypeSchema } from "../domain/evaluator-type.enum.js";
import { responseStatusSchema } from "../domain/response-status.enum.js";
import { reviewAnswerSchema } from "./evaluation.schema.js";
import { reviewListRowSchema } from "./review-list.schema.js";

const reviewQuestionSchema = z.object({
  questionId: idSchema,
  prompt: z.string(),
  questionType: behavioralQuestionTypeSchema,
  isRequired: z.boolean(),
  /** True for a rating question that offers "Not observed". */
  allowNotObserved: z.boolean(),
  /** The choices of a multiple choice question. Empty for every other type. */
  options: z.array(z.object({ optionId: idSchema, label: z.string() })),
});
export type ReviewQuestionDto = z.infer<typeof reviewQuestionSchema>;

const reviewSectionSchema = z.object({
  sectionId: idSchema,
  title: z.string(),
  questions: z.array(reviewQuestionSchema),
});
export type ReviewSectionDto = z.infer<typeof reviewSectionSchema>;

const reviewResponseSchema = z.object({
  version: z.number().int().min(1),
  status: responseStatusSchema,
  submittedAt: timestampSchema.nullable(),
  answers: z.array(reviewAnswerSchema),
  writtenFeedback: z.string().nullable(),
});

/** A submitted version that is no longer the one shown (PRD Rev-006, Rec-003). */
const reviewHistoryEntrySchema = reviewResponseSchema
  .omit({ status: true })
  .extend({
    /** Why HR reopened this version. Null when no reason was stored. */
    reopenReason: z.string().nullable(),
  });
export type ReviewHistoryEntryDto = z.infer<typeof reviewHistoryEntrySchema>;

/**
 * GET /reviews/:id: one assignment, the questions of the template version that the cycle
 * froze, and the saved response that the caller may see.
 */
export const reviewDetailSchema = reviewListRowSchema.extend({
  /** True when the caller may save and submit now. */
  canEdit: z.boolean(),
  /** For a locked review: the earliest stage that is not finished. Null otherwise. */
  waitingFor: evaluatorTypeSchema.nullable(),
  /**
   * The behavioral template whose version the cycle froze. The name and the description are
   * those of the template today: a version keeps neither. Null when none was frozen.
   */
  template: z
    .object({
      name: z.string().nullable(),
      description: z.string().nullable(),
      version: z.number().int().min(1),
    })
    .nullable(),
  sections: z.array(reviewSectionSchema),
  response: reviewResponseSchema.nullable(),
  /** Why HR reopened the review, until it is submitted again. Null otherwise. */
  reopenReason: z.string().nullable(),
  /** The earlier submitted versions, newest first. Empty for a reader who may not see the answers. */
  history: z.array(reviewHistoryEntrySchema),
  /** Every stage of this participant, in order. An anonymous group is one entry with no name. */
  /** The caller sees the row of this review and may not read it: no question, answer, or stage is sent. */
  isRestricted: z.boolean(),
  stages: z.array(
    z.object({
      perspective: evaluatorTypeSchema,
      evaluatorName: z.string(),
      deadline: timestampSchema.nullable(),
      state: evaluationStatusSchema,
      isCurrent: z.boolean(),
    }),
  ),
  /** The KPI report of the participant, when the caller may open it. */
  goals: z
    .object({ accomplishmentId: idSchema, status: accomplishmentStatusSchema })
    .nullable(),
});
export type ReviewDetailDto = z.infer<typeof reviewDetailSchema>;
