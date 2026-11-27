import { z } from "zod";

/**
 * POST /review-cycles/:id/release: who reads the results, beside HR (PRD Cyc-001, Res-003). A
 * choice that is left out stays what the cycle holds.
 */
export const releaseResultsRequestSchema = z.object({
  employeeVisible: z.boolean().optional(),
  managerVisible: z.boolean().optional(),
});
export type ReleaseResultsRequestDto = z.infer<
  typeof releaseResultsRequestSchema
>;
