import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./controllers/auth.controller.js";
import { AuthService } from "./services/auth.service.js";
import { AccountRegistrationService } from "./services/account-registration.service.js";
import { JwtStrategy } from "./strategies/jwt.strategy.js";
import { User } from "./entities/user.entity.js";
import { Employee } from "./entities/employee.entity.js";
import { UserRole } from "./entities/user-role.entity.js";
import { HREmployee, HREmploymentRecord, HRUser } from "./entities/hrdotnet.entity.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Employee, UserRole]),
    TypeOrmModule.forFeature([HREmployee, HREmploymentRecord, HRUser], "secondaryDB"),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: "1h" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AccountRegistrationService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
