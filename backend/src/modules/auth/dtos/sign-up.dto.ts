import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";
import { Match } from "../../../common/decorators/matches.decorator.js";

export class SignUpDto {
  @ApiProperty({ example: "ADMIN" })
  @IsString()
  employeeCode: string;

  @ApiProperty({ example: "ADMIN" })
  @IsString()
  username: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @MinLength(8)
  @Match("password", { message: "Passwords do not match" })
  confirmPassword: string;
}
