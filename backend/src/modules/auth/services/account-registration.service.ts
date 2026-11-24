import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type RoleCode } from "@pms/shared-types";

// Entities
import { User } from "../entities/user.entity.js";
import { ADMIN_ROLE_ID, UserRole } from "../entities/user-role.entity.js";
import { EmployeeDomain } from "../../employees/entities/employee-domain.entity.js";

/** The role of a self-created account: the USER row of pms.user_role. */
const DEFAULT_ROLE_CODE: RoleCode = "USER";

/**
 * Creates a PMS login for an employee already in pms.employees.
 * No route calls it since the sign-up and register routes were removed.
 */
@Injectable()
export class AccountRegistrationService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(EmployeeDomain)
    private readonly employees: Repository<EmployeeDomain>,
    @InjectRepository(UserRole)
    private readonly userRoles: Repository<UserRole>,
  ) {}

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
    const employee = await this.employees.findOne({ where: { employeeCode: code } });
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

    // pms.employees has no role: a new account gets the employee role, never admin.
    const role = await this.userRoles.findOne({ where: { code: DEFAULT_ROLE_CODE } });
    if (!role || role.id === ADMIN_ROLE_ID) {
      throw new ServiceUnavailableException("Employee registration role is unavailable");
    }

    // The account email is the employee's email, so it is never blank.
    const user = this.users.create({
      employeeId: employee.id,
      userRoleId: role.id,
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
        code: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        company: employee.company,
        department: employee.department,
        position: employee.position,
        status: employee.status,
      },
    };
  }
}
