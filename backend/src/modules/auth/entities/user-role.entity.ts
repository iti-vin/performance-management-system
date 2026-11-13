import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export const ADMIN_ROLE_ID = "1";

@Entity({ name: "user_role" })
export class UserRole {
  @PrimaryGeneratedColumn({ name: "user_role_id", type: "bigint" })
  id: string;

  @Column({ name: "code", type: "text", unique: true })
  code: string;

  @Column({ name: "name", type: "text", unique: true })
  name: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
