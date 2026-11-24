import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { EmployeeStatus } from "../types/employee-status.enum.js";
import { EMPLOYMENT_STATUSES, type EmploymentStatus } from "@pms/shared-types";

export class CreateEmployeeDto {
  // pms.employees.id has no default, so the caller sends it.
  @ApiProperty({ example: "101" })
  @IsString()
  @Matches(/^[1-9][0-9]{0,17}$/, { message: "id must be a positive whole number" })
  id: string;

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

  @ApiProperty({ example: "Example Company" })
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiPropertyOptional({ example: "Analyst" })
  @IsOptional()
  @IsString()
  position?: string | null;

  @ApiPropertyOptional({ example: "Operations" })
  @IsOptional()
  @IsString()
  division?: string | null;

  @ApiProperty({ example: "Finance" })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({ example: "Main" })
  @IsString()
  @IsNotEmpty()
  branch: string;

  @ApiProperty({ enum: EMPLOYMENT_STATUSES, example: "regular" })
  @IsIn(EMPLOYMENT_STATUSES)
  employmentStatus: EmploymentStatus;

  @ApiPropertyOptional({ enum: EmployeeStatus, example: EmployeeStatus.ACTIVE })
  @IsOptional()
  @IsIn([EmployeeStatus.ACTIVE, EmployeeStatus.INACTIVE])
  status?: EmployeeStatus;
}
