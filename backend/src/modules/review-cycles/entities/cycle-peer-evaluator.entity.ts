import { Column, PrimaryColumn, Entity } from 'typeorm';

/** One peer who assesses one participant (PRD Cyc-003). A replaced draft removes them with its participants. */
@Entity({ name: 'cycle_peer_evaluators', schema: 'pms' })
export class CyclePeerEvaluator {
  @PrimaryColumn({ name: 'participant_id', type: 'uuid' })
  participantId: string;

  @PrimaryColumn({ name: 'evaluator_id', type: 'uuid' })
  evaluatorId: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt?: Date;
}
