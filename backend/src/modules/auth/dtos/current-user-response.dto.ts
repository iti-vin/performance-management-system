import { ApiProperty } from "@nestjs/swagger";
import { ROLE_CODES, type CurrentUserDto, type RoleCode } from "@pms/shared-types";

/** Swagger description of GET auth/me. The shape comes from @pms/shared-types. */
export class CurrentUserResponseDto implements CurrentUserDto {
  @ApiProperty({ example: "30" })
  userId: string;

  @ApiProperty({ example: "jane@example.com", nullable: true, type: String })
  email: string | null;

  @ApiProperty({ example: "janedoe", nullable: true, type: String })
  username: string | null;

  @ApiProperty({ enum: ROLE_CODES, example: "USER" })
  role: RoleCode;

  @ApiProperty({ example: "ITI-003", nullable: true, type: String })
  employeeCode: string | null;

  @ApiProperty({ example: "Jane", nullable: true, type: String })
  firstName: string | null;

  @ApiProperty({ example: "Doe", nullable: true, type: String })
  lastName: string | null;
}
