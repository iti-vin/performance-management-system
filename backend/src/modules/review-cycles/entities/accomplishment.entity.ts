import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { AccomplishmentStatus } from '@pms/shared-types';

/**
 * The KPI report of one participant. A launch creates it as a draft. The employee reports
 * the actual results, and the current manager verifies or returns them (PRD section 7).
 */
@Entity({ name: 'accomplishments', schema: 'pms' })
export class Accomplishment {
  @PrimaryColumn({ name: 'accomplishment_id', type: 'uuid' })
  accomplishmentId: string;

  @Column({ name: 'participant_id', type: 'uuid' })
  participantId: string;

  @Column({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  /** The GUID of the employee who reports. */
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ type: 'text' })
  status: AccomplishmentStatus;

  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy?: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy?: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;

  /** Why the manager returned it. The next submission keeps it as the history of that correction. */
  @Column({ name: 'return_reason', type: 'text', nullable: true })
  returnReason?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt?: Date;
}
