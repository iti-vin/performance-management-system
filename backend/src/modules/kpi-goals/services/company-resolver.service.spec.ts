import { ForbiddenException } from "@nestjs/common";
import type { DataSource, Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../../auth/entities/user.entity.js";
import type { EmployeeService } from "../../employees/services/employee.service.js";
import { CompanyResolver } from "./company-resolver.service.js";

const USER = { id: "user-1", employeeId: "5" };
const GUID = "00000000-0000-0000-0000-000000000021";

describe("CompanyResolver", () => {
  const findUser = vi.fn();
  const findByUser = vi.fn();
  const query = vi.fn();
  let resolver: CompanyResolver;

  beforeEach(() => {
    findUser.mockReset().mockResolvedValue(USER);
    findByUser.mockReset().mockResolvedValue({ company: "Example Company", guid: GUID });
    query.mockReset().mockResolvedValue([{ company_id: "1" }]);
    resolver = new CompanyResolver(
      { findOne: findUser } as unknown as Repository<User>,
      { findByUser } as unknown as EmployeeService,
      { manager: { query } } as unknown as DataSource,
    );
  });

  it("maps the company name of the account's pms.employees row to its pms.companies id", async () => {
    await expect(resolver.resolveCompanyId("user-1")).resolves.toBe(1);

    expect(findByUser).toHaveBeenCalledWith(USER);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("pms.companies"), ["Example Company"]);
  });

  describe("resolveAccount", () => {
    it("returns the company and the GUID of the employee row: the actor of a write", async () => {
      await expect(resolver.resolveAccount("user-1")).resolves.toEqual({ companyId: 1, actorId: GUID });
    });

    it("returns no actor when the employee row has no GUID", async () => {
      findByUser.mockResolvedValue({ company: "Example Company", guid: null });

      await expect(resolver.resolveAccount("user-1")).resolves.toEqual({ companyId: 1, actorId: null });
    });
  });

  it.each([
    ["no user row", () => findUser.mockResolvedValue(null)],
    ["no employee row", () => findByUser.mockResolvedValue(null)],
    ["no company with that name", () => query.mockResolvedValue([])],
    ["two companies with that name", () => query.mockResolvedValue([{ company_id: "1" }, { company_id: "2" }])],
  ])("refuses with %s", async (_label, arrange) => {
    arrange();

    await expect(resolver.resolveCompanyId("user-1")).rejects.toThrow(ForbiddenException);
  });
});
