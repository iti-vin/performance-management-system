import { z } from "zod";

/**
 * Source: CHECK on pms.employees.employment_status in packages/database/schema.sql.
 */
export const EMPLOYMENT_STATUSES = [
  "probationary",
  "regular",
  "resigned",
  "terminated",
  "contractual",
  "end_of_contract",
  "retired",
  "separated",
] as const;

export const employmentStatusSchema = z.enum(EMPLOYMENT_STATUSES);
export type EmploymentStatus = z.infer<typeof employmentStatusSchema>;
