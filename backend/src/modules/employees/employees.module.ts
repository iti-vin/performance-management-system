import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmployeeController } from "./controllers/employees.controller.js";
import { EmployeeService } from "./services/employee.service.js";
import { AdminRoleGuard } from "./guards/admin-role.guard.js";
import { EmployeeDomain } from "./entities/employee-domain.entity.js";
import { User } from "../auth/entities/user.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeDomain, User])],
  controllers: [EmployeeController],
  providers: [EmployeeService, AdminRoleGuard],
  exports: [EmployeeService],
})
export class EmployeeModule {}
