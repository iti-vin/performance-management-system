import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The values of one submission, in the shape that the seed stores. */
export interface ActualsSnapshot {
  /** A version saved before the remarks of an indicator existed has none. */
  actuals: { indicator_id: string; actual_value: number | null; remarks?: string | null }[];
}

/** One submission of an accomplishment. A row never changes: a correction adds the next version. */
@Entity({ name: 'accomplishment_versions', schema: 'pms' })
export class AccomplishmentVersion {
  @PrimaryColumn({ name: 'version_id', type: 'uuid' })
  versionId: string;

  @Column({ name: 'accomplishment_id', type: 'uuid' })
  accomplishmentId: string;

  @Column({ type: 'integer' })
  version: number;

  @Column({ name: 'actuals_json', type: 'jsonb' })
  actualsJson: ActualsSnapshot;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'acted_at', type: 'timestamptz', nullable: true })
  actedAt: Date | null;

  /** What the employee says they corrected. Set on a submission that follows a return. */
  @Column({ name: 'correction_reason', type: 'text', nullable: true })
  correctionReason: string | null;
}
