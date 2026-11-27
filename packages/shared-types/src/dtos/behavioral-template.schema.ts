import { z } from "zod";
import { behavioralQuestionTypeSchema } from "../domain/behavioral-question-type.enum.js";
import { behavioralReviewTypeSchema } from "../domain/behavioral-review-type.enum.js";
import { behavioralTemplateCategorySchema } from "../domain/behavioral-template-category.enum.js";
import { idSchema, requiredTextSchema } from "../common.js";
import {
  behavioralChoiceOptionsRowSchema,
  behavioralQuestionsRowSchema,
  behavioralSectionsRowSchema,
  behavioralTemplateVersionsRowSchema,
  behavioralTemplatesRowSchema,
} from "../rows/index.js";

export const behavioralTemplateDtoSchema = behavioralTemplatesRowSchema;
export type BehavioralTemplateDto = z.infer<typeof behavioralTemplateDtoSchema>;

export const behavioralQuestionDtoSchema = behavioralQuestionsRowSchema.extend({
  /** Only for the multiple_choice question type. */
  choiceOptions: z.array(behavioralChoiceOptionsRowSchema).optional(),
});
export type BehavioralQuestionDto = z.infer<typeof behavioralQuestionDtoSchema>;

export const behavioralSectionDtoSchema = behavioralSectionsRowSchema.extend({
  questions: z.array(behavioralQuestionDtoSchema).optional(),
});
export type BehavioralSectionDto = z.infer<typeof behavioralSectionDtoSchema>;

export const behavioralTemplateVersionDtoSchema =
  behavioralTemplateVersionsRowSchema.extend({
    /** ASSUMPTION: the API embeds sections, questions, and choices on a version. */
    sections: z.array(behavioralSectionDtoSchema).optional(),
  });
export type BehavioralTemplateVersionDto = z.infer<
  typeof behavioralTemplateVersionDtoSchema
>;

/** One answer option of a multiple choice question: the body the backend DTO takes. */
const choiceOptionRequestSchema = z.object({
  label: requiredTextSchema.max(200),
});

const questionRequestSchema = z
  .object({
    prompt: requiredTextSchema.max(2000),
    questionType: behavioralQuestionTypeSchema,
    isRequired: z.boolean(),
    /** Read for a rating_scale question only: the output is null for every other type. */
    allowNotObserved: z.boolean().nullable().default(null),
    /** Read for a multiple_choice question only: the output has no such key for another type. */
    choiceOptions: z.array(choiceOptionRequestSchema).default([]),
  })
  .superRefine((question, context) => {
    if (question.questionType !== "multiple_choice") return;
    const labels = question.choiceOptions.map((option) =>
      option.label.toLowerCase(),
    );
    if (labels.length < 2 || new Set(labels).size !== labels.length) {
      context.addIssue({
        code: "custom",
        path: ["choiceOptions"],
        message: "Add at least two different options.",
      });
    }
  })
  .transform(({ choiceOptions, allowNotObserved, ...question }) => ({
    ...question,
    allowNotObserved:
      question.questionType === "rating_scale"
        ? (allowNotObserved ?? false)
        : null,
    ...(question.questionType === "multiple_choice" ? { choiceOptions } : {}),
  }));

/**
 * POST behavioral-assessment/create and POST behavioral-assessment/:id/update: the
 * exact body of the backend DTOs (sections, questions, and choice options). The
 * backend forbids any other key. The name, description, category, and review type
 * belong to the template; the sections hold the questions.
 */
export const saveBehavioralTemplateRequestSchema = z.object({
  name: requiredTextSchema.max(120),
  description: z.string().trim().max(2000).default(""),
  category: behavioralTemplateCategorySchema,
  reviewType: behavioralReviewTypeSchema,
  sections: z
    .array(
      z.object({
        title: requiredTextSchema.max(300),
        questions: z
          .array(questionRequestSchema)
          .min(1, "Add at least one question."),
      }),
    )
    .min(1, "Add at least one section."),
});
export type SaveBehavioralTemplateRequestDto = z.infer<
  typeof saveBehavioralTemplateRequestSchema
>;

/** GET behavioral-assessment: every template row, with the number of questions of its current version. */
export const behavioralTemplateListResponseSchema = z.array(
  behavioralTemplateDtoSchema.extend({
    questionCount: z.number().int().min(0),
  }),
);
export type BehavioralTemplateListResponseDto = z.infer<
  typeof behavioralTemplateListResponseSchema
>;

/**
 * GET behavioral-assessment/:id, and the answer to create, update, and publish.
 * The API names the question flag `allowNotObserved`, not `canMarkNotObserved`
 * as the generated row does, and it sends the questions and options as flat
 * lists, not nested.
 */
export const behavioralTemplateTreeResponseSchema = z.object({
  template: behavioralTemplateDtoSchema,
  version: behavioralTemplateVersionsRowSchema.nullable(),
  sections: z.array(behavioralSectionsRowSchema),
  questions: z.array(
    z.object({
      questionId: idSchema,
      sectionId: idSchema,
      prompt: z.string(),
      questionType: behavioralQuestionTypeSchema,
      isRequired: z.boolean(),
      allowNotObserved: z.boolean().nullable(),
      sortOrder: z.number().int(),
    }),
  ),
  options: z.array(behavioralChoiceOptionsRowSchema),
});
export type BehavioralTemplateTreeResponseDto = z.infer<
  typeof behavioralTemplateTreeResponseSchema
>;
