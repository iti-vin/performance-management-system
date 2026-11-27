import { z } from "zod";
import {
  dateOnlySchema,
  decimalSchema,
  idSchema,
  timestampSchema,
} from "../common.js";
import { accomplishmentStatusSchema } from "../domain/accomplishment-status.enum.js";
import { cycleStatusSchema } from "../domain/cycle-status.enum.js";
import { goalTemplateDetailResponseSchema } from "./goal-template.schema.js";

/** One row of GET /accomplishments: a record that the caller may see. */
export const accomplishmentListRowSchema = z.object({
  accomplishmentId: idSchema,
  cycleId: idSchema,
  cycleName: z.string(),
  cycleState: cycleStatusSchema,
  employeeName: z.string(),
  status: accomplishmentStatusSchema,
  evaluationEnd: dateOnlySchema,
  verificationDeadline: timestampSchema.nullable(),
  /** The first submission closes then (Acc-006). Null when the cycle has none. */
  accomplishmentDeadline: timestampSchema.nullable(),
  /** The caller is the employee who reports. */
  isOwn: z.boolean(),
  /** The caller may verify or return it now. */
  canDecide: z.boolean(),
  /** The position that the cycle froze for the employee. Null when none was frozen. */
  position: z.string().nullable(),
  /** The name of the frozen KPI template today. Null for no template, or an older one with no name. */
  kpiTemplateName: z.string().nullable(),
  /** The version of the template that the cycle froze. */
  kpiTemplateVersion: z.number().int().nullable(),
});
export type AccomplishmentListRowDto = z.infer<
  typeof accomplishmentListRowSchema
>;

export const accomplishmentListSchema = z.array(accomplishmentListRowSchema);

const actualSchema = z.object({
  indicatorId: idSchema,
  actualValue: decimalSchema.nullable(),
  /** The note of the employee on this indicator. */
  remarks: z.string().nullable(),
});

/**
 * GET /accomplishments/:id: the record, the indicators of the KPI version that the cycle
 * froze (PRD Acc-001), the reported values, and the history of the submissions.
 */
export const accomplishmentDetailSchema = accomplishmentListRowSchema
  .omit({ isOwn: true })
  .extend({
    participantId: idSchema,
    evaluationStart: dateOnlySchema,
    remarks: z.string().nullable(),
    returnReason: z.string().nullable(),
    submittedAt: timestampSchema.nullable(),
    verifiedAt: timestampSchema.nullable(),
    /** The caller may save values now. */
    canEdit: z.boolean(),
    /** The caller may submit now: `canEdit`, and the evaluation period has ended. */
    canSubmit: z.boolean(),
    /** Why an action that the caller might expect is not available. Null when nothing holds them. */
    notice: z.string().nullable(),
    kpi: goalTemplateDetailResponseSchema.pick({
      indicators: true,
      scales: true,
      matrixRows: true,
      matrixColumns: true,
      matrixCells: true,
    }),
    actuals: z.array(actualSchema),
    versions: z.array(
      z.object({
        version: z.number().int().min(1),
        actedAt: timestampSchema.nullable(),
        actorName: z.string(),
        remarks: z.string().nullable(),
        correctionReason: z.string().nullable(),
        actuals: z.array(actualSchema),
      }),
    ),
  });
export type AccomplishmentDetailDto = z.infer<
  typeof accomplishmentDetailSchema
>;
