import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type AssignmentState = 'locked' | 'not_started' | 'in_progress' | 'submitted' | 'completed';

/** One evaluator for one subject at one stage. Launch creates them; the register counts them by state. */
@Entity({ name: 'assignments', schema: 'pms' })
export class Assignment {
  @PrimaryColumn({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @Column({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  /** The subject: a row of `cycle_participants`. */
  @Column({ name: 'participant_id', type: 'uuid' })
  participantId: string;

  /** The employee who answers. Kept after a later manager change (PRD AUTH-004). */
  @Column({ name: 'evaluator_id', type: 'uuid' })
  evaluatorId: string;

  @Column({ name: 'stage_id', type: 'uuid' })
  stageId: string;

  @Column({ type: 'text' })
  state: AssignmentState;

  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date | null;

  /** The employee who submitted, and when. Set once, by the submission. */
  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy?: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt?: Date;
}
