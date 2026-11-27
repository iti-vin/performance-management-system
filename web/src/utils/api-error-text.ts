import { readApiError } from "@pms/shared-types";

const MAX_DETAILS = 3;

/**
 * The words of an API error for a form: its message, then the messages of the
 * fields it rejected (at most three, each once). Without them a 400 reads "The
 * request contains invalid fields" and the user cannot tell which one. The text
 * of a validation message names the field. The fallback is for a body that is
 * not the error envelope.
 */
export function apiErrorText(body: unknown, fallback: string): string {
  const error = readApiError(body);
  if (!error) return fallback;

  const details = [...new Set(error.details.map((detail) => detail.message.trim()).filter(Boolean))].slice(
    0,
    MAX_DETAILS,
  );
  const sentences = details.map((message) => (/[.!?]$/.test(message) ? message : `${message}.`));
  return [error.message, ...sentences].join(" ");
}
