import { z } from "zod";
import { timestampSchema } from "../common.js";

/** GET /kpi-goals/:id/versions and its behavioral twin: the published versions, newest first. */
export const templateVersionListResponseSchema = z.array(
  z.object({
    version: z.number().int().min(1),
    publishedAt: timestampSchema.nullable(),
    publishedByName: z.string().nullable(),
    isCurrent: z.boolean(),
  }),
);
export type TemplateVersionDto = z.infer<
  typeof templateVersionListResponseSchema
>[number];
