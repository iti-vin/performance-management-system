import type { BehavioralChoiceOption } from "../entities/behavioral-choice-option.entity.js";
import type { BehavioralQuestion } from "../entities/behavioral-question.entity.js";
import type { BehavioralSection } from "../entities/behavioral-section.entity.js";
import type { BehavioralTemplateVersion } from "../entities/behavioral-template-version.entity.js";
import type { BehavioralTemplate } from "../entities/behavioral-template.entity.js";

/** A behavioral template with its current version and everything under it. */
export interface TemplateTree {
  template: BehavioralTemplate;
  version: BehavioralTemplateVersion | null;
  sections: BehavioralSection[];
  questions: BehavioralQuestion[];
  options: BehavioralChoiceOption[];
}
