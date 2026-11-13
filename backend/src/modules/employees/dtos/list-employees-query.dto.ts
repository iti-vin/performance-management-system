import { z } from "zod";

export const DEFAULT_EMPLOYEE_PAGE_SIZE = 20;
export const MAX_EMPLOYEE_PAGE_SIZE = 100;

const decimalNumber = z.string().regex(/^[0-9]+$/, "Expected a positive integer").transform(Number);

export const listEmployeesQuerySchema = z.object({
  page: decimalNumber
    .pipe(z.number().int().positive().max(Math.floor(Number.MAX_SAFE_INTEGER / MAX_EMPLOYEE_PAGE_SIZE)))
    .default(1),
  pageSize: decimalNumber
    .pipe(z.number().int().min(1).max(MAX_EMPLOYEE_PAGE_SIZE))
    .default(DEFAULT_EMPLOYEE_PAGE_SIZE),
});

export type ListEmployeesQueryDto = z.output<typeof listEmployeesQuerySchema>;
