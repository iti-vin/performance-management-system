import { z } from "zod";

/**
 * The one error body of the API, for every failed request. It follows
 * docs/error-handling.md, section 3. The backend builds it with
 * `createApiError` in one global exception filter, and a client reads it with
 * `readApiError`, so no module writes an error body by hand.
 */

/**
 * HTTP status to error code, from docs/error-handling.md, section 4. The code
 * carries its status, for example "(409) CONFLICT", so a log line or a
 * screenshot of the body shows both. Compare with ERROR_CODE_BY_STATUS[409],
 * not with a string typed by hand.
 */
export const ERROR_CODE_BY_STATUS = {
  400: "(400) VALIDATION_ERROR",
  401: "(401) UNAUTHENTICATED",
  403: "(403) FORBIDDEN",
  404: "(404) NOT_FOUND",
  409: "(409) CONFLICT",
  422: "(422) BUSINESS_RULE",
  429: "(429) RATE_LIMITED",
  500: "(500) INTERNAL_ERROR",
  503: "(503) SERVICE_UNAVAILABLE",
} as const;

export const ERROR_CODES = [
  "(400) VALIDATION_ERROR",
  "(401) UNAUTHENTICATED",
  "(403) FORBIDDEN",
  "(404) NOT_FOUND",
  "(409) CONFLICT",
  "(422) BUSINESS_RULE",
  "(429) RATE_LIMITED",
  "(500) INTERNAL_ERROR",
  "(503) SERVICE_UNAVAILABLE",
] as const satisfies readonly (typeof ERROR_CODE_BY_STATUS)[keyof typeof ERROR_CODE_BY_STATUS][];

export const errorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** The code of a status. A status that is not listed falls back by class: 4xx or 5xx. */
export function errorCodeForStatus(status: number): ErrorCode {
  const known: Partial<Record<number, ErrorCode>> = ERROR_CODE_BY_STATUS;
  return (
    known[status] ??
    (status >= 500 ? "(500) INTERNAL_ERROR" : "(400) VALIDATION_ERROR")
  );
}

/** One problem with one field. `field` is null when the problem is not about a field. */
export const apiErrorDetailSchema = z.object({
  field: z.string().nullable(),
  /** A stable rule name in UPPER_SNAKE_CASE, for example "MIN_LENGTH". */
  code: z.string(),
  message: z.string(),
});
export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  /** Safe to show to the user. Never a stack trace, SQL text, or a secret. */
  message: z.string(),
  /** Always present. Empty when there is nothing field-specific to report. */
  details: z.array(apiErrorDetailSchema),
  /** The id of the request, also written to the server log. */
  correlationId: z.string(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: apiErrorSchema,
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

/** Builds the error body. The code comes from the status, so the two cannot disagree. */
export function createApiError(input: {
  status: number;
  message: string;
  correlationId: string;
  details?: ApiErrorDetail[];
}): ApiErrorResponse {
  return {
    success: false,
    error: {
      code: errorCodeForStatus(input.status),
      message: input.message,
      details: input.details ?? [],
      correlationId: input.correlationId,
    },
  };
}

/** The error of a response body, or null when the body is not the error envelope. */
export function readApiError(body: unknown): ApiError | null {
  const parsed = apiErrorResponseSchema.safeParse(body);
  return parsed.success ? parsed.data.error : null;
}
