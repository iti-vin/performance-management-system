import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { User } from "../entities/user.entity.js";
import { Employee } from "../entities/employee.entity.js";
import { HREmployee, HRUser } from "../entities/hrdotnet.entity.js";

type MockRepo<_Entity> = {
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

function createRepo<T>(): MockRepo<T> {
  return {
    findOne: vi.fn(),
    create: vi.fn((d: Partial<T>) => d as T),
    save: vi.fn(async (e: T) => e),
  };
}

const emp: HREmployee = {
  id: "g1",
  code: "E001",
  firstName: "Jane",
  lastName: "Doe",
  fullName: "Permanent",
  email: "jane@example.com",
};

const other: HRUser = {
  employeeId: "u9",
  username: "janedoe",
  hrdotnetId: "3",
};

const user: User = {
  id: "uu1",
  employeeId: "uu1",
  userRoleId: "uu1",
  email: "jane@example.com",
  username: "",
  passwordHash: "hash",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const jwt = {
  sign: vi.fn(async () => "new-access-token"),
  verify: vi.fn(async () => ({ sub: "uu1", email: "jane@example.com", type: "access" })),
};

const cfg: ConfigService = {
  get: vi.fn((_k: string, d?: unknown) => d ?? "dev-secret"),
} as unknown as ConfigService;

describe("AuthService.refreshToken", () => {
  let service: AuthService;
  let users: MockRepo<User>;
  let employees: MockRepo<HREmployee>;
  let otherUsers: MockRepo<HRUser>;

  async function build() {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(HREmployee, "secondaryDB"), useValue: employees },
        { provide: getRepositoryToken(HRUser, "secondaryDB"), useValue: otherUsers },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: cfg },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  }

  beforeEach(() => {
    users = createRepo<User>();
    employees = createRepo<HREmployee>();
    otherUsers = createRepo<HRUser>();
    vi.clearAllMocks();
    users.findOne.mockResolvedValue(user);
  });

  it("returns a new access token with longer expiry when valid token submitted", async () => {
    await build();
    const res = await service.refreshToken("existing-access-token");
    expect(res.accessToken).toBe("new-access-token");
    expect(res.expiresIn).toBe(7200);
  });

  it("throws UnauthorizedException when token is invalid", async () => {
    await build();
    jwt.verify.mockRejectedValue(new Error("invalid"));
    await expect(service.refreshToken("bad-token")).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when payload type is not access", async () => {
    await build();
    jwt.verify.mockResolvedValue({ sub: "uu1", email: "jane@example.com", type: "other" });
    await expect(service.refreshToken("token")).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when user not found in DB", async () => {
    await build();
    users.findOne.mockResolvedValue(null);
    await expect(service.refreshToken("existing-access-token")).rejects.toThrow(UnauthorizedException);
  });
});

describe("AuthService.register", () => {
  let service: AuthService;
  let users: MockRepo<User>;
  let employees: MockRepo<Employee>;
  let otherUsers: MockRepo<HRUser>;

  async function build() {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(Employee, "secondaryDB"), useValue: employees },
        { provide: getRepositoryToken(HRUser, "secondaryDB"), useValue: otherUsers },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: cfg },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  }

  beforeEach(() => {
    users = createRepo<User>();
    employees = createRepo<Employee>();
    otherUsers = createRepo<HRUser>();
    vi.clearAllMocks();
  });

  it("rejects when employee has no matching tEmployees record", async () => {
    users.findOne.mockResolvedValue(null);
    employees.findOne.mockResolvedValue(null);
    otherUsers.findOne.mockResolvedValue(null);
    await build();
    await expect(service.register("", "", "jane@example.com", "password1")).rejects.toThrow(NotFoundException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email before employee lookup", async () => {
    users.findOne.mockResolvedValue(user);
    await build();
    await expect(service.register("10230306", "admin123", "admin123", "1")).rejects.toThrow("Email already registered");
    expect(employees.findOne).not.toHaveBeenCalled();
  });

  it("returns employee details alongside tokens when tEmployees match exists", async () => {
    users.findOne.mockResolvedValue(null);
    employees.findOne.mockResolvedValue(emp);
    await build();
    const res = await service.register("10230306", "admin123", "admin123", "1");
    expect(res.data).toMatchObject({
      employeeId: emp.id,
      employeeNumber: emp.code,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
    });
  });

  it("matches by username via OtherUser when identifier is not an email", async () => {
    users.findOne.mockResolvedValue(null);
    employees.findOne.mockResolvedValue(null);
    otherUsers.findOne.mockResolvedValue(other);
    await build();
    const res = await service.register("10230306", "admin123", "admin123", "1");
    expect(employees.findOne).toHaveBeenCalledWith({ where: { emailAdd: "janedoe" } });
    expect(res.data).toMatchObject({
      employeeId: other.employeeId,
      username: other.username,
      hrdotnetId: other.hrdotnetId,
    });
  });
});
