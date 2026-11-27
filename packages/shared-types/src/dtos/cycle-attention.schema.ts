import { z } from "zod";
import { idSchema } from "../common.js";

/** GET /review-cycle-attention: the cycles that wait for HR (PRD 10.2, 10.9). */
export const cycleAttentionResponseSchema = z.array(
  z.object({
    cycleId: idSchema,
    name: z.string(),
    state: z.enum(["scheduled", "active"]),
    activationDate: z.string().nullable(),
    /** What keeps a scheduled cycle from activating. */
    problems: z.array(z.string()),
    overdueReviews: z.number().int().min(0),
    overdueReports: z.number().int().min(0),
  }),
);
export type CycleAttentionDto = z.infer<
  typeof cycleAttentionResponseSchema
>[number];
