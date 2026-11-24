import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../../auth/entities/user.entity.js";
import { AdminRoleGuard } from "./admin-role.guard.js";

function contextFor(userId: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: userId ? { userId } : undefined }) }),
  } as ExecutionContext;
}

describe("AdminRoleGuard", () => {
  const findOne = vi.fn<Repository<User>["findOne"]>();
  let guard: AdminRoleGuard;

  beforeEach(() => {
    findOne.mockReset();
    guard = new AdminRoleGuard({ findOne } as unknown as Repository<User>);
  });

  it("allows an account whose own role is admin", async () => {
    findOne.mockResolvedValue({ id: "9", userRoleId: "1" } as User);

    await expect(guard.canActivate(contextFor("9"))).resolves.toBe(true);
    expect(findOne).toHaveBeenCalledWith({ where: { id: "9" } });
  });

  it.each([
    ["no user id in the token", undefined, null],
    ["a deleted account", "9", null],
    ["a non-admin account", "9", { id: "9", userRoleId: "2" } as User],
  ])("forbids %s", async (_case, userId, account) => {
    findOne.mockResolvedValue(account);

    await expect(guard.canActivate(contextFor(userId))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
