import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../auth/entities/user.entity.js";
import { ADMIN_ROLE_ID } from "../../auth/entities/user-role.entity.js";
import { EmployeeService } from "../services/employee.service.js";

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly employeeService: EmployeeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException("Authenticated user id missing from token");
    }

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException("User account no longer exists");
    }

    const employee = await this.employeeService.findByUser(user);
    if (!employee || employee.userRoleId !== ADMIN_ROLE_ID) {
      throw new ForbiddenException("Admin role required");
    }

    return true;
  }
}
