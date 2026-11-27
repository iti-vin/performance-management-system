import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Who reads the reviews and results of a cycle, beside the evaluator and HR. A cycle with no row
 * is read by the employee and the manager after the release, and by no later reviewer.
 */
@Entity({ name: 'cycle_result_visibility', schema: 'pms' })
export class CycleResultVisibility {
  @PrimaryColumn({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  @Column({ name: 'employee_visible', type: 'boolean' })
  employeeVisible: boolean;

  @Column({ name: 'manager_visible', type: 'boolean' })
  managerVisible: boolean;

  @Column({ name: 'earlier_answers_visible', type: 'boolean' })
  earlierAnswersVisible: boolean;
}
