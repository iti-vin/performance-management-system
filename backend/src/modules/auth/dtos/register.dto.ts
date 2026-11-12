import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "EMP-001" })
  @IsString()
  employeeCode: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  confirmPassword: string;

  @ApiProperty({ example: "1" })
  @IsString()
  userRoleId: string;
}
