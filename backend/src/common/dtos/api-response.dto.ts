import { ApiProperty } from "@nestjs/swagger";
import {
  ERROR_CODES,
  type ApiError,
  type ApiErrorDetail,
  type ApiErrorResponse,
  type ErrorCode,
} from "@pms/shared-types";

/**
 * Swagger description of the error envelope. The shape itself comes from
 * @pms/shared-types, and `implements` fails the build when the two differ.
 * ApiExceptionFilter writes the body. No controller builds it.
 */
export class ApiErrorDetailDto implements ApiErrorDetail {
  @ApiProperty({ example: "password", nullable: true, type: String })
  field: string | null;

  @ApiProperty({ example: "MIN_LENGTH" })
  code: string;

  @ApiProperty({ example: "password must be longer than or equal to 8 characters" })
  message: string;
}

export class ApiErrorDto implements ApiError {
  @ApiProperty({ enum: ERROR_CODES, example: "(400) VALIDATION_ERROR" })
  code: ErrorCode;

  @ApiProperty({ example: "The request contains invalid fields." })
  message: string;

  @ApiProperty({ type: [ApiErrorDetailDto] })
  details: ApiErrorDetailDto[];

  @ApiProperty({ example: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" })
  correlationId: string;
}

export class ApiErrorResponseDto implements ApiErrorResponse {
  @ApiProperty({ example: false, enum: [false] })
  success: false;

  @ApiProperty({ type: ApiErrorDto })
  error: ApiErrorDto;
}

/** The same envelope. Kept as its own name for the 404 responses that already use it. */
export class ApiErrorNotFoundResponse extends ApiErrorResponseDto {}
