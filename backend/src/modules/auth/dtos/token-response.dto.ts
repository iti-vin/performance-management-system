import { ApiProperty } from "@nestjs/swagger";
import type { AuthTokenResponseDto } from "@pms/shared-types";

export class TokenResponseDto implements AuthTokenResponseDto {
  @ApiProperty({ description: "Signed access token" })
  accessToken: string;

  @ApiProperty({ description: "Access token lifetime in seconds", example: 3600 })
  expiresIn: number;
}
