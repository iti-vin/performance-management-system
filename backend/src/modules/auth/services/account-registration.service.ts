import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { type RegisterRequestDto, type RoleCode } from "@pms/shared-types";

// Entities
import { User } from "../entities/user.entity.js";
import { Employee } from "../entities/employee.entity.js";
import { ADMIN_ROLE_ID, UserRole } from "../entities/user-role.entity.js";
import { HREmployee, HREmploymentRecord, HRUser } from "../entities/hrdotnet.entity.js";
import { randomUUID } from "crypto";

/** The role of a self-registered account: the user row of public.user_role. */
const DEFAULT_ROLE_CODE: RoleCode = "USER";

@Injectable()
export class AccountRegistrationService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(UserRole)
    private readonly userRoles: Repository<UserRole>,

    @InjectRepository(HREmployee, "secondaryDB")
    private readonly hrEmployees: Repository<HREmployee>,
    @InjectRepository(HREmploymentRecord, "secondaryDB")
    private readonly hrEmploymentRecord: Repository<HREmploymentRecord>,
    @InjectRepository(HRUser, "secondaryDB")
    private readonly hrUser: Repository<HRUser>,

    private readonly dataSource: DataSource,
  ) {}

  async register({ employeeCode, password, confirmPassword }: RegisterRequestDto) {
    // validate passwords
    if (password !== confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    // find employee in hrdotnet database
    const hrEmployee = await this.hrEmployees.findOne({
      where: { code: employeeCode },
    });

    if (!hrEmployee) {
      throw new NotFoundException("This Employee Code doesn't exist in HRDotNet V2");
    }

    // fetch related HR records concurrently
    const [hrEmploymentRecord, hrUser] = await Promise.all([
      this.hrEmploymentRecord.findOne({
        where: { employeeId: hrEmployee.id },
      }),
      this.hrUser.findOne({
        where: { employeeId: hrEmployee.id },
      }),
    ]);

    if (!hrUser) {
      throw new NotFoundException("HRDotNet user record not found");
    }

    if (!hrEmploymentRecord) {
      throw new NotFoundException("HRDotNet employment record not found");
    }

    const role = await this.userRoles.findOne({ where: { code: DEFAULT_ROLE_CODE } });
    if (!role || role.id === ADMIN_ROLE_ID) {
      throw new ServiceUnavailableException("Employee registration role is unavailable");
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    // save records in primary database
    const result = await this.dataSource.transaction(async (manager) => {
      const employee = manager.create(Employee, {
        guid: randomUUID(),
        code: hrEmployee.code,
        email: hrEmployee.email ?? "",
        firstName: hrEmployee.firstName,
        lastName: hrEmployee.lastName,
        hrdotnetId: String(hrUser.hrdotnetId),
        userRoleId: role.id,
        status: "active",
      });

      const savedEmployee = await manager.save(Employee, employee);

      const user = manager.create(User, {
        employeeId: String(savedEmployee.id),
        userRoleId: role.id,
        email: hrEmployee.email ?? "",
        username: hrUser.username,
        passwordHash: hashed,
      });

      await manager.save(User, user);

      return savedEmployee;
    });

    return {
      message: "Succesfully Registered your HRDotNet Account on PMS",
      data: {
        ...this.toEmployeeDto({
          code: result.code,
          firstName: result.firstName,
          lastName: result.lastName,
          company: hrEmploymentRecord.company,
          department: hrEmploymentRecord.department,
          position: hrEmploymentRecord.position,
          status: "active",
        }),
      },
    };
  }

  async signUp(code: string, identifier: string, password: string, confirmPassword: string) {
    // validate password
    if (password !== confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    // Login treats an email-shaped identifier as an email, so a username must not look like one.
    const username = identifier.trim();
    if (!username || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
      throw new BadRequestException("Choose a username that is not an email address");
    }

    // checking if employee code is exist
    const employee = await this.employees.findOne({ where: { code } });
    if (!employee) {
      throw new BadRequestException("Employee Code doesn't exist in the employee table");
    }

    // check the users also if already created
    const existingUser = await this.users.findOne({ where: { employeeId: employee.id } });

    // if doesn't exist then throw an error
    if (existingUser) throw new ConflictException("Employee already has an account");

    // users.email and users.username are unique: answer 409 before the database rejects the row.
    const taken = await this.users.findOne({ where: [{ username }, { email: employee.email }] });
    if (taken) throw new ConflictException("This username or email is already in use");

    // The account email is the employee's email, so it is never blank.
    const user = this.users.create({
      employeeId: employee.id,
      userRoleId: employee.userRoleId,
      email: employee.email,
      username,
      passwordHash: await bcrypt.hash(password, 10),
    });

    try {
      await this.users.save(user);
    } catch (error) {
      // 23505: unique violation, for two requests that pass the check at the same time.
      if ((error as { driverError?: { code?: string } }).driverError?.code === "23505") {
        throw new ConflictException("This username or email is already in use", { cause: error });
      }
      throw error;
    }

    return {
      message: "Successfully Created",
      data: {
        ...this.toEmployeeDto({
          code: employee.code,
          firstName: employee.firstName,
          lastName: employee.lastName,
          company: "",
          department: "",
          position: "",
          status: "active",
        }),
      },
    };
  }

  private toEmployeeDto(record: {
    code: string;
    firstName: string;
    lastName: string;
    company: string | null;
    department: string | null;
    position: string | null;
    status: string;
  }) {
    return {
      code: record.code ?? null,
      firstName: record.firstName,
      lastName: record.lastName,
      company: record.company,
      department: record.department,
      position: record.position,
      status: record.status ?? null,
    };
  }
}
