import { BadRequestException } from '@nestjs/common';
import { In, IsNull, Not } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { resolveParticipants, type Lookups } from './participant-resolver.js';

const COMPANY = 'Mayon Consolidated Inc.';
const EMP_A = '00000000-0000-0000-0000-000000000021';
const EMP_B = '00000000-0000-0000-0000-000000000022';
const KPI_ENGINEER = 'kpi-engineer';
const KPI_ENGINEER_2 = 'kpi-engineer-2';
const KPI_MANAGER = 'kpi-manager';
const BEH = 'beh-1';

const employee = (guid: string, position: string | null) => ({ guid, position, company: COMPANY, status: 'active' });
const kpiTemplate = (templateId: string, position: string, currentVersion = 2) => ({
  templateId,
  position,
  company: COMPANY,
  status: 'published',
  currentVersion,
});

interface World {
  employees?: unknown[];
  kpiTemplates?: unknown[];
  behavioralTemplates?: unknown[];
}

function lookups(world: World = {}) {
  const repos = {
    employees: { find: vi.fn(async () => world.employees ?? [employee(EMP_A, 'Software Engineer')]) },
    kpiTemplates: {
      find: vi.fn(async () => world.kpiTemplates ?? [kpiTemplate(KPI_ENGINEER, 'Software Engineer'), kpiTemplate(KPI_MANAGER, 'Engineering Manager')]),
    },
    kpiVersions: {
      find: vi.fn(async () => [
        { versionId: 'kv-old', templateId: KPI_ENGINEER, version: 1, frozenAt: new Date() },
        { versionId: 'kv-current', templateId: KPI_ENGINEER, version: 2, frozenAt: new Date() },
        { versionId: 'kv-manager', templateId: KPI_MANAGER, version: 2, frozenAt: new Date() },
      ]),
    },
    behavioralTemplates: {
      find: vi.fn(async () => world.behavioralTemplates ?? [{ templateId: BEH, company: COMPANY, status: 'published', currentVersion: 1 }]),
    },
    behavioralVersions: {
      find: vi.fn(async () => [{ versionId: 'bv-1', templateId: BEH, version: 1, frozenAt: new Date() }]),
    },
  };
  return { repos, lookups: repos as unknown as Lookups };
}

describe('resolveParticipants', () => {
  it('reads nothing and returns nothing for an empty request', async () => {
    const { repos, lookups: l } = lookups();

    await expect(resolveParticipants(l, COMPANY, [])).resolves.toEqual([]);
    expect(repos.employees.find).not.toHaveBeenCalled();
  });

  it('finds the employees inside the company, active, and with a GUID', async () => {
    const { repos, lookups: l } = lookups();

    await resolveParticipants(l, COMPANY, [{ employeeId: EMP_A, behavioralTemplateId: BEH }]);

    expect(repos.employees.find).toHaveBeenCalledWith({
      where: { guid: In([EMP_A]), company: COMPANY, status: 'active' },
    });
  });

  it('matches the one published KPI template of the exact position, and freezes its current version', async () => {
    const { lookups: l } = lookups();

    const [row] = await resolveParticipants(l, COMPANY, [{ employeeId: EMP_A, behavioralTemplateId: BEH }]);

    expect(row).toEqual({
      employeeId: EMP_A,
      frozenPosition: 'Software Engineer',
      kpiVersionId: 'kv-current',
      behavioralVersionId: 'bv-1',
    });
  });

  it.each([
    ['no published template has the position', [kpiTemplate(KPI_MANAGER, 'Engineering Manager')]],
    [
      'two published templates share the position, so HR must choose',
      [kpiTemplate(KPI_ENGINEER, 'Software Engineer'), kpiTemplate(KPI_ENGINEER_2, 'Software Engineer')],
    ],
    ['the position differs in case, because the match is exact', [kpiTemplate(KPI_ENGINEER, 'software engineer')]],
  ])('leaves the KPI version empty when %s', async (_label, kpiTemplates) => {
    const { lookups: l } = lookups({ kpiTemplates });

    const [row] = await resolveParticipants(l, COMPANY, [{ employeeId: EMP_A, behavioralTemplateId: BEH }]);

    expect(row?.kpiVersionId).toBeNull();
  });

  it('leaves both versions empty when the employee has no position and no behavioral template is given', async () => {
    const { lookups: l } = lookups({ employees: [employee(EMP_A, null)] });

    const [row] = await resolveParticipants(l, COMPANY, [{ employeeId: EMP_A }]);

    expect(row).toEqual({ employeeId: EMP_A, frozenPosition: null, kpiVersionId: null, behavioralVersionId: null });
  });

  it('accepts a KPI template that HR chose when it is published, in the company, and for the same position', async () => {
    const { lookups: l } = lookups({
      kpiTemplates: [kpiTemplate(KPI_ENGINEER, 'Software Engineer'), kpiTemplate(KPI_ENGINEER_2, 'Software Engineer')],
    });

    const [row] = await resolveParticipants(l, COMPANY, [
      { employeeId: EMP_A, kpiTemplateId: KPI_ENGINEER, behavioralTemplateId: BEH },
    ]);

    expect(row?.kpiVersionId).toBe('kv-current');
  });

  it.each([
    ['a template of another position', KPI_MANAGER],
    ['a template that is not published or not in the company', 'kpi-unknown'],
  ])('refuses a chosen KPI template that is %s', async (_label, kpiTemplateId) => {
    const { lookups: l } = lookups();

    await expect(
      resolveParticipants(l, COMPANY, [{ employeeId: EMP_A, kpiTemplateId, behavioralTemplateId: BEH }]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a behavioral template that is not published or not in the company', async () => {
    const { lookups: l } = lookups({ behavioralTemplates: [] });

    await expect(
      resolveParticipants(l, COMPANY, [{ employeeId: EMP_A, behavioralTemplateId: 'beh-unknown' }]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses an employee that the company query did not return: unknown, other company, inactive, or no GUID', async () => {
    const { lookups: l } = lookups({ employees: [employee(EMP_A, 'Software Engineer')] });

    await expect(
      resolveParticipants(l, COMPANY, [
        { employeeId: EMP_A, behavioralTemplateId: BEH },
        { employeeId: EMP_B, behavioralTemplateId: BEH },
      ]),
    ).rejects.toThrow('not active employees of your company');
  });

  it('keeps one row for an employee that the request lists twice', async () => {
    const { repos, lookups: l } = lookups();

    const rows = await resolveParticipants(l, COMPANY, [
      { employeeId: EMP_A, behavioralTemplateId: BEH },
      { employeeId: EMP_A, behavioralTemplateId: BEH },
    ]);

    expect(rows).toHaveLength(1);
    expect(repos.employees.find).toHaveBeenCalledWith({
      where: { guid: In([EMP_A]), company: COMPANY, status: 'active' },
    });
  });

  it('reads the frozen versions of the chosen templates only', async () => {
    const { repos, lookups: l } = lookups();

    await resolveParticipants(l, COMPANY, [{ employeeId: EMP_A, behavioralTemplateId: BEH }]);

    expect(repos.kpiVersions.find).toHaveBeenCalledWith({
      where: { templateId: In([KPI_ENGINEER]), frozenAt: Not(IsNull()) },
    });
    expect(repos.behavioralVersions.find).toHaveBeenCalledWith({
      where: { templateId: In([BEH]), frozenAt: Not(IsNull()) },
    });
  });
});
