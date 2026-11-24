import { z } from "zod";

/**
 * Source: CHECK on pms.employees.blood_type in packages/database/schema.sql.
 */
export const BLOOD_TYPES = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export const bloodTypeSchema = z.enum(BLOOD_TYPES);
export type BloodType = z.infer<typeof bloodTypeSchema>;
