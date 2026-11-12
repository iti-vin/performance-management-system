import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "employees", schema: "public" })
export class Employee {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id: string;

  @Column({ name: "guid", type: "uuid", unique: true, default: () => "gen_random_uuid()" })
  guid: string;

  @Column({ name: "code", type: "text", unique: true })
  code: string;

  @Column({ name: "email", type: "text", unique: true })
  email: string;

  @Column({ name: "first_name", type: "text" })
  firstName: string;

  @Column({ name: "last_name", type: "text" })
  lastName: string;

  // @Column({ name: "compab", type: "text" })
  // company: string;

  // @Column({ name: "last_name", type: "text" })
  // department: string;

  // @Column({ name: "last_name", type: "text" })
  // position: string;

  @Column({ name: "hrdotnet_id", type: "bigint", nullable: true })
  hrdotnetId: string | null;

  @Column({ name: "user_role_id", type: "bigint" })
  userRoleId: string;

  @Column({
    name: "status",
    type: "text",
    default: "active",
  })
  status: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
