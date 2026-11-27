import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { ResponseStatus } from '@pms/shared-types';

/** The answers of one assignment. A submitted version never changes: a correction adds the next version. */
@Entity({ name: 'assignment_responses', schema: 'pms' })
export class AssignmentResponse {
  @PrimaryColumn({ name: 'response_id', type: 'uuid' })
  responseId: string;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  /** Keyed by question id: a rating number or "not_observed", a text, or the id of the chosen option. */
  @Column({ name: 'answers_json', type: 'jsonb' })
  answersJson: Record<string, number | string>;

  @Column({ type: 'integer' })
  version: number;

  @Column({ type: 'text' })
  status: ResponseStatus;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  /** Why HR reopened the review that this version answers. Null for a first version. */
  @Column({ name: 'reopen_reason', type: 'text', nullable: true })
  reopenReason?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
