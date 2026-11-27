import { describe, expect, it, vi } from "vitest";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard.js";
import { AdminRoleGuard } from "../../employees/guards/admin-role.guard.js";
import type { CreateBehavioralTemplateDto } from "../dtos/create-behavioral-template.dto.js";
import type { BehavioralAssessmentService } from "../services/behavioral-assessment.service.js";
import { BehavioralAssessmentController } from "./behavioral-assessment.controller.js";

const TEMPLATE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const request = { user: { userId: "user-1" } };

describe("BehavioralAssessmentController access", () => {
  it("requires a valid token, then the HR admin role, on every route", () => {
    const guards: unknown[] = Reflect.getMetadata("__guards__", BehavioralAssessmentController);

    expect(guards).toEqual([JwtAuthGuard, AdminRoleGuard]);
  });
});

describe("BehavioralAssessmentController scope", () => {
  const service = { list: vi.fn(), getById: vi.fn(), update: vi.fn() };
  const controller = new BehavioralAssessmentController(service as unknown as BehavioralAssessmentService);
  const request = { user: { userId: "user-1" } } as never;

  it("passes the signed-in user id to every read and to an update", async () => {
    await controller.list(request);
    await controller.getById("t-1", request);
    await controller.update("t-1", {} as never, request);

    expect(service.list).toHaveBeenCalledWith("user-1");
    expect(service.getById).toHaveBeenCalledWith("t-1", "user-1");
    expect(service.update).toHaveBeenCalledWith("t-1", {}, "user-1");
  });
});

describe("BehavioralAssessmentController actor", () => {
  const service = { create: vi.fn(), publish: vi.fn(), createVersion: vi.fn() };
  const controller = new BehavioralAssessmentController(service as unknown as BehavioralAssessmentService);

  it("passes the signed-in user id (userId, not id) to create", async () => {
    const dto = {
      name: "Quarterly Review",
      category: "general_performance",
      reviewType: "self",
      sections: [],
    } satisfies CreateBehavioralTemplateDto;

    await controller.create(dto, request);

    expect(service.create).toHaveBeenCalledWith(dto, "user-1");
  });

  it("passes the signed-in user id to a new version", async () => {
    const dto = { sections: [] };

    await controller.createVersion(TEMPLATE_ID, dto, request);

    expect(service.createVersion).toHaveBeenCalledWith(TEMPLATE_ID, dto, "user-1");
  });

  it("passes the signed-in user id to publish", async () => {
    await controller.publish(TEMPLATE_ID, request);

    expect(service.publish).toHaveBeenCalledWith(TEMPLATE_ID, "user-1");
  });
});
