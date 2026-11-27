import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { AuditEvent } from '../entities/audit-event.entity.js';

type AuditEntry = Pick<AuditEvent, 'entityType' | 'entityId' | 'action' | 'actorId' | 'beforeJson' | 'afterJson'>;

/** Appends one audit row through the transaction of the change, so both stand or fall together. */
export async function writeAudit(manager: EntityManager, entry: AuditEntry): Promise<void> {
  await manager.save(manager.create(AuditEvent, { eventId: randomUUID(), reason: null, idempotencyKey: null, ...entry }));
}
