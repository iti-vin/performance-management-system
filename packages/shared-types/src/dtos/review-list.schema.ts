import { z } from "zod";
import {
  idSchema,
  pageSchema,
  timestampSchema,
  storableTextSchema,
} from "../common.js";
import { cycleStatusSchema } from "../domain/cycle-status.enum.js";
import {
  EVALUATION_STATUSES,
  evaluationStatusSchema,
} from "../domain/evaluation-status.enum.js";
import { evaluatorTypeSchema } from "../domain/evaluator-type.enum.js";

export const REVIEW_PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_REVIEW_PAGE_SIZE = 10;
export const REVIEW_SEARCH_MAX_LENGTH = 120;

/** One assignment in the All Reviews list: who is reviewed, by whom, at which stage, and where it stands. */
export const reviewListRowSchema = z.object({
  assignmentId: idSchema,
  cycleId: idSchema,
  cycleName: z.string(),
  cycleState: cycleStatusSchema,
  subjectName: z.string(),
  evaluatorName: z.string(),
  perspective: evaluatorTypeSchema,
  state: evaluationStatusSchema,
  deadline: timestampSchema.nullable(),
  /** Past its deadline and not submitted. It is a display, not a permission (PRD Rev-004). */
  isOverdue: z.boolean(),
  /** The position that the cycle froze for the subject (PRD Cyc-004). Null when none was frozen. */
  subjectPosition: z.string().nullable(),
  /** The department of the subject today. */
  subjectDepartment: z.string().nullable(),
  /** The caller is the evaluator of this assignment. */
  isAssignedToCaller: z.boolean(),
});
export type ReviewListRowDto = z.infer<typeof reviewListRowSchema>;

/** The tabs beside the whole list: the reviews that the caller answers, those about their team, and the finished ones. */
export const REVIEW_VIEWS = ["mine", "team", "completed"] as const;
/** The status filter: a stored status, or late work, which is a flag beside one. */
export const REVIEW_STATUS_FILTERS = [
  ...EVALUATION_STATUSES,
  "overdue",
] as const;
export const REVIEW_DEPARTMENT_MAX_LENGTH = 120;

/**
 * GET /reviews: one page, and the total of the same set that the filters leave. The cycles
 * and the departments are those of every row that the caller may see, for the filters.
 */
export const reviewListResponseSchema = pageSchema(reviewListRowSchema).extend({
  cycles: z.array(z.object({ cycleId: idSchema, name: z.string() })),
  departments: z.array(z.string()),
});
export type ReviewListResponseDto = z.infer<typeof reviewListResponseSchema>;

/**
 * The query of GET /reviews, as the URL carries it (text). The server applies it to the rows
 * that the caller may see, so a filter or a search never widens that set (PRD 2.4, Rev-001).
 * An unknown or repeated key is refused.
 */
export const reviewListQuerySchema = z.strictObject({
  cycleId: idSchema.optional(),
  cycleState: cycleStatusSchema.optional(),
  perspective: evaluatorTypeSchema.optional(),
  state: z.enum(REVIEW_STATUS_FILTERS).optional(),
  view: z.enum(REVIEW_VIEWS).optional(),
  department: storableTextSchema
    .trim()
    .min(1)
    .max(REVIEW_DEPARTMENT_MAX_LENGTH)
    .optional(),
  q: storableTextSchema.trim().max(REVIEW_SEARCH_MAX_LENGTH).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce
    .number()
    .refine(
      (size) => (REVIEW_PAGE_SIZES as readonly number[]).includes(size),
      "Choose a listed page size.",
    )
    .default(DEFAULT_REVIEW_PAGE_SIZE),
});
export type ReviewListQueryDto = z.output<typeof reviewListQuerySchema>;
