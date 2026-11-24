import { z } from "zod";

/**
 * Source: CHECK on pms.employees.marital_status in packages/database/schema.sql.
 */
export const MARITAL_STATUSES = [
  "single",
  "married",
  "widowed",
  "separated",
  "divorced",
  "annulled",
] as const;

export const maritalStatusSchema = z.enum(MARITAL_STATUSES);
export type MaritalStatus = z.infer<typeof maritalStatusSchema>;
