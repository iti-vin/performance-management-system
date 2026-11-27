import type { AccomplishmentDetailDto, AccomplishmentListRowDto } from "@pms/shared-types";

export const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

export const ACCOMPLISHMENT_ID = guid(171);
export const SPRINT = guid(61);
export const DEFECTS = guid(62);

export const accomplishmentRow = (change: Partial<AccomplishmentListRowDto> = {}): AccomplishmentListRowDto => ({
  accomplishmentId: ACCOMPLISHMENT_ID,
  cycleId: guid(141),
  cycleName: "ZZ demo",
  cycleState: "active",
  employeeName: "Iging UserDotTech",
  status: "draft",
  evaluationEnd: "2026-11-25",
  verificationDeadline: "2026-12-31T15:59:59.000Z",
  accomplishmentDeadline: null,
  isOwn: true,
  canDecide: false,
  position: "Software Engineer",
  kpiTemplateName: "Engineer goals",
  kpiTemplateVersion: 2,
  ...change,
});

const indicator = (indicatorId: string, name: string, change: Record<string, unknown> = {}) => ({
  indicatorId,
  versionId: guid(51),
  name,
  description: null,
  unit: "Percentage",
  target: 90,
  direction: "higher_is_better" as const,
  weight: 50,
  scoreTargetMet: 5,
  scoreBelowTarget: 3.5,
  matrixKind: "none" as const,
  matrixTitle: null,
  scaleBound: null,
  useForScoring: false,
  ...change,
});

/** Two indicators: the first with no matrix, the second with a scoring scale. */
export const accomplishmentKpi = (): AccomplishmentDetailDto["kpi"] => ({
  indicators: [
    indicator(SPRINT, "Sprint completion"),
    indicator(DEFECTS, "Escaped defects", {
      unit: "Count",
      target: 2,
      direction: "lower_is_better",
      matrixKind: "scale",
      matrixTitle: "Defect scale",
      scaleBound: "minimum",
      useForScoring: true,
    }),
  ],
  scales: [
    { scaleId: guid(91), indicatorId: DEFECTS, lowerBound: 0, upperBound: null, label: "Great", score: 5 },
    { scaleId: guid(92), indicatorId: DEFECTS, lowerBound: 3, upperBound: null, label: "Poor", score: 2 },
  ],
  matrixRows: [],
  matrixColumns: [],
  matrixCells: [],
});

/** An own draft whose evaluation period has ended: every action of the employee is open. */
export const accomplishmentDetail = (change: Partial<AccomplishmentDetailDto> = {}): AccomplishmentDetailDto => ({
  accomplishmentId: ACCOMPLISHMENT_ID,
  cycleId: guid(141),
  cycleName: "ZZ demo",
  cycleState: "active",
  employeeName: "Iging UserDotTech",
  status: "draft",
  evaluationStart: "2026-10-01",
  evaluationEnd: "2026-11-25",
  verificationDeadline: "2026-12-31T15:59:59.000Z",
  accomplishmentDeadline: null,
  participantId: guid(151),
  position: "Software Engineer",
  kpiTemplateName: "Engineer goals",
  kpiTemplateVersion: 2,
  remarks: null,
  returnReason: null,
  submittedAt: null,
  verifiedAt: null,
  canEdit: true,
  canSubmit: true,
  canDecide: false,
  notice: null,
  kpi: accomplishmentKpi(),
  actuals: [],
  versions: [],
  ...change,
});
