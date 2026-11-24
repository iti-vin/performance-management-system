import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { EmployeeStatus } from "../types/employee-status.enum.js";
import { EMPLOYMENT_STATUSES, type EmploymentStatus } from "@pms/shared-types";

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

  @ApiPropertyOptional({ example: "Example Company" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  company?: string;

  @ApiPropertyOptional({ example: "Analyst" })
  @IsOptional()
  @IsString()
  position?: string | null;

  @ApiPropertyOptional({ example: "Operations" })
  @IsOptional()
  @IsString()
  division?: string | null;

  @ApiPropertyOptional({ example: "Finance" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  department?: string;

  @ApiPropertyOptional({ example: "Main" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  branch?: string;

  @ApiPropertyOptional({ enum: EMPLOYMENT_STATUSES, example: "regular" })
  @IsOptional()
  @IsIn(EMPLOYMENT_STATUSES)
  employmentStatus?: EmploymentStatus;

  @ApiPropertyOptional({ enum: EmployeeStatus, example: EmployeeStatus.ACTIVE })
  @IsOptional()
  @IsIn([EmployeeStatus.ACTIVE, EmployeeStatus.INACTIVE])
  status?: EmployeeStatus;
}
