import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { CycleStatus, ReviewType } from '@pms/shared-types';

/** PostgreSQL returns numeric as text: the weights are fractions, read as numbers. */
const FRACTION = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

@Entity({ name: 'cycles', schema: 'pms' })
export class Cycle {
  @PrimaryColumn({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  @Column({ type: 'text' })
  company: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'review_type', type: 'text' })
  reviewType: ReviewType;

  @Column({ type: 'text' })
  state: CycleStatus;

  /** A calendar date, kept as the text "YYYY-MM-DD" so no time zone shifts it. */
  @Column({ name: 'evaluation_start', type: 'date' })
  evaluationStart: string;

  @Column({ name: 'evaluation_end', type: 'date' })
  evaluationEnd: string;

  @Column({ name: 'assessment_start', type: 'timestamptz', nullable: true })
  assessmentStart: Date | null;

  @Column({ name: 'verification_deadline', type: 'timestamptz', nullable: true })
  verificationDeadline: Date | null;

  @Column({ name: 'activation_date', type: 'date', nullable: true })
  activationDate: string | null;

  @Column({ name: 'goals_weight', type: 'numeric', precision: 4, scale: 2, transformer: FRACTION })
  goalsWeight: number;

  @Column({ name: 'behavioral_weight', type: 'numeric', precision: 4, scale: 2, transformer: FRACTION })
  behavioralWeight: number;

  @Column({ name: 'anonymity_threshold', type: 'integer', nullable: true })
  anonymityThreshold: number | null;

  @Column({ name: 'cancelled_reason', type: 'text', nullable: true })
  cancelledReason: string | null;

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt: Date | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'accomplishment_deadline', type: 'timestamptz', nullable: true })
  accomplishmentDeadline: Date | null;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
