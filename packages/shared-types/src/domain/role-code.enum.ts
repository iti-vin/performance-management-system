import { z } from "zod";

/**
 * Source: the `code` values of the rows in public.user_role (1 ADMIN,
 * 2 MANAGER, 3 USER). The table has no CHECK constraint: the rows are data, so
 * keep this list equal to them.
 */
export const ROLE_CODES = ["ADMIN", "MANAGER", "USER"] as const;

export const roleCodeSchema = z.enum(ROLE_CODES);
export type RoleCode = z.infer<typeof roleCodeSchema>;
