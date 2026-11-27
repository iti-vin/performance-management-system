import { describe, expect, it, vi } from 'vitest';
import type { EntityManager } from 'typeorm';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { publicationHistory, type PublicationSource } from './publication-history.js';

const [ANA, BEN, CARA] = ['g-ana', 'g-ben', 'g-cara'];
const at = (day: number) => new Date(`2026-11-${day}T02:00:00Z`);
const source = (change: Partial<PublicationSource> = {}): PublicationSource => ({
  entityType: 'kpi_template',
  company: 'Acme',
  template: { templateId: 't-1', currentVersion: 2, publishedBy: CARA },
  versions: [
    { version: 1, frozenAt: at(10), createdBy: ANA },
    { version: 2, frozenAt: at(20), createdBy: BEN },
    { version: 3, frozenAt: null, createdBy: ANA },
  ],
  ...change,
});

function managerWith(auditRows: object[]) {
  const find = vi.fn(async (entity: unknown, _query?: unknown) =>
    entity === AuditEvent
      ? auditRows
      : [
          { guid: ANA, firstName: 'Ana', lastName: 'Cruz' },
          { guid: BEN, firstName: 'Ben', lastName: 'Diaz' },
          { guid: CARA, firstName: 'Cara', lastName: 'Ey' },
        ],
  );
  return { find, manager: { find } as unknown as EntityManager };
}

describe('publicationHistory', () => {
  it('lists the frozen versions, newest first, and takes the publisher from the audit row (Tpl-G-007)', async () => {
    const { manager } = managerWith([{ actorId: CARA, afterJson: { currentVersion: 1 } }]);

    expect(await publicationHistory(manager, source())).toEqual([
      { version: 2, publishedAt: at(20).toISOString(), publishedByName: 'Ben Diaz', isCurrent: true },
      { version: 1, publishedAt: at(10).toISOString(), publishedByName: 'Cara Ey', isCurrent: false },
    ]);
  });

  it('names no publisher of an older first version with no audit row: its drafter may be another person', async () => {
    const { manager } = managerWith([]);

    expect((await publicationHistory(manager, source()))[1]?.publishedByName).toBeNull();
  });

  it('uses the publisher of the template for a first version that is still current', async () => {
    const { manager } = managerWith([]);
    const only = source({
      template: { templateId: 't-1', currentVersion: 1, publishedBy: CARA },
      versions: [{ version: 1, frozenAt: at(10), createdBy: ANA }],
    });

    expect((await publicationHistory(manager, only))[0]?.publishedByName).toBe('Cara Ey');
  });

  it('reads the audit rows of this template, and the names inside the company', async () => {
    const { manager, find } = managerWith([]);

    await publicationHistory(manager, source());

    const [audit, names] = find.mock.calls.map((call) => (call[1] as { where: Record<string, unknown> }).where);
    expect(audit).toMatchObject({ entityType: 'kpi_template', entityId: 't-1' });
    expect(names).toMatchObject({ company: 'Acme' });
  });

  it('reads nothing for a template with no frozen version', async () => {
    const { manager, find } = managerWith([]);

    expect(await publicationHistory(manager, source({ versions: [{ version: 1, frozenAt: null, createdBy: ANA }] }))).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });
});
