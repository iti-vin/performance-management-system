import type { FormActionResult } from "@/types/form-action";

/**
 * The problems after the fields `edited` changed: their messages belonged to the old values.
 * A message of the whole form that is listed in `summaries` goes with the last field problem.
 */
export function withoutProblems(
  current: FormActionResult,
  edited: readonly string[],
  summaries: readonly string[],
): FormActionResult {
  const left = Object.entries(current.fieldErrors).filter(([field]) => !edited.includes(field));
  if (left.length === Object.keys(current.fieldErrors).length) return current;
  const isResolved = left.length === 0 && current.message !== null && summaries.includes(current.message);
  return { message: isResolved ? null : current.message, fieldErrors: Object.fromEntries(left) };
}
