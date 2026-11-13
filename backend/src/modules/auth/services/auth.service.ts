import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { roleCodeSchema, type CurrentUserDto } from "@pms/shared-types";

// Entities
import { User } from "../entities/user.entity.js";
import { Employee } from "../entities/employee.entity.js";
import { UserRole } from "../entities/user-role.entity.js";

const MAX_FAILED_LOGINS = 5;
const LOGIN_COOLDOWN_MS = 15 * 60 * 1000;
// Public dummy hash keeps unknown-account failures on the same bcrypt path.
const DUMMY_PASSWORD_HASH = "$2b$10$QrE0aGNOnK5bTuVY3sg9xugTU.8fDihC6pXK/mgW.EiwaN56VmHnW";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(UserRole)
    private readonly userRoles: Repository<UserRole>,

    private readonly jwt: JwtService,

    private readonly dataSource: DataSource,
  ) {}

  async login(identifier: string, password: string) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const user = await this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const account = await users.findOne({
        where: isEmail ? { email: identifier } : { username: identifier },
        lock: { mode: "pessimistic_write" },
      });
      const now = Date.now();
      const isLocked = (account?.loginLockedUntil?.getTime() ?? 0) > now;
      const passwordHash = account && !isLocked ? account.passwordHash : DUMMY_PASSWORD_HASH;
      const matches = await bcrypt.compare(password, passwordHash);
      if (!account || isLocked) return null;

      const previousFailures = account.loginLockedUntil ? 0 : account.failedLoginAttempts;
      const failedLoginAttempts = matches ? 0 : previousFailures + 1;
      const loginLockedUntil = failedLoginAttempts >= MAX_FAILED_LOGINS
        ? new Date(Date.now() + LOGIN_COOLDOWN_MS)
        : null;

      if (failedLoginAttempts !== account.failedLoginAttempts || account.loginLockedUntil) {
        await users.update(account.id, { failedLoginAttempts, loginLockedUntil });
      }
      return matches ? account : null;
    });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user);
  }

  /**
   * The account behind a token. The role is read from the employee record,
   * which is the one AdminRoleGuard checks, so the menu a user sees matches
   * what the API lets that user do. An account with no employee record uses
   * its own role.
   */
  async getCurrentUser(userId: string): Promise<CurrentUserDto> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");

    const employee = await this.employees.findOne({ where: { id: user.employeeId } });
    const role = await this.userRoles.findOne({ where: { id: employee?.userRoleId ?? user.userRoleId } });
    const code = roleCodeSchema.safeParse(role?.code);
    if (!code.success) throw new ForbiddenException("This account has no recognized role");

    return {
      userId: user.id,
      email: user.email || null,
      username: user.username || null,
      role: code.data,
      employeeCode: employee?.code ?? null,
      firstName: employee?.firstName ?? null,
      lastName: employee?.lastName ?? null,
    };
  }

  async refreshToken(token: string) {
    let payload: { sub: string; email?: string; username?: string; type: string };
    try {
      payload = await this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return {
      accessToken: await this.signAccess(user, 7200),
      expiresIn: 2 * 60 * 60,
    };
  }

  private async issueTokens(user: User) {
    const accessToken = await this.signAccess(user);
    return {
      accessToken,
      expiresIn: 3600,
    };
  }

  private async signAccess(user: User, expiresIn?: number) {
    const payload: Record<string, unknown> = {
      sub: user.id,
      type: "access",
    };
    if (user.email) payload.email = user.email;
    if (user.username) payload.username = user.username;
    return this.jwt.sign(payload, {
      expiresIn: expiresIn ?? "1h",
    });
  }

}
