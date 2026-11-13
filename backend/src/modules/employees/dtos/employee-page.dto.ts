import { ApiProperty } from "@nestjs/swagger";
import { EmployeeDomain } from "../entities/employee-domain.entity.js";

export class EmployeePageDto {
  @ApiProperty({ type: [EmployeeDomain] })
  items: Omit<EmployeeDomain, "userRoleId" | "hrdotnetId">[];

  @ApiProperty({ example: 1, minimum: 1 })
  page: number;

  @ApiProperty({ example: 20, minimum: 1 })
  pageSize: number;

  @ApiProperty({ example: 3, minimum: 0 })
  pageCount: number;

  @ApiProperty({ example: 41, minimum: 0 })
  total: number;
}
