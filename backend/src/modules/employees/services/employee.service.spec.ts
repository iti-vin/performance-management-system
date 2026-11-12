import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { vi } from "vitest";
import { EmployeeService } from "./employee.service.js";
import { EmployeeDomain } from "../entities/employee-domain.entity.js";
import { CreateEmployeeDto } from "../dtos/create-employee.dto.js";
import { UpdateEmployeeDto } from "../dtos/update-employee.dto.js";
import { EmployeeStatus } from "../types/employee-status.enum.js";
import { User } from "../../auth/entities/user.entity.js";

describe("EmployeeService", () => {
  let service: EmployeeService;
  let repository: Repository<EmployeeDomain>;

  const mockRepo = () => ({
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: getRepositoryToken(EmployeeDomain),
          useFactory: mockRepo,
        },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    repository = module.get<Repository<EmployeeDomain>>(getRepositoryToken(EmployeeDomain));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    const dto: CreateEmployeeDto = {
      hrdotnetId: undefined,
      email: "juan@example.com",
      employeeCode: "EMP-001",
      firstName: "Juan",
      lastName: "Dela Cruz",
      userRoleId: "2",
      status: EmployeeStatus.ACTIVE,
    };

    it("should create and return an employee with generated guid", async () => {
      const savedEntity: Partial<EmployeeDomain> = {
        guid: "aaaa-bbbb-cccc-dddd-eeee",
        hrdotnetId: null,
        email: dto.email,
        employeeCode: dto.employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        userRoleId: "2",
        status: dto.status,
      };

      vi.spyOn(repository, "create").mockReturnValue(savedEntity as EmployeeDomain);
      vi.spyOn(repository, "save").mockResolvedValue(savedEntity as EmployeeDomain);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hrdotnetId: null,
          email: dto.email,
          employeeCode: dto.employeeCode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          userRoleId: "2",
          status: dto.status,
          guid: expect.any(String),
        }),
      );
      expect(result).toBe(savedEntity);
    });

    it("should default status to active when omitted", async () => {
      const dtoNoStatus: CreateEmployeeDto = {
        email: "juan@example.com",
        employeeCode: "EMP-002",
        firstName: "Juan",
        lastName: "Dela Cruz",
        userRoleId: "2",
      };

      vi.spyOn(repository, "create").mockImplementation((input) => input as EmployeeDomain);
      vi.spyOn(repository, "save").mockResolvedValue(dtoNoStatus as unknown as EmployeeDomain);

      await service.create(dtoNoStatus);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: EmployeeStatus.ACTIVE }),
      );
    });
  });

  describe("findById", () => {
    it("should return the employee when found", async () => {
      const guid = "aaaa-bbbb-cccc-dddd-eeee";
      const entity: Partial<EmployeeDomain> = { guid, employeeCode: "EMP-001" };

      vi.spyOn(repository, "findOne").mockResolvedValue(entity as EmployeeDomain);

      const result = await service.findById(guid);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { guid } });
      expect(result).toBe(entity);
    });

    it("should throw NotFoundException when not found", async () => {
      vi.spyOn(repository, "findOne").mockResolvedValue(null);

      await expect(service.findById("aaaa-bbbb-cccc-dddd-eeee")).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    const guid = "aaaa-bbbb-cccc-dddd-eeee";

    it("should update only provided fields", async () => {
      const existing: Partial<EmployeeDomain> = {
        guid,
        email: "old@example.com",
        firstName: "Old",
        lastName: "Last",
        status: EmployeeStatus.ACTIVE,
      };
      const dto: UpdateEmployeeDto = {
        email: "new@example.com",
        status: EmployeeStatus.INACTIVE,
      };

      vi.spyOn(repository, "findOne").mockResolvedValue(existing as EmployeeDomain);
      vi.spyOn(repository, "save").mockImplementation(async (e) => e as unknown as EmployeeDomain);

      const result = await service.update(guid, dto);

      expect(result).toBe(existing);
      expect((result as Partial<EmployeeDomain>).email).toBe("new@example.com");
      expect((result as Partial<EmployeeDomain>).status).toBe("inactive");
      expect((result as Partial<EmployeeDomain>).firstName).toBe("Old");
    });

    it("should throw NotFoundException when guid does not exist", async () => {
      vi.spyOn(repository, "findOne").mockResolvedValue(null);

      await expect(
        service.update("aaaa-bbbb-cccc-dddd-eeee", { email: "new@example.com" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByUser", () => {
    it("should return the employee row linked to the user", async () => {
      const user: Partial<User> = { id: "9", employeeId: "5" };
      const entity: Partial<EmployeeDomain> = { id: "5", email: "juan@example.com" };

      vi.spyOn(repository, "findOne").mockResolvedValue(entity as EmployeeDomain);

      const result = await service.findByUser(user as User);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: "5" } });
      expect(result).toBe(entity);
    });

    it("should return null when no employee is linked", async () => {
      const user: Partial<User> = { id: "9", employeeId: "5" };

      vi.spyOn(repository, "findOne").mockResolvedValue(null);

      const result = await service.findByUser(user as User);

      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return all rows with the safe subset of fields", async () => {
      const row = {
        id: "1",
        guid: "aaaa-bbbb-cccc-dddd-eeee",
        employeeCode: "EMP-001",
        email: "juan@example.com",
        firstName: "Juan",
        lastName: "Dela Cruz",
        hrdotnetId: "789",
        userRoleId: "2",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(repository, "find").mockResolvedValue([row] as unknown as EmployeeDomain[]);

      const result = await service.findAll();

      expect(result).toEqual([
        expect.objectContaining({
          id: "1",
          guid: row.guid,
          employeeCode: row.employeeCode,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          status: row.status,
        }),
      ]);
      expect(result[0]).not.toHaveProperty("userRoleId");
      expect(result[0]).not.toHaveProperty("hrdotnetId");
    });
  });
});
