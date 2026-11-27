import { Column, Entity, PrimaryColumn } from 'typeorm';

/** An effective-dated reporting line. Read only here: launch finds the manager stage evaluator from it. */
@Entity({ name: 'manager_assignments', schema: 'pms' })
export class ManagerAssignment {
  @PrimaryColumn({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ name: 'manager_id', type: 'uuid' })
  managerId: string;

  @Column({ type: 'text' })
  company: string;

  /** A calendar date, "YYYY-MM-DD". */
  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ type: 'text' })
  status: 'pending' | 'applied' | 'blocked' | 'cancelled';
}
