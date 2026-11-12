import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "employee_id", type: "bigint" })
  employeeId: string;

  @Column({ name: "user_role_id", type: "bigint" })
  userRoleId: string;

  @Column({ name: "email", type: "text", unique: true })
  email: string;

  @Column({ name: "username", type: "text", unique: true })
  username: string;

  @Column({ name: "password_hash", type: "text" })
  passwordHash: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
