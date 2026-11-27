import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * One row of `pms.audit_events`. The table is append-only by policy: the code
 * only inserts, and never updates or deletes a row.
 */
@Entity({ name: 'audit_events', schema: 'pms' })
export class AuditEvent {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'entity_type', type: 'text' })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ type: 'text' })
  action: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'before_json', type: 'jsonb', nullable: true })
  beforeJson: Record<string, unknown> | null;

  @Column({ name: 'after_json', type: 'jsonb', nullable: true })
  afterJson: Record<string, unknown> | null;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'now()' })
  occurredAt: Date;
}
