import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** PostgreSQL returns numeric as text: an actual result is read as a number. */
const NUMBER_OR_NULL = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/** The current value of one frozen indicator. Earlier submissions stay in `accomplishment_versions`. */
@Entity({ name: 'accomplishment_actuals', schema: 'pms' })
export class AccomplishmentActual {
  @PrimaryColumn({ name: 'actual_id', type: 'uuid' })
  actualId: string;

  @Column({ name: 'accomplishment_id', type: 'uuid' })
  accomplishmentId: string;

  @Column({ name: 'indicator_id', type: 'uuid' })
  indicatorId: string;

  @Column({ name: 'actual_value', type: 'numeric', nullable: true, transformer: NUMBER_OR_NULL })
  actualValue: number | null;

  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt?: Date;
}
