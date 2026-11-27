/** What a save, a submission, or a decision tells its form. */
export interface FormActionResult {
  /** Why the API refused, or null when it took the request. */
  message: string | null;
  /** The problem of one field, by its id or name. */
  fieldErrors: Record<string, string>;
}
