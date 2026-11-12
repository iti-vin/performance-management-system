import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard.js";
import { ApiErrorResponseDto } from "../../../common/dtos/api-response.dto.js";
import { User } from "../../auth/entities/user.entity.js";
import { EmployeeService } from "../services/employee.service.js";
import { AdminRoleGuard } from "../guards/admin-role.guard.js";
import { CreateEmployeeDto } from "../dtos/create-employee.dto.js";
import { UpdateEmployeeDto } from "../dtos/update-employee.dto.js";
import { EmployeeDomain } from "../entities/employee-domain.entity.js";
import type { AuthedUser } from "../types/authed-user.types.js";

@ApiTags("Employees")
@Controller("employees")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmployeeController {
  constructor(
    private readonly employees: EmployeeService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  @Get()
  @ApiOperation({ summary: "list all employee records" })
  @ApiOkResponse({
    description: "List of Employees",
    type: [EmployeeDomain],
  })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async findAll() {
    return this.employees.findAll();
  }

  @Get(":id")
  @UseGuards(AdminRoleGuard)
  @ApiOperation({ summary: "get an employee by id (admin only)" })
  @ApiOkResponse({
    description: "Employee Record",
    type: EmployeeDomain,
  })
  @ApiForbiddenResponse({
    description: "Forbidden: admin role required",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Employee Not Found",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async getById(@Param("id", new ParseUUIDPipe()) employeeId: string) {
    return this.employees.findById(employeeId);
  }

  @Post("create")
  @UseGuards(AdminRoleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "create an employee record (admin only)" })
  @ApiOkResponse({
    description: "Employee Created",
    type: EmployeeDomain,
  })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  @ApiConflictResponse({
    description: "Employee number already exists in the company",
  })
  @ApiForbiddenResponse({
    description: "Forbidden: admin role required",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async create(@Body() dto: CreateEmployeeDto) {
    return this.employees.create(dto);
  }

  @Post(":id/update")
  @UseGuards(AdminRoleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "edit an employee record (partial update, admin only)" })
  @ApiOkResponse({
    description: "Employee Updated",
    type: EmployeeDomain,
  })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  @ApiConflictResponse({
    description: "Employee number already exists in the company",
  })
  @ApiForbiddenResponse({
    description: "Forbidden: admin role required",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Employee Not Found",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async update(@Param("id", new ParseUUIDPipe()) employeeId: string, @Body() dto: UpdateEmployeeDto) {
    return this.employees.update(employeeId, dto);
  }

  @Get("me/profile")
  @ApiOperation({ summary: "get the employee record of the current logged in user" })
  @ApiOkResponse({
    description: "Current Employee Record",
    type: EmployeeDomain,
  })
  @ApiNotFoundResponse({
    description: "Employee Not Found",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async getMyProfile(@Request() request: { user: AuthedUser }) {
    const user = await this.users.findOne({ where: { id: request.user.userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return this.employees.findByUser(user);
  }
}
