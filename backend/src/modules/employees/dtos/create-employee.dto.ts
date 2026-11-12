import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { EmployeeStatus } from "../types/employee-status.enum.js";

export class CreateEmployeeDto {
  @ApiPropertyOptional({ example: "789" })
  @IsOptional()
  @IsString()
  hrdotnetId?: string | null;

  @ApiProperty({ example: "user@company.com" })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "EMP-00123" })
  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @ApiProperty({ example: "Maria" })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: "Santos" })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: "1" })
  @IsString()
  userRoleId: string;

  @ApiPropertyOptional({ enum: EmployeeStatus, example: EmployeeStatus.ACTIVE })
  @IsOptional()
  @IsIn([EmployeeStatus.ACTIVE, EmployeeStatus.INACTIVE])
  status?: EmployeeStatus;
}
