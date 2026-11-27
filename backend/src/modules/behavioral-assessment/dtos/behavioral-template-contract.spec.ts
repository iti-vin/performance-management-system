import { saveBehavioralTemplateRequestSchema } from "@pms/shared-types";
import { plainToInstance } from "class-transformer";
import { validate, type ValidationError } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateBehavioralTemplateDto } from "./create-behavioral-template.dto.js";
import { SectionDto } from "./behavioral-section.dto.js";
import { UpdateBehavioralTemplateDto } from "./update-behavioral-template.dto.js";

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
  name: "Quarterly Review",
  description: "Reflect on observable behaviors.",
  category: "general_performance",
  reviewType: "self",
  sections: [
    {
      title: "Leadership",
      questions: [
        { prompt: "Meets deadlines?", questionType: "rating_scale", isRequired: true, allowNotObserved: true, choiceOptions: [] },
        { prompt: "Comments", questionType: "paragraph", isRequired: false, allowNotObserved: null, choiceOptions: [] },
        {
          prompt: "Pick one",
          questionType: "multiple_choice",
          isRequired: true,
          allowNotObserved: null,
          choiceOptions: [{ label: "Yes" }, { label: "No" }],
        },
      ],
    },
  ],
};

describe("behavioral template request contract", () => {
  it.each([
    ["create", CreateBehavioralTemplateDto],
    ["update", UpdateBehavioralTemplateDto],
  ])("accepts the body the shared save schema produces on %s", async (_route, type) => {
    const body = saveBehavioralTemplateRequestSchema.parse(draft);

    expect(await errorPaths(type, body)).toEqual([]);
  });

  it("sends allowNotObserved for rating questions only, and choice options for multiple choice only", () => {
    const [rating, paragraph, choice] = saveBehavioralTemplateRequestSchema.parse(draft).sections[0]!.questions;

    expect(rating).toMatchObject({ allowNotObserved: true });
    expect("choiceOptions" in rating!).toBe(false);
    expect(paragraph).toMatchObject({ allowNotObserved: null });
    expect("choiceOptions" in paragraph!).toBe(false);
    expect(choice).toMatchObject({ allowNotObserved: null, choiceOptions: [{ label: "Yes" }, { label: "No" }] });
  });

  it.each([
    ["one option", [{ label: "Yes" }]],
    ["two equal options", [{ label: "Yes" }, { label: " yes " }]],
    ["no options", []],
  ])("refuses a multiple choice question with %s", (_label, choiceOptions) => {
    const body = {
      name: "Quarterly Review",
      category: "others",
      reviewType: "others",
      sections: [
        {
          title: "S",
          questions: [{ prompt: "Pick", questionType: "multiple_choice", isRequired: true, allowNotObserved: null, choiceOptions }],
        },
      ],
    };

    expect(saveBehavioralTemplateRequestSchema.safeParse(body).success).toBe(false);
  });

  it.each([
    ["create", CreateBehavioralTemplateDto],
    ["update", UpdateBehavioralTemplateDto],
  ])("refuses a blank option label on %s", async (_route, type) => {
    const question = { prompt: "Pick", questionType: "multiple_choice", choiceOptions: [{ label: "Yes" }, { label: "   " }] };
    const body = { ...draft, sections: [{ title: "S", questions: [question] }] };

    expect(await errorPaths(type, body)).toContain("sections.0.questions.0.choiceOptions.1.label");
  });

  it("refuses a section with no question, and a template with no section", () => {
    expect(saveBehavioralTemplateRequestSchema.safeParse({ sections: [] }).success).toBe(false);
    expect(saveBehavioralTemplateRequestSchema.safeParse({ sections: [{ title: "S", questions: [] }] }).success).toBe(false);
  });
});

describe('section and question text', () => {
  it('refuses a title and a prompt with spaces only (Tpl-B-003)', async () => {
    const errors = await validate(plainToInstance(SectionDto, { title: '  ', questions: [{ prompt: '  ', questionType: 'short_answer' }] }));

    expect(errors.map((error) => error.property)).toEqual(['title', 'questions']);
  });
});
