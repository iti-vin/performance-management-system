import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

// Entities
import { User } from "../entities/user.entity.js";
import { Employee } from "../entities/employee.entity.js";
import { UserRole } from "../entities/user-role.entity.js";
import { HREmployee, HREmploymentRecord, HRUser } from "../entities/hrdotnet.entity.js";
import { randomUUID } from "crypto";

@Injectable()
export class AuthService {
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

    private readonly jwt: JwtService,
    private readonly config: ConfigService,

    private readonly dataSource: DataSource,
  ) {}

  async register(employeeCode: string, password: string, confirmPassword: string, userRoleId: string) {
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
        userRoleId,
        status: "active",
      });

      const savedEmployee = await manager.save(Employee, employee);

      const user = manager.create(User, {
        employeeId: String(savedEmployee.id),
        userRoleId,
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

    // then hass the password
    const hashed = await bcrypt.hash(password, 10);

    // checking if employee code is exist
    const employee = await this.employees.findOne({ where: { code } });
    if (!employee) {
      throw new BadRequestException("Employee Code doesn't exist in the employee table");
    }

    // check the users also if already created
    const existingUser = await this.users.findOne({ where: { employeeId: employee.id } });

    // if doesn't exist then throw an error
    if (existingUser) throw new ConflictException("Employee already has an account");

    // checking if it is username or email format
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    // then create users for specific employee
    const user = this.users.create({
      employeeId: employee.id,
      userRoleId: employee.userRoleId,
      ...(isEmail ? { email: identifier, username: "" } : { email: "", username: identifier }),
      passwordHash: hashed,
    });

    await this.users.save(user);

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

  async login(identifier: string, password: string) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const users = await this.users.find({
      where: isEmail ? { email: identifier } : { username: identifier },
    });
    const user = users[0];
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user);
  }

  async refreshToken(token: string) {
    let payload: { sub: string; email?: string; username?: string; type: string };
    try {
      payload = await this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return {
      accessToken: await this.signAccess(user, 7200),
      expiresIn: 2 * 60 * 60,
    };
  }

  private async issueTokens(user: User) {
    const accessToken = await this.signAccess(user);
    return {
      accessToken,
      expiresIn: 3600,
    };
  }

  private async signAccess(user: User, expiresIn?: number) {
    const payload: Record<string, unknown> = {
      sub: user.id,
      type: "access",
    };
    if (user.email) payload.email = user.email;
    if (user.username) payload.username = user.username;
    return this.jwt.sign(payload, {
      secret: this.getAccessSecret(),
      expiresIn: expiresIn ?? "1h",
    });
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

  private getAccessSecret() {
    return this.config.get<string>("JWT_ACCESS_SECRET") ?? "dev-access-secret-change-in-production";
  }
}
