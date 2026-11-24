import { z } from "zod";

/**
 * Source: CHECK on pms.employees.gender in packages/database/schema.sql.
 */
export const GENDERS = [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
] as const;

export const genderSchema = z.enum(GENDERS);
export type Gender = z.infer<typeof genderSchema>;
