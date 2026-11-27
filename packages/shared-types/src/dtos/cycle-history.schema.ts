import { z } from "zod";
import { idSchema, timestampSchema } from "../common.js";
import { evaluatorTypeSchema } from "../domain/evaluator-type.enum.js";

/** The plain values of a stored change, by name. The page puts them in words. */
const changeSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .nullable();

/** GET /review-cycles/:id/history: the audit rows of a cycle, newest first (PRD 2.7, 8.7). */
export const cycleHistoryResponseSchema = z.array(
  z.object({
    eventId: idSchema,
    occurredAt: timestampSchema,
    area: z.enum(["cycle", "review", "report"]),
    /** Whose review or report it is. Null for a change of the cycle itself. */
    employeeName: z.string().nullable(),
    perspective: evaluatorTypeSchema.nullable(),
    action: z.string(),
    actorName: z.string(),
    reason: z.string().nullable(),
    before: changeSchema,
    after: changeSchema,
  }),
);
export type CycleHistoryEntryDto = z.infer<
  typeof cycleHistoryResponseSchema
>[number];
