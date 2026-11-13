import { ApiProperty } from "@nestjs/swagger";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@pms/shared-types";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";
import { Match } from "../../../common/decorators/matches.decorator.js";

export class SignUpDto {
  @ApiProperty({ example: "ADMIN" })
  @IsString()
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsNotEmpty()
  employeeCode: string;

  @ApiProperty({ example: "ADMIN" })
  @IsString()
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(MAX_PASSWORD_LENGTH)
  password: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(MAX_PASSWORD_LENGTH)
  @Match("password", { message: "Passwords do not match" })
  confirmPassword: string;
}
