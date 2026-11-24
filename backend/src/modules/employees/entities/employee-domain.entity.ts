import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { EmployeeStatus } from "../types/employee-status.enum.js";
import type { BloodType, EmploymentStatus, Gender, MaritalStatus } from "@pms/shared-types";

/**
 * pms.employees, column for column (packages/database/schema/employees.sql).
 * The SQL file owns the table: the connection runs with `synchronize: false`.
 */
@Entity({ name: "employees", schema: "pms" })
export class EmployeeDomain {
  // No default in the table: the caller supplies the id.
  @PrimaryColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "guid", type: "uuid", nullable: true })
  guid: string | null;

  @Column({ name: "code", type: "text" })
  employeeCode: string;

  @Column({ name: "email", type: "text" })
  email: string;

  @Column({ name: "first_name", type: "text" })
  firstName: string;

  @Column({ name: "last_name", type: "text" })
  lastName: string;

  @Column({ name: "hrdotnet_id", type: "bigint", nullable: true })
  hrdotnetId: string | null;

  @Column({ name: "company", type: "text" })
  company: string;

  @Column({ name: "position", type: "text", nullable: true })
  position: string | null;

  @Column({ name: "division", type: "text", nullable: true })
  division: string | null;

  @Column({ name: "department", type: "text" })
  department: string;

  @Column({ name: "branch", type: "text" })
  branch: string;

  @Column({ name: "employment_status", type: "text" })
  employmentStatus: EmploymentStatus;

  @Column({ name: "status", type: "text" })
  status: EmployeeStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @Column({ name: "middle_name", type: "text", nullable: true })
  middleName: string | null;

  @Column({ name: "suffix", type: "text", nullable: true })
  suffix: string | null;

  @Column({ name: "mobile_number", type: "text", nullable: true })
  mobileNumber: string | null;

  @Column({ name: "gender", type: "text", nullable: true })
  gender: Gender | null;

  // A `date` column: TypeORM returns it as "YYYY-MM-DD".
  @Column({ name: "birth_date", type: "date", nullable: true })
  birthDate: string | null;

  @Column({ name: "place_of_birth", type: "text", nullable: true })
  placeOfBirth: string | null;

  @Column({ name: "marital_status", type: "text", nullable: true })
  maritalStatus: MaritalStatus | null;

  @Column({ name: "nationality", type: "text", nullable: true })
  nationality: string | null;

  @Column({ name: "religion", type: "text", nullable: true })
  religion: string | null;

  @Column({ name: "blood_type", type: "text", nullable: true })
  bloodType: BloodType | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;
}
