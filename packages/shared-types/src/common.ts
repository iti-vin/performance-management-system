import { z } from "zod";

/**
 * Shared Zod building blocks for API DTOs.
 *
 * Rule for this codebase: response DTO schemas describe the data shape only.
 * Business rules (date order, weights, required text) live on request DTO
 * schemas, so a valid server response is never rejected by a UI rule.
 */

export const idSchema = z.uuid();

/**
 * Id of a table whose key is `bigint` (companies, departments, positions,
 * employees.id). The `pg` driver returns bigint as a string, so this accepts a
 * number or a digit string and always outputs a number.
 */
export const bigintIdSchema = z.coerce.number().int().positive();

/** Any JSON value, for `jsonb` columns. */
export const jsonValueSchema = z.json();

/** Calendar date without time, for example "2026-03-31". */
export const dateOnlySchema = z.iso.date();

/** Instant with offset, for example "2026-03-31T08:00:00+08:00". */
export const timestampSchema = z.iso.datetime({ offset: true });

/**
 * PostgreSQL `numeric` columns often arrive as strings. Accepts a number or a
 * numeric string and always outputs a number.
 */
export const decimalSchema = z
  .union([
    z.number(),
    z
      .string()
      .trim()
      .regex(/^-?\d+(\.\d+)?$/),
  ])
  .transform(Number)
  .pipe(z.number().finite());

/** Decimal between 0 and 100 inclusive. */
export const percentSchema = decimalSchema.pipe(z.number().min(0).max(100));

/** Request-side counterparts: plain numbers only. */
export const percentInputSchema = z.number().min(0).max(100);
export const nonNegativeInputSchema = z.number().min(0);

/** Required text that is not only whitespace. */
export const requiredTextSchema = z
  .string()
  .trim()
  .min(1, "This field is required.");

/** Free-form JSON object whose shape the backend has not defined yet. */
export const jsonObjectSchema = z.record(z.string(), z.unknown());

/**
 * Page envelope. ASSUMPTION: the backend has no list endpoints yet, so this
 * shape follows `ListingPagination` (page, pageSize, total). Adjust once the
 * real contract exists.
 */
export function pageSchema<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalItems: z.number().int().min(0),
  });
}

/** Adds one day count to an ISO date string, in UTC. Used by date-range rules. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
