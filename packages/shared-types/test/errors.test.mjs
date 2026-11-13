// The error envelope of docs/error-handling.md, section 3.
import assert from "node:assert/strict";
import { test } from "node:test";

import * as shared from "../dist/index.js";

test("every documented HTTP status maps to one error code", () => {
  const expected = {
    400: "(400) VALIDATION_ERROR",
    401: "(401) UNAUTHENTICATED",
    403: "(403) FORBIDDEN",
    404: "(404) NOT_FOUND",
    409: "(409) CONFLICT",
    422: "(422) BUSINESS_RULE",
    429: "(429) RATE_LIMITED",
    500: "(500) INTERNAL_ERROR",
    503: "(503) SERVICE_UNAVAILABLE",
  };
  for (const [status, code] of Object.entries(expected)) {
    assert.equal(shared.errorCodeForStatus(Number(status)), code);
  }
});

test("an unlisted status falls back by class", () => {
  assert.equal(shared.errorCodeForStatus(418), "(400) VALIDATION_ERROR");
  assert.equal(shared.errorCodeForStatus(502), "(500) INTERNAL_ERROR");
});

test("createApiError builds an envelope that the schema accepts", () => {
  const body = shared.createApiError({
    status: 409,
    message: "This username or email is already in use",
    correlationId: "abc",
  });
  assert.deepEqual(body, {
    success: false,
    error: {
      code: "(409) CONFLICT",
      message: "This username or email is already in use",
      details: [],
      correlationId: "abc",
    },
  });
  assert.equal(shared.apiErrorResponseSchema.safeParse(body).success, true);
});

test("createApiError keeps field details", () => {
  const body = shared.createApiError({
    status: 400,
    message: "The request contains invalid fields.",
    correlationId: "abc",
    details: [{ field: "password", code: "MIN_LENGTH", message: "Too short." }],
  });
  assert.equal(body.error.details[0].field, "password");
});

test("readApiError returns the error, or null for another body", () => {
  const body = shared.createApiError({
    status: 404,
    message: "Employee not found",
    correlationId: "abc",
  });
  assert.equal(shared.readApiError(body)?.message, "Employee not found");
  assert.equal(shared.readApiError({ statusCode: 404, message: "x" }), null);
  assert.equal(shared.readApiError("<html>"), null);
  assert.equal(shared.readApiError(undefined), null);
});
