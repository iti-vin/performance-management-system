"use server";

import { accomplishmentDecisionRequestSchema, idSchema, reportIndicatorActualsRequestSchema } from "@pms/shared-types";
import { refresh } from "next/cache";
import type { ZodType } from "zod";

import {
  postAccomplishmentDecision,
  postAccomplishmentSubmission,
  putAccomplishmentActuals,
} from "@/features/position-goals/api/accomplishment-requests";
import { sendForRefusal, type Refusal, type RequestWords } from "@/services/api-send";
import type { FormActionResult } from "@/types/form-action";

/** A field of the API that names one indicator: `actuals.<indicatorId>`. */
const INDICATOR_FIELD = /^actuals\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const TEXT_FIELDS = new Set(["remarks", "correctionReason", "reason"]);

const NOT_FOUND = "This record was not found.";
const words = (couldNot: string): RequestWords => ({
  okStatus: 200,
  logInAgain: "Your session ended. Log in again.",
  couldNot,
  byStatus: { 404: NOT_FOUND, 409: "This record can no longer be changed. Reload the page." },
});

const failed = (message: string): FormActionResult => ({ message, fieldErrors: {} });

/** The problems that name a field of the form go to that field. Everything else stays in the message. */
function toResult({ text, error }: Refusal): FormActionResult {
  if (!error) return failed(text);
  const fieldErrors: Record<string, string> = {};
  const rest: string[] = [];
  for (const { field, message } of error.details) {
    const key = INDICATOR_FIELD.exec(field ?? "")?.[1] ?? (TEXT_FIELDS.has(field ?? "") ? field : undefined);
    if (key) fieldErrors[key] = message;
    else rest.push(message);
  }
  return { message: [error.message, ...rest].join(" "), fieldErrors };
}

interface Write<Body> {
  schema: ZodType<Body>;
  request: (accessToken: string, accomplishmentId: string, body: Body) => ReturnType<typeof putAccomplishmentActuals>;
  couldNot: string;
}

/** Checks the id and the body again here: the check of the form is a convenience. */
async function write<Body>(accomplishmentId: string, input: unknown, { schema, request, couldNot }: Write<Body>): Promise<FormActionResult> {
  if (!idSchema.safeParse(accomplishmentId).success) return failed(NOT_FOUND);
  const body = schema.safeParse(input);
  if (!body.success) return failed("Check what you entered and try again.");

  const refusal = await sendForRefusal((accessToken) => request(accessToken, accomplishmentId, body.data), words(couldNot));
  if (refusal) return toResult(refusal);

  // The page reads the record again: its status, its values, and its history.
  refresh();
  return { message: null, fieldErrors: {} };
}

export async function saveAccomplishment(accomplishmentId: string, input: unknown): Promise<FormActionResult> {
  return write(accomplishmentId, input, {
    schema: reportIndicatorActualsRequestSchema,
    request: putAccomplishmentActuals,
    couldNot: "Your report could not be saved. Try again.",
  });
}

export async function submitAccomplishment(accomplishmentId: string, input: unknown): Promise<FormActionResult> {
  return write(accomplishmentId, input, {
    schema: reportIndicatorActualsRequestSchema,
    request: postAccomplishmentSubmission,
    couldNot: "The report could not be submitted. Try again.",
  });
}

export async function decideAccomplishment(accomplishmentId: string, input: unknown): Promise<FormActionResult> {
  return write(accomplishmentId, input, {
    schema: accomplishmentDecisionRequestSchema,
    request: postAccomplishmentDecision,
    couldNot: "Your decision could not be saved. Try again.",
  });
}
