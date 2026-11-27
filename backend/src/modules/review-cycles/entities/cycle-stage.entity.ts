import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { EvaluatorType } from '@pms/shared-types';

@Entity({ name: 'cycle_stages', schema: 'pms' })
export class CycleStage {
  @PrimaryColumn({ name: 'stage_id', type: 'uuid' })
  stageId: string;

  @Column({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  @Column({ type: 'text' })
  perspective: EvaluatorType;

  @Column({ name: 'evaluator_role', type: 'text', nullable: true })
  evaluatorRole: string | null;

  /** The named person. NULL when launch derives the evaluator (self, manager). */
  @Column({ name: 'evaluator_id', type: 'uuid', nullable: true })
  evaluatorId: string | null;

  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder: number;

  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date | null;
}
