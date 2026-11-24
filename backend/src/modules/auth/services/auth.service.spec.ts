import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { DataSource, type Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmployeeDomain } from "../../employees/entities/employee-domain.entity.js";
import { UserRole } from "../entities/user-role.entity.js";
import { User } from "../entities/user.entity.js";
import type { JwtPayload } from "../types/jwt-payload.types.js";
import { AuthService } from "./auth.service.js";
import { AccountRegistrationService } from "./account-registration.service.js";

const user: User = {
  id: "30",
  employeeId: "20",
  userRoleId: "2",
  email: "jane@example.com",
  username: "janedoe",
  passwordHash: "unused-test-hash",
  failedLoginAttempts: 0,
  loginLockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const employeeRole: UserRole = {
  id: "3",
  code: "USER",
  name: "Employee",
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
  const employees = { findOne: vi.fn<Repository<EmployeeDomain>["findOne"]>() };
  const roles = { findOne: vi.fn<Repository<UserRole>["findOne"]>() };
  const jwt = {
    sign: vi.fn(() => "new-access-token"),
    verify: vi.fn((): JwtPayload => ({ sub: user.id, type: "access" })),
  };
  const manager = { getRepository: () => users };
  const dataSource = {
    transaction: vi.fn((run: (transactionManager: typeof manager) => Promise<unknown>) => run(manager)),
  };

  let service: AuthService;
  let registrationService: AccountRegistrationService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        AccountRegistrationService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(EmployeeDomain), useValue: employees },
        { provide: getRepositoryToken(UserRole), useValue: roles },
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

  describe("signUp", () => {
    const password = "password123";
    const employee = {
      id: "20",
      employeeCode: "ITI-003",
      email: "employee@example.com",
      firstName: "Jane",
      lastName: "Doe",
    } as EmployeeDomain;

    beforeEach(() => {
      employees.findOne.mockResolvedValue(employee);
      roles.findOne.mockResolvedValue(employeeRole);
      users.findOne.mockResolvedValue(null);
      users.create.mockImplementation((data: Partial<User>) => data);
    });

    it("stores the employee email, the chosen username, and the employee role", async () => {
      await registrationService.signUp(employee.employeeCode, "user", password, password);

      expect(employees.findOne).toHaveBeenCalledWith({ where: { employeeCode: employee.employeeCode } });
      expect(roles.findOne).toHaveBeenCalledWith({ where: { code: "USER" } });
      expect(users.save).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: employee.id,
          email: employee.email,
          username: "user",
          userRoleId: employeeRole.id,
        }),
      );
    });

    it.each([
      ["missing", null],
      ["the reserved admin ID", { ...employeeRole, id: "1" }],
    ] as const)("stops when the employee role is %s", async (_reason, role) => {
      roles.findOne.mockResolvedValue(role);

      await expect(registrationService.signUp(employee.employeeCode, "user", password, password)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(users.save).not.toHaveBeenCalled();
    });

    it("rejects a username or email that another account already uses", async () => {
      users.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user);

      await expect(registrationService.signUp(employee.employeeCode, "user", password, password)).rejects.toBeInstanceOf(ConflictException);
      expect(users.save).not.toHaveBeenCalled();
    });

    it("rejects an email address as the username", async () => {
      await expect(registrationService.signUp(employee.employeeCode, "a@b.co", password, password)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(users.save).not.toHaveBeenCalled();
    });

    it("turns a unique violation from the save into a conflict", async () => {
      users.save.mockRejectedValue({ driverError: { code: "23505" } });

      await expect(registrationService.signUp(employee.employeeCode, "user", password, password)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("getCurrentUser", () => {
    const employee = {
      id: user.employeeId,
      employeeCode: "ITI-003",
      firstName: "Jane",
      lastName: "Doe",
    } as EmployeeDomain;
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
      expect(employees.findOne).toHaveBeenCalledWith({ where: { id: user.employeeId } });
    });

    it("reads the role of the user account, the one the admin guard checks", async () => {
      await service.getCurrentUser(user.id);

      expect(roles.findOne).toHaveBeenCalledWith({ where: { id: user.userRoleId } });
    });

    it("returns null names when no employee record exists", async () => {
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
