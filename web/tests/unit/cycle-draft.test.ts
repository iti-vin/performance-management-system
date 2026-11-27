import type { ReviewCycleDetailDto, ReviewCycleOptionsDto } from "@pms/shared-types";
import { describe, expect, it } from "vitest";
import {
  draftFromDetail,
  matchKpi,
  newCycleDraft,
  stepOfPath,
  toCycleRequest,
  toDateInput,
  toInstant,
  type CycleDraft,
} from "@/features/review-cycles/services/cycle-draft";

const KPI = (templateId: string, position: string | null): ReviewCycleOptionsDto["kpiTemplates"][number] => ({
  templateId,
  name: `Goals ${templateId}`,
  position,
  version: 1,
});

describe("toInstant and toDateInput", () => {
  it("sends the start of a day and the end of a day in Asia/Manila, as an offset time", () => {
    expect(toInstant("2027-01-05", "start")).toBe("2027-01-05T00:00:00+08:00");
    expect(toInstant("2027-01-31", "end")).toBe("2027-01-31T23:59:59+08:00");
  });

  it("sends nothing for a day that is not typed yet, so the shared schema reports the field", () => {
    expect(toInstant("", "start")).toBe("");
  });

  it.each([
    ["the start of a day, which is the day before in UTC", "2027-01-05", "start", "2027-01-04T16:00:00.000Z"],
    ["the end of a day, which is the same day in UTC", "2027-01-31", "end", "2027-01-31T15:59:59.000Z"],
    ["a day across a month and year", "2027-01-01", "start", "2026-12-31T16:00:00.000Z"],
  ] as const)("returns the same day after the API stores %s as UTC", (_label, day, edge, stored) => {
    expect(new Date(toInstant(day, edge)).toISOString()).toBe(stored);
    expect(toDateInput(stored)).toBe(day);
  });
});

describe("newCycleDraft", () => {
  it("starts with the three stages of a simplified cycle in order, with no deadline and no evaluator", () => {
    expect(newCycleDraft().stages).toEqual([
      { perspective: "self", deadline: "", evaluatorId: "" },
      { perspective: "manager", deadline: "", evaluatorId: "" },
      { perspective: "hr", deadline: "", evaluatorId: "" },
    ]);
  });

  it("is the same every time: the server and the browser both render it, and random values make the HTML differ", () => {
    expect(newCycleDraft()).toEqual(newCycleDraft());
  });
});

describe("matchKpi", () => {
  const engineer = KPI("kt-1", "Software Engineer");
  const manager = KPI("kt-2", "Engineering Manager");

  it("matches the one published template of the exact position", () => {
    expect(matchKpi([engineer, manager], "Software Engineer")).toEqual({ kind: "matched", template: engineer });
  });

  it("asks HR to choose when several share the position", () => {
    const other = KPI("kt-3", "Software Engineer");

    expect(matchKpi([engineer, other, manager], "Software Engineer")).toEqual({ kind: "choose", templates: [engineer, other] });
  });

  it.each([
    ["no template has the position", "Designer"],
    ["the position differs in case, because the match is exact", "software engineer"],
    ["the employee has no position", null],
  ])("finds none when %s", (_label, position) => {
    expect(matchKpi([engineer, manager], position)).toEqual({ kind: "none" });
  });
});

describe("stepOfPath", () => {
  it.each([
    [["name"], "details"],
    [["evaluationEnd"], "details"],
    [["verificationDeadline"], "details"],
    [["behavioralWeight"], "details"],
    [["participants"], "participants"],
    [["participants", 0, "employeeId"], "participants"],
    [["participants", 0, "kpiTemplateId"], "templates"],
    [["participants", 2, "behavioralTemplateId"], "templates"],
    [["stages"], "stages"],
    [["stages", 1, "deadline"], "stages"],
    [["stages", 2, "evaluatorId"], "stages"],
  ] as const)("sends %j to the %s step", (path, step) => {
    expect(stepOfPath(path)).toBe(step);
  });
});

const IGING = "284ddc9e-ebe4-468d-945f-fb18af72e622";
const ADMIN = "6293e9c7-6495-4555-85a9-1eccebc6d34c";
const HR = "6a685ca5-7613-4e80-a384-4ebe60263aa3";
const BEH_DEFAULT = "3f2504e0-4f89-41d3-9a0c-0305e82c3310";
const BEH_ENGINEER = "3f2504e0-4f89-41d3-9a0c-0305e82c3311";
const KPI_CHOICE = "3f2504e0-4f89-41d3-9a0c-0305e82c3320";

const OPTIONS: ReviewCycleOptionsDto = {
  employees: [
    { employeeId: IGING, name: "Iging DotTech", position: "Software Engineer", department: "Engineering", employeeCode: "EMP-001", managerId: null, managerName: null },
    { employeeId: ADMIN, name: "System Administrator", position: null, department: "Engineering", employeeCode: "EMP-001", managerId: null, managerName: null },
  ],
  kpiTemplates: [],
  behavioralTemplates: [],
  hrEvaluators: [{ employeeId: HR, name: "Lebron James" }],
};

function readyDraft(overrides: Partial<CycleDraft> = {}): CycleDraft {
  return {
    name: "  CY2027-Q1  ",
    reviewType: "standard",
    evaluationStart: "2027-01-01",
    evaluationEnd: "2027-03-31",
    assessmentStart: "2027-04-01",
    verificationDeadline: "2027-04-10",
    accomplishmentDeadline: "",
    description: "",
    usesGoals: true,
    usesBehavioral: true,
    employeeVisible: true,
    managerVisible: true,
    earlierAnswersVisible: true,
    participantIds: [IGING, ADMIN],
    peerChoices: {},
    anonymityMinimum: "3",
    kpiChoices: { [IGING]: KPI_CHOICE },
    behavioralDefaultId: BEH_DEFAULT,
    behavioralOverrides: { "Software Engineer": BEH_ENGINEER },
    stages: [
      { perspective: "self", deadline: "2027-04-07", evaluatorId: "" },
      { perspective: "manager", deadline: "2027-04-14", evaluatorId: "" },
      { perspective: "hr", deadline: "2027-04-21", evaluatorId: HR },
    ],
    ...overrides,
  };
}

describe("toCycleRequest", () => {
  it("builds the body that the API takes: instants in Manila, 50/50 weights, and one template choice per participant", () => {
    const result = toCycleRequest(readyDraft(), OPTIONS);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      name: "CY2027-Q1",
      reviewType: "standard",
      evaluationStart: "2027-01-01",
      evaluationEnd: "2027-03-31",
      assessmentStart: "2027-04-01T00:00:00+08:00",
      verificationDeadline: "2027-04-10T23:59:59+08:00",
      accomplishmentDeadline: null,
      description: "",
      goalsWeight: 0.5,
      behavioralWeight: 0.5,
      anonymityThreshold: null,
    });
    expect(result.data?.stages).toEqual([
      { perspective: "self", evaluatorRole: "employee", deadline: "2027-04-07T23:59:59+08:00" },
      { perspective: "manager", evaluatorRole: "manager", deadline: "2027-04-14T23:59:59+08:00" },
      { perspective: "hr", evaluatorRole: "hr_officer", evaluatorId: HR, deadline: "2027-04-21T23:59:59+08:00" },
    ]);
  });

  it("expands the behavioral default and the position overrides, and sends a KPI template only when HR chose one", () => {
    const result = toCycleRequest(readyDraft(), OPTIONS);

    expect(result.data?.participants).toEqual([
      { employeeId: IGING, kpiTemplateId: KPI_CHOICE, behavioralTemplateId: BEH_ENGINEER, peerIds: [] },
      { employeeId: ADMIN, behavioralTemplateId: BEH_DEFAULT, peerIds: [] },
    ]);
  });

  it("leaves the behavioral template out when none is chosen, and sends a draft with no participant", () => {
    const result = toCycleRequest(readyDraft({ participantIds: [IGING], kpiChoices: {}, behavioralDefaultId: "", behavioralOverrides: {} }), OPTIONS);

    expect(result.data?.participants).toEqual([{ employeeId: IGING, peerIds: [] }]);
    expect(toCycleRequest(readyDraft({ participantIds: [] }), OPTIONS).data?.participants).toEqual([]);
  });

  it("reports the first problem with its path, so the wizard can open the step that owns it", () => {
    const blankName = toCycleRequest(readyDraft({ name: "   " }), OPTIONS);
    expect(blankName.success).toBe(false);
    expect(blankName.error?.issues[0]?.path).toEqual(["name"]);

    const noDeadline = toCycleRequest(
      readyDraft({ stages: [{ perspective: "self", deadline: "", evaluatorId: "" }] }),
      OPTIONS,
    );
    expect(noDeadline.error?.issues[0]?.path).toEqual(["stages", 0, "deadline"]);
  });

  it("refuses a period that ends before it starts, and deadlines out of order", () => {
    expect(toCycleRequest(readyDraft({ evaluationEnd: "2026-12-31" }), OPTIONS).error?.issues[0]?.path).toEqual(["evaluationEnd"]);
    const swapped = readyDraft();
    swapped.stages[1]!.deadline = "2027-04-07";
    expect(toCycleRequest(swapped, OPTIONS).error?.issues[0]?.path).toEqual(["stages", 1, "deadline"]);
  });
});

describe("draftFromDetail", () => {
  const CYCLE = "7d47ea3a-ec86-4120-abde-c13b7b14dbf4";
  const MARIA = "00000000-0000-0000-0000-000000000022";
  const KPI_ENGINEER = "3f2504e0-4f89-41d3-9a0c-0305e82c3320";
  const KPI_MANAGER = "3f2504e0-4f89-41d3-9a0c-0305e82c3321";
  const BEH_OTHER = "3f2504e0-4f89-41d3-9a0c-0305e82c3312";

  const options: ReviewCycleOptionsDto = {
    employees: [
      { employeeId: IGING, name: "Iging DotTech", position: "Software Engineer", department: "Engineering", employeeCode: "EMP-001", managerId: null, managerName: null },
      { employeeId: MARIA, name: "Maria Santos", position: "Engineering Manager", department: "Engineering", employeeCode: "EMP-001", managerId: null, managerName: null },
      { employeeId: ADMIN, name: "System Administrator", position: null, department: "Engineering", employeeCode: "EMP-001", managerId: null, managerName: null },
    ],
    kpiTemplates: [
      { templateId: KPI_ENGINEER, name: "Engineer goals", position: "Software Engineer", version: 1 },
      { templateId: KPI_MANAGER, name: "Manager goals", position: "Engineering Manager", version: 1 },
    ],
    behavioralTemplates: [
      { templateId: BEH_DEFAULT, name: "Quarterly review", version: 1 },
      { templateId: BEH_OTHER, name: "Peer feedback", version: 1 },
    ],
    hrEvaluators: [{ employeeId: HR, name: "Lebron James" }],
  };

  function person(employeeId: string, change: Partial<ReviewCycleDetailDto["participants"][number]> = {}): ReviewCycleDetailDto["participants"][number] {
    return {
      participantId: `00000000-0000-0000-0000-00000000${employeeId.slice(-4)}`,
      cycleId: CYCLE,
      employeeId,
      frozenPosition: null,
      kpiVersionId: null,
      behavioralVersionId: null,
      kpiTemplateId: null,
      behavioralTemplateId: BEH_DEFAULT,
      peerIds: [],
      ...change,
    };
  }

  function detail(participants: ReviewCycleDetailDto["participants"]): ReviewCycleDetailDto {
    return {
      cycleId: CYCLE,
      company: "Mayon Consolidated Inc.",
      name: "ZZ wizard check",
      reviewType: "360",
      state: "draft",
      evaluationStart: "2027-01-01",
      evaluationEnd: "2027-03-31",
      assessmentStart: "2027-03-31T16:00:00.000Z",
      verificationDeadline: "2027-04-10T15:59:59.000Z",
      accomplishmentDeadline: null,
      description: null,
      activationDate: null,
      goalsWeight: 0.5,
      behavioralWeight: 0.5,
      anonymityThreshold: null,
      cancelledReason: null,
      finalizedAt: null,
      releasedAt: null,
      employeeVisible: true,
      managerVisible: true,
      earlierAnswersVisible: true,
      idempotencyKey: null,
      createdAt: "2026-11-25T06:00:00.000Z",
      updatedAt: "2026-11-25T06:00:00.000Z",
      stages: [
        { stageId: "00000000-0000-0000-0000-000000000161", cycleId: CYCLE, perspective: "self", evaluatorRole: "employee", evaluatorId: null, sortOrder: 1, deadline: "2027-04-07T15:59:59.000Z" },
        { stageId: "00000000-0000-0000-0000-000000000162", cycleId: CYCLE, perspective: "manager", evaluatorRole: "manager", evaluatorId: null, sortOrder: 2, deadline: "2027-04-14T15:59:59.000Z" },
        { stageId: "00000000-0000-0000-0000-000000000163", cycleId: CYCLE, perspective: "hr", evaluatorRole: "hr_officer", evaluatorId: HR, sortOrder: 3, deadline: "2027-04-21T15:59:59.000Z" },
      ],
      participants,
    };
  }

  it("turns the stored cycle back into what the user typed: the same days, the same type, the same name", () => {
    const draft = draftFromDetail(detail([person(IGING)]), options);

    expect(draft).toMatchObject({
      name: "ZZ wizard check",
      reviewType: "360",
      evaluationStart: "2027-01-01",
      evaluationEnd: "2027-03-31",
      assessmentStart: "2027-04-01",
      verificationDeadline: "2027-04-10",
      accomplishmentDeadline: "",
      description: "",
    });
    expect(draft.stages).toEqual([
      { perspective: "self", deadline: "2027-04-07", evaluatorId: "" },
      { perspective: "manager", deadline: "2027-04-14", evaluatorId: "" },
      { perspective: "hr", deadline: "2027-04-21", evaluatorId: HR },
    ]);
  });

  it("keeps who reads the results through an edit: from the stored cycle into the request (Cyc-001)", () => {
    const stored = { ...detail([person(IGING, { kpiTemplateId: KPI_ENGINEER })]), employeeVisible: false, earlierAnswersVisible: false };

    const draft = draftFromDetail(stored, options);

    expect(draft).toMatchObject({ employeeVisible: false, managerVisible: true, earlierAnswersVisible: false });
    expect(toCycleRequest(draft, options).data).toMatchObject({ employeeVisible: false, managerVisible: true, earlierAnswersVisible: false });
  });

  it("builds a draft that the request builder sends back as the same cycle: the save of an edit changes nothing by itself", () => {
    const stored = detail([person(IGING, { kpiTemplateId: KPI_ENGINEER })]);

    const sent = toCycleRequest(draftFromDetail(stored, options), options);

    expect(sent.success).toBe(true);
    expect(sent.data).toMatchObject({
      assessmentStart: "2027-04-01T00:00:00+08:00",
      verificationDeadline: "2027-04-10T23:59:59+08:00",
      accomplishmentDeadline: null,
      description: "",
      participants: [{ employeeId: IGING, kpiTemplateId: KPI_ENGINEER, behavioralTemplateId: BEH_DEFAULT, peerIds: [] }],
    });
  });

  it("lists the participants in order, and keeps a KPI template that is still offered for the position", () => {
    const draft = draftFromDetail(
      detail([person(IGING, { kpiTemplateId: KPI_ENGINEER }), person(MARIA, { kpiTemplateId: KPI_MANAGER })]),
      options,
    );

    expect(draft.participantIds).toEqual([IGING, MARIA]);
    expect(draft.kpiChoices).toEqual({ [IGING]: KPI_ENGINEER, [MARIA]: KPI_MANAGER });
  });

  it("drops a template id that is no longer offered: the archived template would answer 400 and block the draft", () => {
    const draft = draftFromDetail(
      detail([person(IGING, { kpiTemplateId: "3f2504e0-4f89-41d3-9a0c-0305e82c33ff", behavioralTemplateId: "3f2504e0-4f89-41d3-9a0c-0305e82c33fe" })]),
      options,
    );

    expect(draft.kpiChoices).toEqual({});
    expect(draft.behavioralDefaultId).toBe("");
    expect(draft.behavioralOverrides).toEqual({});
  });

  it("drops a KPI template that no longer matches the position of the employee", () => {
    const draft = draftFromDetail(detail([person(IGING, { kpiTemplateId: KPI_MANAGER })]), options);

    expect(draft.kpiChoices).toEqual({});
  });

  it("rebuilds the default as the most used behavioral template, and an override for each position that differs", () => {
    const draft = draftFromDetail(
      detail([
        person(IGING, { behavioralTemplateId: BEH_OTHER }),
        person(MARIA, { behavioralTemplateId: BEH_DEFAULT }),
        person(ADMIN, { behavioralTemplateId: BEH_DEFAULT }),
      ]),
      options,
    );

    expect(draft.behavioralDefaultId).toBe(BEH_DEFAULT);
    expect(draft.behavioralOverrides).toEqual({ "Software Engineer": BEH_OTHER });
  });

  it("drops a participant that the options no longer list: an employee who left would answer 400 on the save", () => {
    const draft = draftFromDetail(detail([person(IGING), person("00000000-0000-0000-0000-0000000009ff")]), options);

    expect(draft.participantIds).toEqual([IGING]);
  });

  it("gives the same draft for the same detail every time", () => {
    const stored = detail([person(IGING), person(MARIA)]);

    expect(draftFromDetail(stored, options)).toEqual(draftFromDetail(stored, options));
  });
});

describe("the description and the accomplishment deadline", () => {
  const options: ReviewCycleOptionsDto = { employees: [], kpiTemplates: [], behavioralTemplates: [], hrEvaluators: [] };
  const complete = (change: Partial<CycleDraft> = {}): CycleDraft => ({
    ...newCycleDraft(),
    name: "CY2027-Q1",
    evaluationStart: "2027-01-01",
    evaluationEnd: "2027-03-31",
    assessmentStart: "2027-04-01",
    verificationDeadline: "2027-04-10",
    accomplishmentDeadline: "",
    description: "",
    stages: [{ perspective: "self", deadline: "2027-04-07", evaluatorId: "" }],
    ...change,
  });

  it("starts empty", () => {
    expect(newCycleDraft()).toMatchObject({ description: "", accomplishmentDeadline: "" });
  });

  it("sends the deadline as the end of its day, and none when no day is typed", () => {
    const sent = toCycleRequest(complete({ description: " Yearly ", accomplishmentDeadline: "2027-04-09" }), options);
    expect(sent.data).toMatchObject({ description: "Yearly", accomplishmentDeadline: "2027-04-09T23:59:59+08:00" });
    expect(toCycleRequest(complete(), options).data).toMatchObject({ description: "", accomplishmentDeadline: null });
  });

  it("opens the details step for a deadline inside the period", () => {
    const sent = toCycleRequest(complete({ accomplishmentDeadline: "2027-03-31" }), options);

    expect(sent.error?.issues.map((issue) => stepOfPath(issue.path))).toEqual(["details"]);
  });

  it("keeps both when a saved draft is edited again", () => {
    const detail = {
      name: "CY2027-Q1",
      reviewType: "standard",
      evaluationStart: "2027-01-01",
      evaluationEnd: "2027-03-31",
      assessmentStart: "2027-03-31T16:00:00.000Z",
      verificationDeadline: "2027-04-10T15:59:59.000Z",
      accomplishmentDeadline: "2027-04-08T15:59:59.000Z",
      description: "Yearly",
      stages: [],
      participants: [],
    } as unknown as ReviewCycleDetailDto;

    expect(draftFromDetail(detail, options)).toMatchObject({ description: "Yearly", accomplishmentDeadline: "2027-04-08" });
    expect(draftFromDetail({ ...detail, description: null, accomplishmentDeadline: null }, options)).toMatchObject({
      description: "",
      accomplishmentDeadline: "",
    });
  });
});

describe("the components of a cycle", () => {
  const options: ReviewCycleOptionsDto = { employees: [], kpiTemplates: [], behavioralTemplates: [], hrEvaluators: [] };
  const IDS = { one: "00000000-0000-0000-0000-000000000001", kpi: "00000000-0000-0000-0000-000000000041", beh: "00000000-0000-0000-0000-000000000100" };
  const complete = (change: Partial<CycleDraft> = {}): CycleDraft => ({
    ...newCycleDraft(),
    name: "CY2027-Q1",
    evaluationStart: "2027-01-01",
    evaluationEnd: "2027-03-31",
    assessmentStart: "2027-04-01",
    verificationDeadline: "2027-04-10",
    stages: [{ perspective: "self", deadline: "2027-04-07", evaluatorId: "" }],
    participantIds: [IDS.one],
    kpiChoices: { [IDS.one]: IDS.kpi },
    behavioralDefaultId: IDS.beh,
    ...change,
  });

  it("starts with both", () => {
    expect(newCycleDraft()).toMatchObject({ usesGoals: true, usesBehavioral: true });
  });

  it.each([
    ["both", {}, [0.5, 0.5], { employeeId: IDS.one, kpiTemplateId: IDS.kpi, behavioralTemplateId: IDS.beh }],
    ["goals only", { usesBehavioral: false }, [1, 0], { employeeId: IDS.one, kpiTemplateId: IDS.kpi }],
    ["behavior only", { usesGoals: false }, [0, 1], { employeeId: IDS.one, behavioralTemplateId: IDS.beh }],
  ])("weighs and sends the templates of %s", (_label, change, [goalsWeight, behavioralWeight], sent) => {
    const body = toCycleRequest(complete(change), options).data;

    expect(body).toMatchObject({ goalsWeight, behavioralWeight });
    expect(body?.participants).toEqual([{ ...sent, peerIds: [] }]);
  });

  it("refuses a cycle with no component", () => {
    expect(toCycleRequest(complete({ usesGoals: false, usesBehavioral: false }), options).success).toBe(false);
  });

  it("reads them back from the weights of a saved cycle", () => {
    const detail = {
      evaluationStart: "2027-01-01",
      evaluationEnd: "2027-03-31",
      goalsWeight: 0,
      behavioralWeight: 1,
      stages: [],
      participants: [],
    } as unknown as ReviewCycleDetailDto;

    expect(draftFromDetail(detail, options)).toMatchObject({ usesGoals: false, usesBehavioral: true });
  });
});

describe("peer and upward stages", () => {
  const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
  const options: ReviewCycleOptionsDto = {
    employees: [1, 2, 3].map((n) => ({ employeeId: id(n), name: `P${n}`, position: null, department: null, employeeCode: null, managerId: null, managerName: null })),
    kpiTemplates: [],
    behavioralTemplates: [],
    hrEvaluators: [],
  } as unknown as ReviewCycleOptionsDto;
  const anonymous = (change: Partial<CycleDraft> = {}): CycleDraft => ({
    ...newCycleDraft(),
    name: "360",
    evaluationStart: "2027-01-01",
    evaluationEnd: "2027-03-31",
    assessmentStart: "2027-04-01",
    verificationDeadline: "2027-04-10",
    participantIds: [id(1)],
    peerChoices: { [id(1)]: [id(2), id(3)] },
    stages: [
      { perspective: "peer", deadline: "2027-04-07", evaluatorId: "" },
      { perspective: "upward", deadline: "2027-04-14", evaluatorId: "" },
    ],
    ...change,
  });

  it("starts with no peer and a minimum of 3", () => {
    expect(newCycleDraft()).toMatchObject({ peerChoices: {}, anonymityMinimum: "3" });
  });

  it("sends the peers, the minimum, and the role of each stage", () => {
    const body = toCycleRequest(anonymous({ anonymityMinimum: "2" }), options).data;

    expect(body?.anonymityThreshold).toBe(2);
    expect(body?.participants[0]).toMatchObject({ peerIds: [id(2), id(3)] });
    expect(body?.stages.map((stage) => stage.evaluatorRole)).toEqual(["peer", "direct_report"]);
  });

  it("sends neither without such a stage", () => {
    const body = toCycleRequest(anonymous({ stages: [{ perspective: "self", deadline: "2027-04-07", evaluatorId: "" }] }), options).data;

    expect(body?.anonymityThreshold).toBeNull();
    expect(body?.participants[0]?.peerIds).toEqual([]);
  });

  it("reads them back from a saved draft, without a peer who left", () => {
    const detail = {
      anonymityThreshold: 4,
      goalsWeight: 0.5,
      behavioralWeight: 0.5,
      stages: [{ perspective: "peer", sortOrder: 1, deadline: "2027-04-07T15:59:59.000Z", evaluatorId: null }],
      participants: [{ employeeId: id(1), peerIds: [id(2), id(99)], kpiTemplateId: null, behavioralTemplateId: null }],
    } as unknown as ReviewCycleDetailDto;

    expect(draftFromDetail(detail, options)).toMatchObject({
      anonymityMinimum: "4",
      peerChoices: { [id(1)]: [id(2)] },
      stages: [{ perspective: "peer" }],
    });
  });
});
