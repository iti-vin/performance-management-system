import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EmployeeStatus } from "../types/employee-status.enum.js";

@Entity({ name: "employees", schema: "public" })
export class EmployeeDomain {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "guid", type: "uuid", unique: true, default: () => "gen_random_uuid()" })
  guid: string;

  @Column({ name: "code", type: "text", unique: true })
  employeeCode: string;

  @Column({ name: "email", type: "text", unique: true })
  email: string;

  @Column({ name: "first_name", type: "text" })
  firstName: string;

  @Column({ name: "last_name", type: "text" })
  lastName: string;

  @Column({ name: "hrdotnet_id", type: "bigint", nullable: true })
  hrdotnetId: string | null;

  @Column({ name: "user_role_id", type: "bigint" })
  userRoleId: string;

  @Column({
    name: "status",
    type: "text",
    default: "active",
  })
  status: EmployeeStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
