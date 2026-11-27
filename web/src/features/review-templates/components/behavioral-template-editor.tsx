"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, PlusIcon, XIcon } from "lucide-react";
import {
  BEHAVIORAL_QUESTION_TYPES,
  BEHAVIORAL_REVIEW_TYPES,
  BEHAVIORAL_TEMPLATE_CATEGORIES,
  type BehavioralQuestionType,
  type BehavioralReviewType,
  type BehavioralTemplateCategory,
} from "@pms/shared-types";

import { ErrorSummary, type ErrorSummaryItem } from "@/components/molecules/error-summary";
import { FormSelect } from "@/components/molecules/form-select";
import { UnsavedChangesDialog } from "@/components/molecules/unsaved-changes-dialog";
import { FormPageTemplate } from "@/components/templates/form-page-template";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import {
  BEHAVIORAL_QUESTION_TYPE_LABELS,
  BEHAVIORAL_REVIEW_TYPE_LABELS,
  BEHAVIORAL_TEMPLATE_CATEGORY_LABELS,
} from "@/constants/domain-labels";
import {
  DEFAULT_CHOICES,
  duplicateQuestion,
  moveItem,
  newBehavioralTemplate,
  newQuestion,
  newSection,
} from "@/features/review-templates/services/behavioral-template-state";

export interface Question {
  id: string;
  title: string;
  type: BehavioralQuestionType;
  /** Multiple choice only: one entry per answer option, in order. */
  choices: string[];
  required: boolean;
  /** Read for a rating scale question only. */
  notObserved: boolean;
}

export interface Section {
  id: string;
  name: string;
  questions: Question[];
}

export interface BehavioralTemplate {
  name: string;
  description: string;
  category: BehavioralTemplateCategory;
  reviewType: BehavioralReviewType;
  sections: Section[];
}

interface BehavioralTemplateEditorProps {
  backHref: string;
  initialTemplate?: BehavioralTemplate;
  onSave: (template: BehavioralTemplate, intent: "draft" | "publish" | "update") => void;
  /** A failure that the server reports after a save, shown in the error summary. */
  submitError?: string;
  /** Called when the user edits the template, so the caller can clear its message. */
  onEdit?: () => void;
  isPending?: boolean;
  /** "edit" opens an existing template: the back link goes to its details page. */
  mode?: "create" | "edit";
  /** A published template offers Update Template, which publishes its next version, and no draft buttons. */
  status?: "draft" | "published";
  /** The details page: the form as text, with no input, and the actions of `headerActions`. */
  readOnly?: boolean;
  headerActions?: ReactNode;
  /** Next to the back link: the status and the version on the details page. */
  statusLine?: ReactNode;
}

const NAME_ID = "template-name";
const SUBMIT_ERROR_ID = "behavioral-template-form";

const QUESTION_TYPES = BEHAVIORAL_QUESTION_TYPES.map((value) => ({
  value,
  label: BEHAVIORAL_QUESTION_TYPE_LABELS[value],
}));
const CATEGORIES = BEHAVIORAL_TEMPLATE_CATEGORIES.map((value) => ({
  value,
  label: BEHAVIORAL_TEMPLATE_CATEGORY_LABELS[value],
}));
const REVIEW_TYPES = BEHAVIORAL_REVIEW_TYPES.map((value) => ({
  value,
  label: BEHAVIORAL_REVIEW_TYPE_LABELS[value],
}));

const SCALE = ["1 Never", "2 Rarely", "3 Sometimes", "4 Often", "5 Always"];

function choiceList(choices: readonly string[]): string[] {
  return choices.map((choice) => choice.trim()).filter(Boolean);
}

/** Every problem of a template, in page order. The API checks the same rules again. */
function findErrors(template: BehavioralTemplate): ErrorSummaryItem[] {
  const errors: ErrorSummaryItem[] = [];
  if (!template.name.trim()) {
    errors.push({ fieldId: NAME_ID, message: "Enter a template name." });
  }
  if (!template.sections.length) {
    errors.push({ fieldId: NAME_ID, message: "Add a section and at least one question." });
  }
  for (const [index, section] of template.sections.entries()) {
    const label = section.name.trim() || `section ${index + 1}`;
    if (!section.name.trim()) {
      errors.push({ fieldId: `section-${section.id}`, message: `Section ${index + 1}: enter a title.` });
    }
    if (!section.questions.length) {
      errors.push({ fieldId: `section-${section.id}`, message: `Add at least one question to ${label}.` });
    }
    for (const question of section.questions) {
      if (!question.title.trim()) {
        errors.push({
          fieldId: `question-${question.id}`,
          message: `Enter a title for every question in ${label}.`,
        });
      }
      if (question.type === "multiple_choice") {
        const name = question.title.trim() || "A multiple choice question";
        const labels = choiceList(question.choices).map((choice) => choice.toLowerCase());
        if (labels.length !== question.choices.length) {
          errors.push({
            fieldId: `choice-${question.id}-0`,
            message: `${name}: fill in or remove the empty option.`,
          });
        }
        if (labels.length < 2 || new Set(labels).size !== labels.length) {
          errors.push({
            fieldId: `choice-${question.id}-0`,
            message: `${name}: enter at least two different options.`,
          });
        }
      }
    }
  }
  return errors;
}

export function BehavioralTemplateEditor({
  backHref,
  initialTemplate,
  onSave,
  submitError = "",
  onEdit,
  isPending = false,
  mode = "create",
  status = "draft",
  readOnly = false,
  headerActions,
  statusLine,
}: BehavioralTemplateEditorProps) {
  const router = useRouter();
  // The template the page opened with, kept so the page can start over from it.
  const [startingTemplate] = useState<BehavioralTemplate>(
    () => initialTemplate ?? newBehavioralTemplate(),
  );
  const [template, setTemplate] = useState<BehavioralTemplate>(startingTemplate);
  const [formErrors, setFormErrors] = useState<ErrorSummaryItem[]>([]);
  const [isPreviewing, setIsPreview] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const isPreview = readOnly || isPreviewing;
  useUnsavedChangesWarning(isDirty);

  // Next keeps the state of a page you leave, and shows it again when you return.
  // Start again from the saved template (or a blank one) whenever the user leaves.
  const startOver = useCallback(() => {
    setTemplate(startingTemplate);
    setFormErrors([]);
    setIsPreview(false);
    setIsDirty(false);
    setIsLeaving(false);
  }, [startingTemplate]);
  useEffect(() => startOver, [startOver]);

  // Stable between renders, so the summary takes focus once per error, not per keystroke.
  const errors = useMemo<ErrorSummaryItem[]>(
    () => [
      ...formErrors,
      ...(submitError ? [{ fieldId: SUBMIT_ERROR_ID, message: submitError }] : []),
    ],
    [formErrors, submitError],
  );

  function update(changes: Partial<BehavioralTemplate>) {
    setTemplate({ ...template, ...changes });
    setIsDirty(true);
    setFormErrors([]);
    onEdit?.();
  }

  function updateSection(id: string, changes: Partial<Section>) {
    update({
      sections: template.sections.map((section) =>
        section.id === id ? { ...section, ...changes } : section,
      ),
    });
  }

  function updateQuestion(sectionId: string, id: string, changes: Partial<Question>) {
    const section = template.sections.find((item) => item.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      questions: section.questions.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    });
  }

  const isPublished = status === "published";

  function save(intent: "draft" | "publish" | "update") {
    const found = findErrors(template);
    setFormErrors(found);
    if (!found.length) onSave(template, intent);
  }

  const nameError = formErrors.find(
    (error) => error.fieldId === NAME_ID && error.message === "Enter a template name.",
  );

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-pms-form gap-2 pt-4">
      <div className="mx-3 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={backHref}
          className="inline-flex min-h-pms-touch w-fit items-center gap-1 rounded-pms-control text-pms-label text-muted-foreground hover:underline"
          onClick={(event) => {
            if (!isDirty) return;
            event.preventDefault();
            setIsLeaving(true);
          }}
        >
          <ChevronLeftIcon aria-hidden="true" className="size-4" />
          {mode === "edit" ? "Back to Template Details" : "Back to Behavioral Assessment Templates"}
        </Link>
        {statusLine}
      </div>
      <FormPageTemplate
        title={
          readOnly
            ? "Behavioral Assessment Template Details"
            : isPreview
              ? "Behavioral Assessment Template Preview"
              : mode === "edit"
                ? "Edit Behavioral Assessment Template"
                : "Behavioral Assessment Template Builder"
        }
        description={
          readOnly
            ? "The sections and questions that evaluators answer."
            : isPreview
              ? "Preview how the questionnaire appears to respondents."
              : mode === "edit"
                ? isPublished
                  ? "Change the template. The update publishes the next version."
                  : "Change the draft, then save it or publish it."
                : "Build a reusable form with clear questions and consistent rating labels."
        }
        actions={
          readOnly ? (
            headerActions
          ) : isPreview ? (
            <Button type="button" variant="outline" className="min-h-pms-touch" onClick={() => setIsPreview(false)}>
              Back to Builder
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" className="min-h-pms-touch" onClick={() => setIsPreview(true)}>
                Preview
              </Button>
              {!isPublished && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-pms-touch"
                  disabled={isPending}
                  onClick={() => save("draft")}
                >
                  Save as Draft
                </Button>
              )}
              <Button
                type="button"
                className="min-h-pms-touch"
                disabled={isPending}
                onClick={() => save(isPublished ? "update" : "publish")}
              >
                {isPublished ? "Update Template" : "Publish Template"}
              </Button>
            </>
          )
        }
        summary={<ErrorSummary errors={errors} />}
      >
        <form
          id={SUBMIT_ERROR_ID}
          noValidate
          className="grid min-w-0 gap-pms-section"
          onSubmit={(event) => event.preventDefault()}
        >
          {isPreview ? (
            <Preview template={template} />
          ) : (
            <>
              <section
                aria-labelledby="template-information-heading"
                className="grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4"
              >
                <h2
                  id="template-information-heading"
                  className="text-pms-label font-semibold uppercase text-muted-foreground"
                >
                  Template information
                </h2>
                <Field data-invalid={Boolean(nameError)}>
                  <FieldLabel htmlFor={NAME_ID}>Template Name *</FieldLabel>
                  <Input
                    id={NAME_ID}
                    required
                    maxLength={120}
                    placeholder="e.g. Quarterly Performance Review"
                    value={template.name}
                    aria-invalid={Boolean(nameError)}
                    className="min-h-pms-touch rounded-pms-control"
                    onChange={(event) => update({ name: event.currentTarget.value })}
                  />
                  {nameError && <FieldError>{nameError.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="template-description">Description / Instructions</FieldLabel>
                  <Textarea
                    id="template-description"
                    rows={3}
                    maxLength={2000}
                    value={template.description}
                    onChange={(event) => update({ description: event.currentTarget.value })}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormSelect
                    label="Template Category"
                    value={template.category}
                    options={CATEGORIES}
                    onChange={(category) => update({ category })}
                  />
                  <FormSelect
                    label="Review Type"
                    value={template.reviewType}
                    options={REVIEW_TYPES}
                    onChange={(reviewType) => update({ reviewType })}
                  />
                </div>
              </section>

              {template.sections.map((section, sectionIndex) => (
                <section
                  key={section.id}
                  aria-label={`Section ${sectionIndex + 1}`}
                  className="grid min-w-0 gap-3"
                >
                  <div className="flex min-w-0 items-end gap-3 rounded-pms-card bg-muted p-3">
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-pms-label"
                    >
                      {sectionIndex + 1}
                    </span>
                    <Field className="min-w-0 flex-1">
                      <FieldLabel htmlFor={`section-${section.id}`} className="text-pms-label text-muted-foreground">
                        Section title
                      </FieldLabel>
                      <Input
                        id={`section-${section.id}`}
                        maxLength={300}
                        value={section.name}
                        placeholder="e.g. Job Performance"
                        className="min-h-pms-touch rounded-pms-control"
                        onChange={(event) => updateSection(section.id, { name: event.currentTarget.value })}
                      />
                    </Field>
                    <MoveButtons
                      kind="section"
                      isFirst={sectionIndex === 0}
                      isLast={sectionIndex === template.sections.length - 1}
                      onMove={(by) => update({ sections: moveItem(template.sections, sectionIndex, by) })}
                    />
                    {template.sections.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-pms-touch"
                        aria-label={`Delete section ${sectionIndex + 1}`}
                        onClick={() =>
                          update({ sections: template.sections.filter((item) => item.id !== section.id) })
                        }
                      >
                        Delete
                      </Button>
                    )}
                  </div>

                  {section.questions.map((question, questionIndex) => (
                    <div
                      key={question.id}
                      className="grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-pms-label font-semibold uppercase text-muted-foreground">
                          Question {questionIndex + 1}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <MoveButtons
                            kind="question"
                            isFirst={questionIndex === 0}
                            isLast={questionIndex === section.questions.length - 1}
                            onMove={(by) =>
                              updateSection(section.id, { questions: moveItem(section.questions, questionIndex, by) })
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-pms-touch"
                            aria-label={`Duplicate question ${questionIndex + 1}`}
                            onClick={() =>
                              updateSection(section.id, { questions: duplicateQuestion(section.questions, question.id) })
                            }
                          >
                            Duplicate
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-pms-touch"
                            aria-label={`Delete question ${questionIndex + 1}`}
                            onClick={() =>
                              updateSection(section.id, {
                                questions: section.questions.filter((item) => item.id !== question.id),
                              })
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <Field>
                        <FieldLabel htmlFor={`question-${question.id}`}>Question Title *</FieldLabel>
                        <Input
                          id={`question-${question.id}`}
                          required
                          maxLength={2000}
                          placeholder="Ask about a specific behavior or outcome…"
                          value={question.title}
                          className="min-h-pms-touch rounded-pms-control"
                          onChange={(event) =>
                            updateQuestion(section.id, question.id, { title: event.currentTarget.value })
                          }
                        />
                      </Field>
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="min-w-48 flex-1">
                          <FormSelect
                            label="Question Type"
                            value={question.type}
                            options={QUESTION_TYPES}
                            onChange={(type) =>
                              updateQuestion(section.id, question.id, {
                                type,
                                // A new multiple choice question starts with two options, like the legacy builder.
                                ...(type === "multiple_choice" && question.choices.length === 0
                                  ? { choices: [...DEFAULT_CHOICES] }
                                  : {}),
                              })
                            }
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 pb-2">
                          <label className="flex items-center gap-2 text-pms-label">
                            <Checkbox
                              aria-label="Required"
                              checked={question.required}
                              onCheckedChange={(required) =>
                                updateQuestion(section.id, question.id, { required: required === true })
                              }
                            />
                            Required
                          </label>
                          {question.type === "rating_scale" && (
                            <label className="flex items-center gap-2 text-pms-label">
                              <Checkbox
                                aria-label="Allow Not Observed"
                                checked={question.notObserved}
                                onCheckedChange={(notObserved) =>
                                  updateQuestion(section.id, question.id, { notObserved: notObserved === true })
                                }
                              />
                              Allow Not Observed
                            </label>
                          )}
                        </div>
                      </div>
                      {question.type === "rating_scale" && <ScaleStrip />}
                      {question.type === "multiple_choice" && (
                        <div className="grid gap-2">
                          {question.choices.map((choice, choiceIndex) => (
                            <div key={choiceIndex} className="flex items-center gap-2">
                              <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-muted-foreground" />
                              <Input
                                id={`choice-${question.id}-${choiceIndex}`}
                                aria-label={`Option ${choiceIndex + 1}`}
                                placeholder={`Option ${choiceIndex + 1}`}
                                maxLength={200}
                                value={choice}
                                className="min-h-pms-touch max-w-xs rounded-pms-control"
                                onChange={(event) =>
                                  updateQuestion(section.id, question.id, {
                                    choices: question.choices.map((item, at) =>
                                      at === choiceIndex ? event.currentTarget.value : item,
                                    ),
                                  })
                                }
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="min-h-pms-touch min-w-pms-touch"
                                aria-label={`Remove option ${choiceIndex + 1}`}
                                onClick={() =>
                                  updateQuestion(section.id, question.id, {
                                    choices: question.choices.filter((_, at) => at !== choiceIndex),
                                  })
                                }
                              >
                                <XIcon aria-hidden="true" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            className="min-h-pms-touch justify-self-start text-primary"
                            onClick={() =>
                              updateQuestion(section.id, question.id, { choices: [...question.choices, ""] })
                            }
                          >
                            <PlusIcon aria-hidden="true" data-icon="inline-start" />
                            Add answer option
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-pms-touch w-full border-dashed"
                    onClick={() => updateSection(section.id, { questions: [...section.questions, newQuestion()] })}
                  >
                    <PlusIcon aria-hidden="true" data-icon="inline-start" />
                    Add question to section
                  </Button>
                </section>
              ))}

              <Button
                type="button"
                variant="outline"
                className="min-h-pms-touch w-full border-dashed"
                onClick={() => update({ sections: [...template.sections, newSection()] })}
              >
                <PlusIcon aria-hidden="true" data-icon="inline-start" />
                Add Section
              </Button>
            </>
          )}
        </form>
      </FormPageTemplate>
      <UnsavedChangesDialog
        open={isLeaving}
        onStay={() => setIsLeaving(false)}
        onLeave={() => {
          startOver();
          router.push(backHref);
        }}
      />
    </div>
  );
}

function MoveButtons({
  kind,
  isFirst,
  isLast,
  onMove,
}: {
  kind: "section" | "question";
  isFirst: boolean;
  isLast: boolean;
  onMove: (by: -1 | 1) => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="min-h-pms-touch min-w-pms-touch"
        aria-label={`Move ${kind} up`}
        disabled={isFirst}
        onClick={() => onMove(-1)}
      >
        <ArrowUpIcon aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="min-h-pms-touch min-w-pms-touch"
        aria-label={`Move ${kind} down`}
        disabled={isLast}
        onClick={() => onMove(1)}
      >
        <ArrowDownIcon aria-hidden="true" />
      </Button>
    </>
  );
}

function ScaleStrip() {
  return (
    <ol
      aria-label="Rating scale"
      className="flex flex-wrap justify-between gap-2 rounded-pms-control bg-muted/30 px-3 py-2 text-pms-label text-muted-foreground"
    >
      {SCALE.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

/** The form as a respondent sees it. Nothing is saved from here. */
function Preview({ template }: { template: BehavioralTemplate }) {
  return (
    <div className="grid min-w-0 gap-4">
      <section className="grid gap-1 rounded-pms-card border border-border bg-card p-4">
        <h2 className="text-pms-section-title">{template.name.trim() || "Untitled template"}</h2>
        {template.description.trim() && <p>{template.description}</p>}
        <p className="text-pms-label text-muted-foreground">
          {BEHAVIORAL_TEMPLATE_CATEGORY_LABELS[template.category]} ·{" "}
          {BEHAVIORAL_REVIEW_TYPE_LABELS[template.reviewType]} review
        </p>
      </section>
      {template.sections.map((section, index) => (
        <section key={section.id} className="grid gap-3">
          <h3 className="text-pms-section-title">{section.name.trim() || `Section ${index + 1}`}</h3>
          {section.questions.map((question) => (
            <div key={question.id} className="grid gap-2 rounded-pms-card border border-border bg-card p-4">
              <p className="font-semibold">
                {question.title.trim() || "Untitled question"}
                {question.required && <span aria-label="required"> *</span>}
              </p>
              {question.type === "rating_scale" && (
                <>
                  <ScaleStrip />
                  {question.notObserved && (
                    <p className="text-pms-label text-muted-foreground">Not observed is allowed.</p>
                  )}
                </>
              )}
              {question.type === "multiple_choice" && (
                <ul className="list-disc pl-5">
                  {choiceList(question.choices).map((choice) => (
                    <li key={choice}>{choice}</li>
                  ))}
                </ul>
              )}
              {(question.type === "short_answer" || question.type === "paragraph") && (
                <p className="text-pms-label text-muted-foreground">{BEHAVIORAL_QUESTION_TYPE_LABELS[question.type]}</p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
