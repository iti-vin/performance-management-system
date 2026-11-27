import { Column, Entity, PrimaryColumn } from 'typeorm';

/** An employee of a cycle, with the frozen template versions that the cycle uses for them. */
@Entity({ name: 'cycle_participants', schema: 'pms' })
export class CycleParticipant {
  @PrimaryColumn({ name: 'participant_id', type: 'uuid' })
  participantId: string;

  @Column({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  /** The position when the participant was saved: later position changes do not move it. */
  @Column({ name: 'frozen_position', type: 'text', nullable: true })
  frozenPosition: string | null;

  @Column({ name: 'kpi_version_id', type: 'uuid', nullable: true })
  kpiVersionId: string | null;

  @Column({ name: 'behavioral_version_id', type: 'uuid', nullable: true })
  behavioralVersionId: string | null;
}
