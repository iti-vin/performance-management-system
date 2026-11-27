import { createReviewCycleRequestSchema, extendReviewCycleRequestSchema, reopenReviewRequestSchema } from "@pms/shared-types";
import { plainToInstance } from "class-transformer";
import { validate, type ValidationError } from "class-validator";
import { describe, expect, it } from "vitest";
import { CancelReviewCycleDto } from "./cancel-review-cycle.dto.js";
import { CreateReviewCycleDto } from "./create-review-cycle.dto.js";
import { ExtendReviewCycleDto } from "./extend-review-cycle.dto.js";
import { ReopenReviewDto } from "./reopen-review.dto.js";

// Validate the way main.ts does, so a key the DTO lacks fails here too.
const PIPE_OPTIONS = { whitelist: true, forbidNonWhitelisted: true } as const;

async function errorPaths<T extends object>(type: new () => T, body: unknown): Promise<string[]> {
  const paths: string[] = [];
  const walk = (errors: ValidationError[], prefix: string) => {
    for (const error of errors) {
      const path = prefix ? `${prefix}.${error.property}` : error.property;
      if (error.constraints) paths.push(path);
      walk(error.children ?? [], path);
    }
  };
  walk(await validate(plainToInstance(type, body) as object, PIPE_OPTIONS), "");
  return paths;
}

const draft = {
  name: "CY2027-Q1",
  reviewType: "standard",
  evaluationStart: "2027-01-01",
  evaluationEnd: "2027-03-31",
  assessmentStart: "2027-04-01T00:00:00.000Z",
  verificationDeadline: "2027-04-20T00:00:00.000Z",
  goalsWeight: 0.5,
  behavioralWeight: 0.5,
  anonymityThreshold: null,
  stages: [
    { perspective: "self", evaluatorRole: "employee", deadline: "2027-04-07T00:00:00.000Z" },
    { perspective: "hr", evaluatorRole: "hr_officer", deadline: "2027-04-14T00:00:00+08:00" },
  ],
};

describe("review cycle request contract", () => {
  it("accepts the body the shared create schema produces", async () => {
    const body = createReviewCycleRequestSchema.parse(draft);

    expect(await errorPaths(CreateReviewCycleDto, body)).toEqual([]);
  });

  it("accepts a stage that names its evaluator person", async () => {
    const stages = [{ ...draft.stages[0], evaluatorId: "00000000-0000-0000-0000-000000000023" }];

    expect(await errorPaths(CreateReviewCycleDto, { ...draft, stages })).toEqual([]);
  });

  it.each([
    ["a blank name", { name: "   " }, "name"],
    ["a name with a NUL character", { name: "Q1\u0000" + "x" }, "name"],
    ["a name over 120 characters", { name: "x".repeat(121) }, "name"],
    ["a review type outside the list", { reviewType: "Standard Performance Review" }, "reviewType"],
    ["a period start that is not a date", { evaluationStart: "01/01/2027" }, "evaluationStart"],
    ["a period end that is not a calendar day", { evaluationEnd: "2027-02-30" }, "evaluationEnd"],
    ["an assessment start with no time", { assessmentStart: "2027-04-01" }, "assessmentStart"],
    ["a verification deadline that is text", { verificationDeadline: "soon" }, "verificationDeadline"],
    ["a goals weight above 1", { goalsWeight: 1.5 }, "goalsWeight"],
    ["a behavioral weight below 0", { behavioralWeight: -0.1 }, "behavioralWeight"],
    // numeric(4,2) rounds a third decimal away before the "total 1" CHECK runs, so the database would refuse 0.335 + 0.665.
    ["a goals weight with three decimals", { goalsWeight: 0.335, behavioralWeight: 0.66 }, "goalsWeight"],
    ["a behavioral weight with three decimals", { goalsWeight: 0.66, behavioralWeight: 0.335 }, "behavioralWeight"],
    ["an anonymity threshold of 1", { anonymityThreshold: 1 }, "anonymityThreshold"],
    ["an anonymity threshold of 11", { anonymityThreshold: 11 }, "anonymityThreshold"],
    ["no stage", { stages: [] }, "stages"],
    ["a key the DTO does not know", { companyId: "x" }, "companyId"],
  ])("refuses %s", async (_label, change, path) => {
    expect(await errorPaths(CreateReviewCycleDto, { ...draft, ...change })).toEqual([path]);
  });

  it("accepts 10 stages and refuses 11: a launch creates one assignment per participant and stage", async () => {
    const stages = (count: number) => Array.from({ length: count }, () => draft.stages[0]);

    expect(await errorPaths(CreateReviewCycleDto, { ...draft, stages: stages(10) })).toEqual([]);
    expect(await errorPaths(CreateReviewCycleDto, { ...draft, stages: stages(11) })).toEqual(["stages"]);
  });

  it.each([
    ["a perspective outside the list", { perspective: "boss" }, "stages.0.perspective"],
    ["a blank evaluator role", { evaluatorRole: " " }, "stages.0.evaluatorRole"],
    ["a deadline that is text", { deadline: "friday" }, "stages.0.deadline"],
    ["an evaluator id that is not a GUID", { evaluatorId: "maria" }, "stages.0.evaluatorId"],
  ])("refuses a stage with %s", async (_label, change, path) => {
    const stages = [{ ...draft.stages[0], ...change }];

    expect(await errorPaths(CreateReviewCycleDto, { ...draft, stages })).toEqual([path]);
  });
});

describe("review cycle participants contract", () => {
  const EMPLOYEE = "00000000-0000-0000-0000-000000000021";
  const TEMPLATE = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

  it("accepts the body the shared create schema produces with participants", async () => {
    const body = createReviewCycleRequestSchema.parse({
      ...draft,
      participants: [{ employeeId: EMPLOYEE, kpiTemplateId: TEMPLATE, behavioralTemplateId: TEMPLATE }, { employeeId: "00000000-0000-0000-0000-000000000022" }],
    });

    expect(await errorPaths(CreateReviewCycleDto, body)).toEqual([]);
  });

  it("accepts a draft with no participants key", async () => {
    expect(await errorPaths(CreateReviewCycleDto, draft)).toEqual([]);
  });

  it.each([
    ["an employee id that is not a GUID", [{ employeeId: "maria" }], "participants.0.employeeId"],
    ["a KPI template id that is not a GUID", [{ employeeId: EMPLOYEE, kpiTemplateId: "x" }], "participants.0.kpiTemplateId"],
    ["a behavioral template id that is not a GUID", [{ employeeId: EMPLOYEE, behavioralTemplateId: "x" }], "participants.0.behavioralTemplateId"],
    ["a key the participant DTO does not know", [{ employeeId: EMPLOYEE, company: "x" }], "participants.0.company"],
  ])("refuses %s", async (_label, participants, path) => {
    expect(await errorPaths(CreateReviewCycleDto, { ...draft, participants })).toEqual([path]);
  });

  it("refuses more than 500 participants", async () => {
    const participants = Array.from({ length: 501 }, (_, index) => ({ employeeId: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}` }));

    expect(await errorPaths(CreateReviewCycleDto, { ...draft, participants })).toEqual(["participants"]);
  });
});

describe("review cycle cancellation contract", () => {
  it("accepts a reason", async () => {
    expect(await errorPaths(CancelReviewCycleDto, { reason: "Budget freeze" })).toEqual([]);
  });

  it.each([
    ["a missing reason", {}],
    ["a blank reason", { reason: "   " }],
    ["a reason over 2000 characters", { reason: "x".repeat(2001) }],
  ])("refuses %s", async (_label, body) => {
    expect(await errorPaths(CancelReviewCycleDto, body)).toEqual(["reason"]);
  });
});

describe("review cycle cancellation text", () => {
  it("says in words why a NUL character is refused", async () => {
    const messages = async <T extends object>(type: new () => T, body: unknown) =>
      (await validate(plainToInstance(type, body) as object, PIPE_OPTIONS)).flatMap((error) => Object.values(error.constraints ?? {}));

    expect(await messages(CancelReviewCycleDto, { reason: "No\u0000budget" })).toEqual(["Remove the character that cannot be saved."]);
    expect(await messages(CreateReviewCycleDto, { ...draft, name: "Q1\u0000x" })).toEqual(["Remove the character that cannot be saved."]);
  });

  it("refuses a reason with a NUL character", async () => {
    expect(await errorPaths(CancelReviewCycleDto, { reason: "No\u0000budget" })).toEqual(["reason"]);
  });
});

describe("extension request contract", () => {
  const stage = { stageId: "00000000-0000-0000-0000-000000000151", deadline: "2027-05-01T00:00:00+08:00" };
  const body = { reason: "Holiday week", verificationDeadline: "2027-05-10T00:00:00.000Z", stages: [stage] };

  it("accepts the same body as the shared schema, with or without each date", async () => {
    for (const accepted of [body, { reason: "x", stages: [stage] }, { reason: "x", verificationDeadline: body.verificationDeadline }]) {
      expect(extendReviewCycleRequestSchema.safeParse(accepted).success).toBe(true);
      expect(await errorPaths(ExtendReviewCycleDto, accepted)).toEqual([]);
    }
  });

  it.each([
    ["reason", { ...body, reason: "   " }],
    ["reason", { ...body, reason: "x".repeat(2001) }],
    ["reason", { ...body, reason: "a\u0000b" }],
    ["verificationDeadline", { ...body, verificationDeadline: "2027-05-10" }],
    ["stages.0.stageId", { ...body, stages: [{ ...stage, stageId: "1" }] }],
    ["stages.0.deadline", { ...body, stages: [{ ...stage, deadline: "later" }] }],
    ["stages", { ...body, stages: Array.from({ length: 11 }, () => stage) }],
    ["state", { ...body, state: "draft" }],
  ])("refuses a bad %s", async (path, refused) => {
    expect(await errorPaths(ExtendReviewCycleDto, refused)).toContain(path);
  });
});

describe("reopening request contract", () => {
  it("accepts the same body as the shared schema", async () => {
    expect(reopenReviewRequestSchema.safeParse({ reason: "Wrong ratings" }).success).toBe(true);
    expect(await errorPaths(ReopenReviewDto, { reason: "Wrong ratings" })).toEqual([]);
  });

  it.each([
    ["reason", { reason: "   " }],
    ["reason", { reason: "x".repeat(2001) }],
    ["reason", { reason: "a\u0000b" }],
    ["state", { reason: "x", state: "locked" }],
  ])("refuses a bad %s", async (path, refused) => {
    expect(await errorPaths(ReopenReviewDto, refused)).toContain(path);
  });
});

describe("slice 5 request contract", () => {
  const body = { ...draft, description: "Yearly review", accomplishmentDeadline: "2027-04-10T23:59:59+08:00" };

  it("accepts a description and an accomplishment deadline, in a create and in an extension", async () => {
    expect(createReviewCycleRequestSchema.safeParse(body).success).toBe(true);
    expect(await errorPaths(CreateReviewCycleDto, body)).toEqual([]);
    expect(await errorPaths(CreateReviewCycleDto, { ...draft, description: "", accomplishmentDeadline: null })).toEqual([]);
    expect(await errorPaths(ExtendReviewCycleDto, { reason: "x", accomplishmentDeadline: body.accomplishmentDeadline })).toEqual([]);
  });

  it.each([
    ["description", { ...body, description: "x".repeat(2001) }],
    ["description", { ...body, description: "a\u0000b" }],
    ["accomplishmentDeadline", { ...body, accomplishmentDeadline: "2027-04-10" }],
  ])("refuses a bad %s", async (path, refused) => {
    expect(await errorPaths(CreateReviewCycleDto, refused)).toContain(path);
  });
});

describe("peer request contract", () => {
  const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
  const body = (peerIds: unknown) => ({ ...draft, participants: [{ employeeId: id(1), peerIds }] });

  it("accepts the peers of a participant", async () => {
    expect(await errorPaths(CreateReviewCycleDto, body([id(2), id(3)]))).toEqual([]);
  });

  it.each([
    ["a peer twice", [id(2), id(2)]],
    ["an id that is not a GUID", ["x"]],
    ["too many peers", Array.from({ length: 21 }, (_, index) => id(index + 2))],
  ])("refuses %s", async (_what, peerIds) => {
    expect(await errorPaths(CreateReviewCycleDto, body(peerIds))).toContain("participants.0.peerIds");
  });
});
