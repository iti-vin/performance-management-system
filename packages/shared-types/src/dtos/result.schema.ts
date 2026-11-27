import { z } from "zod";

import { dateOnlySchema, idSchema, timestampSchema } from "../common.js";
import { evaluatorTypeSchema } from "../domain/evaluator-type.enum.js";
import { kpiDirectionSchema } from "../domain/kpi-direction.enum.js";

/** A score on the scale of 1 to 5, unrounded. Null when it cannot be computed: never zero (Res-007). */
const scoreSchema = z.number().min(0).max(5).nullable();

/** One finalized result: GET /results and GET /review-cycles/:id/results. */
export const resultRowSchema = z.object({
  participantId: idSchema,
  cycleId: idSchema,
  cycleName: z.string(),
  employeeName: z.string(),
  position: z.string().nullable(),
  department: z.string().nullable(),
  goalsScore: scoreSchema,
  behavioralScore: scoreSchema,
  overallScore: scoreSchema,
  finalizedAt: timestampSchema,
  /** Null until HR releases the results (Res-003). */
  releasedAt: timestampSchema.nullable(),
});
export type ResultRowDto = z.infer<typeof resultRowSchema>;
export const resultListSchema = z.array(resultRowSchema);

/** The verified goals as finalization froze them. */
export const resultGoalsSchema = z.object({
  templateName: z.string().nullable(),
  templateVersion: z.number().int().nullable(),
  indicators: z.array(
    z.object({
      indicatorId: idSchema,
      name: z.string(),
      unit: z.string().nullable(),
      target: z.number().nullable(),
      direction: kpiDirectionSchema,
      weight: z.number(),
      actualValue: z.number().nullable(),
      score: scoreSchema,
      isTargetMet: z.boolean().nullable(),
      remarks: z.string().nullable(),
    }),
  ),
});
export type ResultGoalsDto = z.infer<typeof resultGoalsSchema>;

/**
 * The behavioral assessment as finalization froze it. A peer or upward perspective is
 * pooled with no name, and shows nothing below the anonymity minimum (Res-008).
 */
export const resultBehaviorSchema = z.object({
  templateName: z.string().nullable(),
  templateVersion: z.number().int().nullable(),
  questions: z.array(
    z.object({
      questionId: idSchema,
      sectionTitle: z.string(),
      prompt: z.string(),
      ratings: z.array(
        z.object({ perspective: evaluatorTypeSchema, rating: z.number() }),
      ),
    }),
  ),
  assessments: z.array(
    z.object({
      perspective: evaluatorTypeSchema,
      evaluatorName: z.string().nullable(),
      submittedCount: z.number().int().min(0),
      submittedAt: timestampSchema.nullable(),
      rating: scoreSchema,
      isWithheld: z.boolean(),
    }),
  ),
  feedback: z.array(
    z.object({
      perspective: evaluatorTypeSchema,
      evaluatorName: z.string().nullable(),
      prompt: z.string(),
      text: z.string(),
    }),
  ),
});
export type ResultBehaviorDto = z.infer<typeof resultBehaviorSchema>;

/** GET /results/:participantId. A component with weight zero is null: it does not apply. */
export const resultDetailSchema = resultRowSchema.extend({
  evaluationStart: dateOnlySchema,
  evaluationEnd: dateOnlySchema,
  goalsWeight: z.number(),
  behavioralWeight: z.number(),
  goals: resultGoalsSchema.nullable(),
  behavioral: resultBehaviorSchema.nullable(),
});
export type ResultDetailDto = z.infer<typeof resultDetailSchema>;
