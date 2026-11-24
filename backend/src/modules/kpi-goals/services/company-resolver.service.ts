import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { EmployeeService } from '../../employees/services/employee.service.js';

const NO_COMPANY = 'No company is linked to your account.';

/** The company of an account, and the actor that its writes are recorded under. */
export interface ResolvedAccount {
  companyId: number;
  /**
   * The GUID of the account's `pms.employees` row. `created_by` and `published_by`
   * are uuid columns that refer to it: the numeric id of a login is not a uuid.
   * Null when the row has no GUID.
   */
  actorId: string | null;
}

/**
 * Finds the company of the signed-in account: `users.employee_id` leads to its
 * `pms.employees` row, whose `company` is a name. The name must match exactly
 * one `pms.companies` row, because the KPI tables store `company_id`.
 */
@Injectable()
export class CompanyResolver {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly employees: EmployeeService,
    private readonly dataSource: DataSource,
  ) {}

  async resolveCompanyId(userId: string): Promise<number> {
    return (await this.resolveAccount(userId)).companyId;
  }

  async resolveAccount(userId: string): Promise<ResolvedAccount> {
    const user = await this.users.findOne({ where: { id: userId } });
    const employee = user && (await this.employees.findByUser(user));
    if (!employee) throw new ForbiddenException(NO_COMPANY);

    // pms.companies has no TypeORM entity, so it is read with a parameterized query.
    const companies: { company_id: string }[] = await this.dataSource.manager.query(
      'SELECT company_id FROM pms.companies WHERE name = $1',
      [employee.company],
    );
    if (companies.length !== 1) throw new ForbiddenException(NO_COMPANY);

    return { companyId: Number(companies[0]!.company_id), actorId: employee.guid ?? null };
  }
}
