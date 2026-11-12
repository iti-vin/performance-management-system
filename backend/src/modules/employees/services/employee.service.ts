import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import { EmployeeDomain } from "../entities/employee-domain.entity.js";
import { CreateEmployeeDto } from "../dtos/create-employee.dto.js";
import { EmployeeStatus } from "../types/employee-status.enum.js";
import { UpdateEmployeeDto } from "../dtos/update-employee.dto.js";
import { User } from "../../auth/entities/user.entity.js";

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(EmployeeDomain)
    private readonly employees: Repository<EmployeeDomain>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<EmployeeDomain> {
    const entity = this.employees.create({
      guid: randomUUID(),
      hrdotnetId: dto.hrdotnetId ?? null,
      email: dto.email,
      employeeCode: dto.employeeCode,
      firstName: dto.firstName,
      lastName: dto.lastName,
      userRoleId: dto.userRoleId,
      status: dto.status ?? EmployeeStatus.ACTIVE,
    });
    return this.employees.save(entity);
  }

  async update(guid: string, dto: UpdateEmployeeDto): Promise<EmployeeDomain> {
    const entity = await this.findById(guid);
    if (dto.hrdotnetId !== undefined) entity.hrdotnetId = dto.hrdotnetId;
    if (dto.email !== undefined) entity.email = dto.email;
    if (dto.employeeCode !== undefined) entity.employeeCode = dto.employeeCode;
    if (dto.firstName !== undefined) entity.firstName = dto.firstName;
    if (dto.lastName !== undefined) entity.lastName = dto.lastName;
    if (dto.userRoleId !== undefined) entity.userRoleId = dto.userRoleId;
    if (dto.status !== undefined) entity.status = dto.status;
    return this.employees.save(entity);
  }

  async findById(guid: string): Promise<EmployeeDomain> {
    const entity = await this.employees.findOne({ where: { guid } });
    if (!entity) {
      throw new NotFoundException("Employee not found");
    }
    return entity;
  }

  async findByUser(user: User): Promise<EmployeeDomain | null> {
    return this.employees.findOne({ where: { id: user.employeeId } });
  }

  async findAll(): Promise<Array<Partial<EmployeeDomain>>> {
    const rows = await this.employees.find();
    return rows.map(({ userRoleId: _userRoleId, hrdotnetId: _hrdotnetId, ...row }) => row);
  }
}
