import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  ValidationPipe,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { DataSource, type Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterDto } from "../dtos/register.dto.js";
import { Employee } from "../entities/employee.entity.js";
import { HREmployee, HREmploymentRecord, HRUser } from "../entities/hrdotnet.entity.js";
import { UserRole } from "../entities/user-role.entity.js";
import { User } from "../entities/user.entity.js";
import type { JwtPayload } from "../types/jwt-payload.types.js";
import { AuthService } from "./auth.service.js";
import { AccountRegistrationService } from "./account-registration.service.js";

const hrEmployee: HREmployee = {
  id: "10",
  code: "E001",
  firstName: "Jane",
  lastName: "Doe",
  fullName: "Jane Doe",
  email: "jane@example.com",
};

const hrEmploymentRecord: HREmploymentRecord = {
  employeeId: hrEmployee.id,
  company: "Example Company",
  department: null,
  position: "Analyst",
};

const hrUser: HRUser = {
  employeeId: hrEmployee.id,
  username: "janedoe",
  hrdotnetId: "3",
};

const user: User = {
  id: "30",
  employeeId: "20",
  userRoleId: "2",
  email: hrEmployee.email,
  username: hrUser.username,
  passwordHash: "unused-test-hash",
  failedLoginAttempts: 0,
  loginLockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Auth services", () => {
  const users = {
    findOne: vi.fn<Repository<User>["findOne"]>(),
    update: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };
  const employees = { findOne: vi.fn<Repository<Employee>["findOne"]>() };
  const roles = { findOne: vi.fn<Repository<UserRole>["findOne"]>() };
  const hrEmployees = { findOne: vi.fn<Repository<HREmployee>["findOne"]>() };
  const hrEmploymentRecords = { findOne: vi.fn<Repository<HREmploymentRecord>["findOne"]>() };
  const hrUsers = { findOne: vi.fn<Repository<HRUser>["findOne"]>() };
  const jwt = {
    sign: vi.fn(() => "new-access-token"),
    verify: vi.fn((): JwtPayload => ({ sub: user.id, type: "access" })),
  };
  const manager = {
    getRepository: () => users,
    create: vi.fn((_entity: typeof Employee | typeof User, data: Partial<Employee> | Partial<User>) => data),
    save: vi.fn(),
  };
  const dataSource = {
    transaction: vi.fn((run: (transactionManager: typeof manager) => Promise<Employee>) => run(manager)),
  };

  let service: AuthService;
  let registrationService: AccountRegistrationService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        AccountRegistrationService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(Employee), useValue: employees },
        { provide: getRepositoryToken(UserRole), useValue: roles },
        { provide: getRepositoryToken(HREmployee, "secondaryDB"), useValue: hrEmployees },
        { provide: getRepositoryToken(HREmploymentRecord, "secondaryDB"), useValue: hrEmploymentRecords },
        { provide: getRepositoryToken(HRUser, "secondaryDB"), useValue: hrUsers },
        { provide: JwtService, useValue: jwt },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    registrationService = moduleRef.get(AccountRegistrationService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("locks after five failures across login identifiers, then clears the lock on success", async () => {
    vi.setSystemTime(new Date("2026-11-13T00:00:00Z"));
    const account = {
      ...user,
      passwordHash: await bcrypt.hash("right-password", 4),
      failedLoginAttempts: 0,
      loginLockedUntil: null,
    };
    users.findOne.mockResolvedValue(account);
    users.update.mockImplementation(async (_id, state) => {
      Object.assign(account, state);
    });

    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(
        service.login(attempt % 2 ? user.email : user.username, "wrong-password"),
      ).rejects.toThrow(UnauthorizedException);
    }
    expect(account.loginLockedUntil).toEqual(new Date("2026-11-13T00:15:00Z"));
    vi.setSystemTime(new Date("2026-11-13T00:14:59Z"));
    await expect(service.login(user.email, "right-password")).rejects.toThrow(
      UnauthorizedException,
    );
    expect(account.loginLockedUntil).toEqual(new Date("2026-11-13T00:15:00Z"));
    vi.setSystemTime(new Date("2026-11-13T00:15:00Z"));
    await expect(service.login(user.email, "right-password")).resolves.toMatchObject({
      expiresIn: 3600,
    });
    expect(account).toMatchObject({ failedLoginAttempts: 0, loginLockedUntil: null });

    await expect(service.login(user.username, "wrong-password")).rejects.toThrow(
      UnauthorizedException,
    );
    expect(account.failedLoginAttempts).toBe(1);
    await service.login(user.email, "right-password");
    expect(account.failedLoginAttempts).toBe(0);
  });

  describe("refreshToken", () => {
    beforeEach(() => {
      users.findOne.mockResolvedValue(user);
    });

    it("returns a new access token with a two-hour expiry", async () => {
      const result = await service.refreshToken("existing-access-token");

      expect(result).toEqual({ accessToken: "new-access-token", expiresIn: 7200 });
      expect(users.findOne).toHaveBeenCalledWith({ where: { id: user.id } });
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: user.id, type: "access" }),
        expect.objectContaining({ expiresIn: 7200 }),
      );
    });

    it("rejects an invalid token before querying the user repository", async () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error("Invalid token");
      });

      await expect(service.refreshToken("invalid-token")).rejects.toThrow(UnauthorizedException);
      expect(users.findOne).not.toHaveBeenCalled();
    });

    it("rejects a token with a type other than access", async () => {
      jwt.verify.mockReturnValueOnce({ sub: user.id, type: "other" });

      await expect(service.refreshToken("other-token")).rejects.toThrow(UnauthorizedException);
      expect(users.findOne).not.toHaveBeenCalled();
    });

    it("rejects an access token for a missing user", async () => {
      users.findOne.mockResolvedValue(null);

      await expect(service.refreshToken("existing-access-token")).rejects.toThrow(UnauthorizedException);
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe("register", () => {
    const password = "example-password";
    const registration = { employeeCode: hrEmployee.code, password, confirmPassword: password };

    beforeEach(() => {
      roles.findOne.mockResolvedValue({
        id: user.userRoleId,
        code: "USER",
        name: "Employee",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
      hrEmployees.findOne.mockResolvedValue(hrEmployee);
      hrEmploymentRecords.findOne.mockResolvedValue(hrEmploymentRecord);
      hrUsers.findOne.mockResolvedValue(hrUser);
      manager.save.mockResolvedValueOnce({
        id: user.employeeId,
        code: hrEmployee.code,
        firstName: hrEmployee.firstName,
        lastName: hrEmployee.lastName,
      });
    });

    it("accepts registration without a role field", async () => {
      const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
      const body = { employeeCode: hrEmployee.code, password, confirmPassword: password };

      await expect(pipe.transform(body, { type: "body", metatype: RegisterDto })).resolves.toMatchObject(body);
    });

    it("assigns the employee role from the database to both records", async () => {
      await registrationService.register(registration);

      expect(roles.findOne).toHaveBeenCalledWith({ where: { code: "USER" } });
      expect(manager.save).toHaveBeenNthCalledWith(
        1,
        Employee,
        expect.objectContaining({ userRoleId: user.userRoleId }),
      );
      expect(manager.save).toHaveBeenNthCalledWith(2, User, expect.objectContaining({ userRoleId: user.userRoleId }));
    });

    it.each([
      ["missing", null],
      [
        "assigned the reserved admin ID",
        {
          id: "1",
          code: "USER",
          name: "Employee",
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      ],
    ] as const)("stops registration when the employee role is %s", async (_reason, role) => {
      roles.findOne.mockResolvedValue(role);

      await expect(registrationService.register(registration)).rejects.toThrow(ServiceUnavailableException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("rejects a missing HRDotNet employee before opening a write transaction", async () => {
      hrEmployees.findOne.mockResolvedValue(null);

      await expect(registrationService.register(registration)).rejects.toThrow(NotFoundException);
      expect(hrEmployees.findOne).toHaveBeenCalledWith({ where: { code: hrEmployee.code } });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("propagates a duplicate email error from the write transaction", async () => {
      const duplicateEmail = new Error("Duplicate email");
      manager.save.mockRejectedValueOnce(duplicateEmail);

      await expect(registrationService.register(registration)).rejects.toBe(duplicateEmail);
      expect(manager.save).toHaveBeenCalledTimes(2);
      expect(manager.save).toHaveBeenLastCalledWith(User, expect.objectContaining({ email: hrEmployee.email }));
    });

    it("returns the employee profile with HRDotNet employment details", async () => {
      const result = await registrationService.register(registration);

      expect(hrEmploymentRecords.findOne).toHaveBeenCalledWith({ where: { employeeId: hrEmployee.id } });
      expect(result.data).toEqual({
        code: hrEmployee.code,
        firstName: hrEmployee.firstName,
        lastName: hrEmployee.lastName,
        company: hrEmploymentRecord.company,
        department: null,
        position: hrEmploymentRecord.position,
        status: "active",
      });
    });

    it("links the HRDotNet username to the saved employee", async () => {
      await registrationService.register(registration);

      expect(hrUsers.findOne).toHaveBeenCalledWith({ where: { employeeId: hrEmployee.id } });
      expect(manager.save).toHaveBeenNthCalledWith(
        1,
        Employee,
        expect.objectContaining({ code: hrEmployee.code, hrdotnetId: hrUser.hrdotnetId }),
      );
      expect(manager.save).toHaveBeenNthCalledWith(
        2,
        User,
        expect.objectContaining({ employeeId: user.employeeId, username: hrUser.username }),
      );
    });
  });
  describe("signUp", () => {
    const password = "password123";
    const employee = {
      id: "20",
      code: "ITI-003",
      email: "employee@example.com",
      firstName: "Jane",
      lastName: "Doe",
      userRoleId: "2",
    } as Employee;

    beforeEach(() => {
      employees.findOne.mockResolvedValue(employee);
      users.findOne.mockResolvedValue(null);
      users.create.mockImplementation((data: Partial<User>) => data);
    });

    it("stores the employee email and the chosen username", async () => {
      await registrationService.signUp(employee.code, "user", password, password);

      expect(users.save).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: employee.id, email: employee.email, username: "user" }),
      );
    });

    it("rejects a username or email that another account already uses", async () => {
      users.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user);

      await expect(registrationService.signUp(employee.code, "user", password, password)).rejects.toBeInstanceOf(ConflictException);
      expect(users.save).not.toHaveBeenCalled();
    });

    it("rejects an email address as the username", async () => {
      await expect(registrationService.signUp(employee.code, "a@b.co", password, password)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(users.save).not.toHaveBeenCalled();
    });

    it("turns a unique violation from the save into a conflict", async () => {
      users.save.mockRejectedValue({ driverError: { code: "23505" } });

      await expect(registrationService.signUp(employee.code, "user", password, password)).rejects.toBeInstanceOf(ConflictException);
    });
  });
  describe("getCurrentUser", () => {
    const employee = {
      id: user.employeeId,
      code: "ITI-003",
      firstName: "Jane",
      lastName: "Doe",
      userRoleId: "2",
    } as Employee;
    const managerRole = { id: "2", code: "MANAGER", name: "Manager" } as UserRole;

    beforeEach(() => {
      users.findOne.mockResolvedValue(user);
      employees.findOne.mockResolvedValue(employee);
      roles.findOne.mockResolvedValue(managerRole);
    });

    it("returns the account with the role code and the employee name", async () => {
      await expect(service.getCurrentUser(user.id)).resolves.toEqual({
        userId: user.id,
        email: user.email,
        username: user.username,
        role: "MANAGER",
        employeeCode: "ITI-003",
        firstName: "Jane",
        lastName: "Doe",
      });
    });

    it("reads the role of the employee record, the one the admin guard checks", async () => {
      await service.getCurrentUser(user.id);

      expect(roles.findOne).toHaveBeenCalledWith({ where: { id: employee.userRoleId } });
    });

    it("falls back to the role of the user when no employee record exists", async () => {
      employees.findOne.mockResolvedValue(null);

      const current = await service.getCurrentUser(user.id);

      expect(roles.findOne).toHaveBeenCalledWith({ where: { id: user.userRoleId } });
      expect(current).toMatchObject({ employeeCode: null, firstName: null, lastName: null });
    });

    it("rejects a token whose user no longer exists", async () => {
      users.findOne.mockResolvedValue(null);

      await expect(service.getCurrentUser(user.id)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects a role code that the shared contract does not list", async () => {
      roles.findOne.mockResolvedValue({ ...managerRole, code: "OWNER" });

      await expect(service.getCurrentUser(user.id)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
