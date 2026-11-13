import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { User } from "../../auth/entities/user.entity.js";
import { EmployeeService } from "../services/employee.service.js";
import { EmployeeController } from "./employees.controller.js";

describe("EmployeeController.findAll", () => {
  const findAll = vi.fn();
  let controller: EmployeeController;

  beforeEach(async () => {
    findAll.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [EmployeeController],
      providers: [
        { provide: EmployeeService, useValue: { findAll } },
        { provide: getRepositoryToken(User), useValue: {} },
      ],
    }).compile();
    controller = moduleRef.get(EmployeeController);
  });

  it.each([
    { query: {}, page: 1, pageSize: 20 },
    { query: { page: "2", pageSize: "50" }, page: 2, pageSize: 50 },
  ])("forwards validated pagination values ($page, $pageSize)", async ({ query, page, pageSize }) => {
    const result = { items: [], page, pageSize, pageCount: 0, total: 0 };
    findAll.mockResolvedValue(result);

    await expect(controller.findAll(query)).resolves.toEqual(result);
    expect(findAll).toHaveBeenCalledWith({ page, pageSize });
  });

  it.each([
    { page: "0" },
    { page: "1.5" },
    { page: "9007199254740992" },
    { page: ["1", "2"] },
    { pageSize: "0" },
    { pageSize: "101" },
    { pageSize: "" },
  ])("rejects invalid pagination before reading employees (%j)", async (query) => {
    await expect(controller.findAll(query)).rejects.toThrow(BadRequestException);
    expect(findAll).not.toHaveBeenCalled();
  });
});
