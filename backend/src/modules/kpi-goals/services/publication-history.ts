import { In, type EntityManager } from 'typeorm';
import type { TemplateVersionDto } from '@pms/shared-types';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';

export interface PublicationSource {
  entityType: 'kpi_template' | 'behavioral_template';
  company: string;
  template: { templateId: string; currentVersion: number; publishedBy: string | null };
  versions: { version: number; frozenAt: Date | null; createdBy: string | null }[];
}

/**
 * Who published each frozen version, and when (PRD Tpl-G-007). The time is the freeze of the
 * version. The publisher is the actor of its audit row. Without a row (an older publication):
 * a later version was published by its creator, and the current version by the publisher that
 * the template names. Nobody is guessed for an older first version.
 */
export async function publicationHistory(
  manager: EntityManager,
  { entityType, company, template, versions }: PublicationSource,
): Promise<TemplateVersionDto[]> {
  const frozen = versions.filter((row) => row.frozenAt).sort((a, b) => b.version - a.version);
  if (frozen.length === 0) return [];
  const events = await manager.find(AuditEvent, {
    where: { entityType, entityId: template.templateId, action: In(['published', 'version_published']) },
  });
  const actorOf = new Map(events.map((event) => [event.afterJson?.currentVersion, event.actorId]));
  const publisherOf = ({ version, createdBy }: PublicationSource['versions'][number]) =>
    actorOf.get(version) ?? (version > 1 ? createdBy : version === template.currentVersion ? template.publishedBy : null);

  const ids = [...new Set(frozen.flatMap((row) => publisherOf(row) ?? []))];
  const people = ids.length ? await manager.find(EmployeeDomain, { where: { guid: In(ids), company } }) : [];
  const nameOf = new Map(people.map((person) => [person.guid, `${person.firstName} ${person.lastName}`]));

  return frozen.map((row) => ({
    version: row.version,
    publishedAt: row.frozenAt?.toISOString() ?? null,
    publishedByName: nameOf.get(publisherOf(row) ?? '') ?? null,
    isCurrent: row.version === template.currentVersion,
  }));
}

interface VersionDetailsSource {
  entityType: PublicationSource['entityType'];
  templateId: string;
  version: number;
  /** The fields that a template row holds and a version row does not. */
  keys: readonly string[];
}

/**
 * Those fields as one version was published, from its audit row. Empty for a publication
 * with no row: the caller then keeps the values of today.
 */
export async function detailsOfVersion(
  manager: EntityManager,
  { entityType, templateId, version, keys }: VersionDetailsSource,
): Promise<Record<string, unknown>> {
  const events = await manager.find(AuditEvent, {
    where: { entityType, entityId: templateId, action: In(['published', 'version_published']) },
  });
  const published = events.find((event) => event.afterJson?.currentVersion === version)?.afterJson ?? {};
  return Object.fromEntries(keys.filter((key) => key in published).map((key) => [key, published[key]]));
}
