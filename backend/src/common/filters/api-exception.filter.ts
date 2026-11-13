import { randomUUID } from "node:crypto";
import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { type ApiErrorDetail, createApiError } from "@pms/shared-types";
import type { ValidationError } from "class-validator";
import type { Request, Response } from "express";

const CORRELATION_HEADER = "x-correlation-id";
const UNEXPECTED_MESSAGE = "Something went wrong. Try again.";
const INVALID_FIELDS_MESSAGE = "The request contains invalid fields.";

/** "minLength" becomes "MIN_LENGTH". */
function toRuleCode(constraint: string) {
  return constraint.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}

/**
 * `exceptionFactory` of the global ValidationPipe. It keeps the field of every
 * failed rule, which the default factory flattens into plain text.
 */
export function validationException(errors: Pick<ValidationError, "property" | "constraints">[]) {
  const details: ApiErrorDetail[] = errors.flatMap(({ property, constraints }) =>
    Object.entries(constraints ?? {}).map(([rule, message]) => ({
      field: property,
      code: toRuleCode(rule),
      message,
    })),
  );
  return new BadRequestException({ message: INVALID_FIELDS_MESSAGE, details });
}

function readHttpException(exception: HttpException) {
  const body = exception.getResponse();
  if (typeof body === "string") return { message: body, details: undefined };

  const { message, details } = body as { message?: string | string[]; details?: ApiErrorDetail[] };
  return {
    message: (Array.isArray(message) ? message[0] : message) ?? exception.message,
    details,
  };
}

/**
 * The one place that writes an error body. Every failed request, in every
 * module, leaves as the envelope of @pms/shared-types.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const incoming = http.getRequest<Request>().headers[CORRELATION_HEADER];
    const correlationId = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const { message, details } = isHttp
      ? readHttpException(exception)
      : { message: UNEXPECTED_MESSAGE, details: undefined };

    // An unexpected error is logged here, once. Its text never reaches the client.
    if (!isHttp) {
      this.logger.error(`[${correlationId}] Unhandled error`, exception instanceof Error ? exception.stack : undefined);
    }

    response.setHeader(CORRELATION_HEADER, correlationId);
    response.status(status).json(createApiError({ status, message, correlationId, details }));
  }
}
