import { type ArgumentsHost, BadRequestException, ConflictException, Logger } from "@nestjs/common";
import { apiErrorResponseSchema } from "@pms/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiExceptionFilter, validationException } from "./api-exception.filter.js";

function run(exception: unknown, correlationHeader?: string) {
  const response = {
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    json: vi.fn(),
  };
  const request = { headers: correlationHeader ? { "x-correlation-id": correlationHeader } : {} };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost;

  new ApiExceptionFilter().catch(exception, host);
  return { response, body: response.json.mock.calls[0]?.[0] };
}

describe("ApiExceptionFilter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("turns an HTTP exception into the shared error envelope", () => {
    const { response, body } = run(new ConflictException("This username or email is already in use"));

    expect(response.status).toHaveBeenCalledWith(409);
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
    expect(body.error).toMatchObject({
      code: "(409) CONFLICT",
      message: "This username or email is already in use",
      details: [],
    });
  });

  it("hides the message of an unexpected error and logs it once", () => {
    const log = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    const { response, body } = run(new Error('duplicate key value violates unique constraint "users_email_key"'));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(body.error.code).toBe("(500) INTERNAL_ERROR");
    expect(body.error.message).not.toContain("users_email_key");
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("keeps field details from the validation pipe", () => {
    const { body } = run(
      validationException([
        { property: "password", constraints: { minLength: "password must be longer than or equal to 8 characters" } },
      ]),
    );

    expect(body.error.code).toBe("(400) VALIDATION_ERROR");
    expect(body.error.details).toEqual([
      { field: "password", code: "MIN_LENGTH", message: "password must be longer than or equal to 8 characters" },
    ]);
  });

  it("uses the first message when an HTTP exception carries a list", () => {
    const { body } = run(new BadRequestException(["first problem", "second problem"]));

    expect(body.error.message).toBe("first problem");
  });

  it("reuses the correlation id of the request and returns it in a header", () => {
    const { response, body } = run(new ConflictException("x"), "req-123");

    expect(body.error.correlationId).toBe("req-123");
    expect(response.setHeader).toHaveBeenCalledWith("x-correlation-id", "req-123");
  });

  it("creates a correlation id when the request has none", () => {
    const { body } = run(new ConflictException("x"));

    expect(body.error.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
