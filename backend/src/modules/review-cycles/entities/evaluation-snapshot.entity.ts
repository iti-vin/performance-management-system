import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ResultDetailDto } from '@pms/shared-types';

/** PostgreSQL returns numeric as text: a score is read as a number. */
const NUMBER_OR_NULL = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/** What finalization froze besides the scores: who, the weights, and the evidence of each component. */
export type SnapshotEvidence = Pick<
  ResultDetailDto,
  'employeeName' | 'position' | 'department' | 'goalsWeight' | 'behavioralWeight' | 'goals' | 'behavioral'
>;

/** The result of one participant. Finalization writes it once; release sets its date (Res-002, Res-003). */
@Entity({ name: 'evaluation_snapshots', schema: 'pms' })
export class EvaluationSnapshot {
  @PrimaryColumn({ name: 'snapshot_id', type: 'uuid' })
  snapshotId: string;

  @Column({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  @Column({ name: 'participant_id', type: 'uuid' })
  participantId: string;

  @Column({ name: 'goals_component_score', type: 'numeric', nullable: true, transformer: NUMBER_OR_NULL })
  goalsComponentScore: number | null;

  @Column({ name: 'behavioral_component_score', type: 'numeric', nullable: true, transformer: NUMBER_OR_NULL })
  behavioralComponentScore: number | null;

  @Column({ name: 'overall_score', type: 'numeric', nullable: true, transformer: NUMBER_OR_NULL })
  overallScore: number | null;

  @Column({ name: 'evidence_json', type: 'jsonb' })
  evidenceJson: SnapshotEvidence;

  @Column({ name: 'finalized_by', type: 'uuid', nullable: true })
  finalizedBy: string | null;

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt: Date | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;
}
