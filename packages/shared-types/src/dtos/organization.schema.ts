import { z } from "zod";
import { dateOnlySchema, idSchema, timestampSchema } from "../common.js";
import {
  employeesRowSchema,
  managerAssignmentsRowSchema,
  userRoleRowSchema,
} from "../rows/index.js";

/**
 * Response DTOs of the directory tables are the generated rows. pms.employees
 * holds company, department, and position as text since the companies,
 * departments, and positions tables left the schema.
 */
export const employeeDtoSchema = employeesRowSchema;
export type EmployeeDto = z.infer<typeof employeeDtoSchema>;

/** One manager assignment over time, with its effective date and status. */
export const reportingLineDtoSchema = managerAssignmentsRowSchema;
export type ReportingLineDto = z.infer<typeof reportingLineDtoSchema>;

export const userRoleDtoSchema = userRoleRowSchema;
export type UserRoleDto = z.infer<typeof userRoleDtoSchema>;

/** An account of pms.users. The password hash is never exposed. */
export const userDtoSchema = z.object({
  id: idSchema,
  email: z.string(),
  username: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type UserDto = z.infer<typeof userDtoSchema>;

/** Assign Manager dialog. */
export const assignManagerRequestSchema = z
  .object({
    employeeId: idSchema,
    managerId: idSchema,
    effectiveDate: dateOnlySchema,
  })
  .refine((value) => value.employeeId !== value.managerId, {
    message: "An employee cannot be their own manager.",
    path: ["managerId"],
  });
export type AssignManagerRequestDto = z.infer<
  typeof assignManagerRequestSchema
>;
