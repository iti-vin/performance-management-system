import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { EmployeeStatus } from "../types/employee-status.enum.js";

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: "789" })
  @IsOptional()
  @IsString()
  hrdotnetId?: string | null;

  @ApiPropertyOptional({ example: "user@company.com" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  email?: string;

  @ApiPropertyOptional({ example: "EMP-00123" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  employeeCode?: string;

  @ApiPropertyOptional({ example: "Maria" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({ example: "Santos" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  userRoleId?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus, example: EmployeeStatus.ACTIVE })
  @IsOptional()
  @IsIn([EmployeeStatus.ACTIVE, EmployeeStatus.INACTIVE])
  status?: EmployeeStatus;
}
