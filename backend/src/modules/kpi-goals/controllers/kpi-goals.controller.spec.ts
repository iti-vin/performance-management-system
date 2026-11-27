import { describe, expect, it, vi } from "vitest";
import { AdminRoleGuard } from "../../employees/guards/admin-role.guard.js";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard.js";
import type { CreateKpiGoalTemplateDto } from "../dtos/create-kpi-goal-template.dto.js";
import type { KpiGoalsService } from "../services/kpi-goals.service.js";
import { KpiGoalsController } from "./kpi-goals.controller.js";

const TEMPLATE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const request = { user: { userId: "user-1" } };

describe("KpiGoalsController access", () => {
  it("requires a valid token, then the HR admin role, on every route", () => {
    const guards: unknown[] = Reflect.getMetadata("__guards__", KpiGoalsController);

    expect(guards).toEqual([JwtAuthGuard, AdminRoleGuard]);
  });
});

describe("KpiGoalsController actor", () => {
  const service = {
    create: vi.fn(),
    publish: vi.fn(),
    listPositions: vi.fn(),
    createVersion: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };
  const controller = new KpiGoalsController(service as unknown as KpiGoalsService);

  it("passes the signed-in user id to create", async () => {
    const dto = { name: "Template", indicators: [] } satisfies CreateKpiGoalTemplateDto;

    await controller.create(dto, request);

    expect(service.create).toHaveBeenCalledWith(dto, "user-1");
  });

  it("passes the signed-in user id to publish", async () => {
    await controller.publish(TEMPLATE_ID, request);

    expect(service.publish).toHaveBeenCalledWith(TEMPLATE_ID, "user-1");
  });

  it("passes the signed-in user id to a new version", async () => {
    const dto = { name: "Template", indicators: [] };

    await controller.createVersion(TEMPLATE_ID, dto, request);

    expect(service.createVersion).toHaveBeenCalledWith(TEMPLATE_ID, dto, "user-1");
  });

  it("passes the signed-in user id to every read, update, and archive", async () => {
    const dto = { name: "Template", indicators: [] };

    await controller.list(request);
    await controller.getById(TEMPLATE_ID, request);
    await controller.update(TEMPLATE_ID, dto, request);
    await controller.archive(TEMPLATE_ID, request);

    expect(service.list).toHaveBeenCalledWith("user-1");
    expect(service.getById).toHaveBeenCalledWith(TEMPLATE_ID, "user-1");
    expect(service.update).toHaveBeenCalledWith(TEMPLATE_ID, dto, "user-1");
    expect(service.archive).toHaveBeenCalledWith(TEMPLATE_ID, "user-1");
  });

  it("lists the positions for the signed-in user", async () => {
    await controller.listPositions(request);

    expect(service.listPositions).toHaveBeenCalledWith("user-1");
  });

  it("declares the positions route before the :id route, so :id cannot catch it", () => {
    const methods = Object.getOwnPropertyNames(KpiGoalsController.prototype);

    expect(methods.indexOf("listPositions")).toBeLessThan(methods.indexOf("getById"));
  });
});
