import { BadRequestException } from '@nestjs/common';
import { In, IsNull, Not, type Repository } from 'typeorm';
import { BehavioralTemplateVersion } from '../../behavioral-assessment/entities/behavioral-template-version.entity.js';
import { BehavioralTemplate } from '../../behavioral-assessment/entities/behavioral-template.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { EmployeeStatus } from '../../employees/types/employee-status.enum.js';
import { KpiGoalTemplate } from '../../kpi-goals/entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from '../../kpi-goals/entities/kpi-template-version.entity.js';

export interface ParticipantRequest {
  employeeId: string;
  kpiTemplateId?: string;
  behavioralTemplateId?: string;
}

export interface ResolvedParticipant {
  employeeId: string;
  frozenPosition: string | null;
  kpiVersionId: string | null;
  behavioralVersionId: string | null;
}

/** Read-only repositories of the other modules. Every query filters by the company of the cycle. */
export interface Lookups {
  employees: Repository<EmployeeDomain>;
  kpiTemplates: Repository<KpiGoalTemplate>;
  kpiVersions: Repository<KpiTemplateVersion>;
  behavioralTemplates: Repository<BehavioralTemplate>;
  behavioralVersions: Repository<BehavioralTemplateVersion>;
}

const NOT_YOUR_EMPLOYEES = 'Some selected employees are not active employees of your company.';

/** The frozen version of a published template: the row at its current version number. */
function currentVersionIds(
  templates: { templateId: string; currentVersion: number }[],
  versions: { versionId: string; templateId: string; version: number }[],
): Map<string, string> {
  const ids = new Map<string, string>();
  for (const template of templates) {
    const version = versions.find((row) => row.templateId === template.templateId && row.version === template.currentVersion);
    if (version) ids.set(template.templateId, version.versionId);
  }
  return ids;
}

/**
 * Turns the choice of the wizard into the rows of the cycle: the employees must be active
 * and in the company; a KPI template that HR names must be published, in the company, and
 * for the position of the employee; with none named, the one published template of the
 * exact same position is used, and none or several leave the version empty for HR to
 * choose (readiness says so). Each template becomes its current frozen version.
 */
export async function resolveParticipants(
  lookups: Lookups,
  company: string,
  requests: ParticipantRequest[],
): Promise<ResolvedParticipant[]> {
  const unique = [...new Map(requests.map((request) => [request.employeeId, request])).values()];
  if (unique.length === 0) return [];

  const employees = await lookups.employees.find({
    where: { guid: In(unique.map((request) => request.employeeId)), company, status: EmployeeStatus.ACTIVE },
  });
  if (employees.length !== unique.length) throw new BadRequestException(NOT_YOUR_EMPLOYEES);

  const kpiTemplates = await lookups.kpiTemplates.find({ where: { company, status: 'published' } });
  const behavioralIds = [...new Set(unique.flatMap((request) => (request.behavioralTemplateId ? [request.behavioralTemplateId] : [])))];
  const behavioralTemplates = behavioralIds.length
    ? await lookups.behavioralTemplates.find({ where: { templateId: In(behavioralIds), company, status: 'published' } })
    : [];
  if (behavioralTemplates.length !== behavioralIds.length) {
    throw new BadRequestException('A behavioral template is not published, or is not in your company.');
  }

  const chosenKpi = chooseKpiTemplates(kpiTemplates, employees, unique);

  const kpiVersions = chosenKpi.size
    ? await lookups.kpiVersions.find({
        where: { templateId: In([...new Set([...chosenKpi.values()].map((template) => template.templateId))]), frozenAt: Not(IsNull()) },
      })
    : [];
  const behavioralVersions = behavioralIds.length
    ? await lookups.behavioralVersions.find({ where: { templateId: In(behavioralIds), frozenAt: Not(IsNull()) } })
    : [];
  const kpiVersionIds = currentVersionIds([...chosenKpi.values()], kpiVersions);
  const behavioralVersionIds = currentVersionIds(behavioralTemplates, behavioralVersions);

  return unique.map((request) => ({
    employeeId: request.employeeId,
    frozenPosition: employees.find((candidate) => candidate.guid === request.employeeId)?.position ?? null,
    kpiVersionId: kpiVersionIds.get(chosenKpi.get(request.employeeId)?.templateId ?? '') ?? null,
    behavioralVersionId: behavioralVersionIds.get(request.behavioralTemplateId ?? '') ?? null,
  }));
}

/** The KPI template of each participant that has one: the named template, or the only match of the position. */
function chooseKpiTemplates(
  templates: KpiGoalTemplate[],
  employees: EmployeeDomain[],
  requests: ParticipantRequest[],
): Map<string, KpiGoalTemplate> {
  const chosen = new Map<string, KpiGoalTemplate>();
  for (const request of requests) {
    const person = employees.find((candidate) => candidate.guid === request.employeeId);
    const template = pickKpiTemplate(templates, person?.position ?? null, request.kpiTemplateId);
    if (template) chosen.set(request.employeeId, template);
  }
  return chosen;
}

/** The template that HR named, if it fits; else the only published one of the position; else none. */
function pickKpiTemplate(templates: KpiGoalTemplate[], position: string | null, chosenId?: string): KpiGoalTemplate | null {
  if (chosenId !== undefined) {
    const chosen = templates.find((template) => template.templateId === chosenId);
    if (!chosen || chosen.position !== position) {
      throw new BadRequestException('A KPI goal template is not published, or does not match the position of the employee.');
    }
    return chosen;
  }
  if (position === null) return null;
  const matches = templates.filter((template) => template.position === position);
  return matches.length === 1 ? (matches[0] ?? null) : null;
}
