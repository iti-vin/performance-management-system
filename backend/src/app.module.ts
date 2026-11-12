import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { createObserveModule } from "@nestjs/observe";
import { validateEnv, type Env } from "./config/env.config.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { BehavioralAssessmentModule } from "./modules/behavioral-assessment/behavioral-assessment.module.js";
import { EmployeeModule } from "./modules/employees/employees.module.js";
import { User } from "./modules/auth/entities/user.entity.js";
import { EmployeeDomain } from "./modules/employees/entities/employee-domain.entity.js";
import { BehavioralTemplate } from "./modules/behavioral-assessment/entities/behavioral-template.entity.js";
import { BehavioralTemplateVersion } from "./modules/behavioral-assessment/entities/behavioral-template-version.entity.js";
import { BehavioralSection } from "./modules/behavioral-assessment/entities/behavioral-section.entity.js";
import { BehavioralQuestion } from "./modules/behavioral-assessment/entities/behavioral-question.entity.js";
import { BehavioralChoiceOption } from "./modules/behavioral-assessment/entities/behavioral-choice-option.entity.js";
import { KpiGoalsModule } from "./modules/kpi-goals/kpi-goals.module.js";
import { KpiGoalTemplate } from "./modules/kpi-goals/entities/kpi-goal-template.entity.js";
import { KpiTemplateVersion } from "./modules/kpi-goals/entities/kpi-template-version.entity.js";
import { KpiIndicator } from "./modules/kpi-goals/entities/kpi-indicator.entity.js";
import { KpiIndicatorScale } from "./modules/kpi-goals/entities/kpi-indicator-scale.entity.js";
import { KpiIndicatorMatrixRow } from "./modules/kpi-goals/entities/kpi-indicator-matrix-row.entity.js";
import { KpiIndicatorMatrixColumn } from "./modules/kpi-goals/entities/kpi-indicator-matrix-column.entity.js";
import { HREmployee, HREmploymentRecord, HRUser } from "./modules/auth/entities/hrdotnet.entity.js";
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),

    // MAIN DATABASE (postgres)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        type: "postgres",
        autoLoadEntities: true,
        host: config.get("POSTGRES_HOST", { infer: true }),
        port: config.get("POSTGRES_PORT", { infer: true }),
        database: config.get("POSTGRES_DB", { infer: true }),
        username: config.get("POSTGRES_USER", { infer: true }),
        password: config.get("POSTGRES_PASSWORD", { infer: true }),
        entities: [
          User,
          EmployeeDomain,
          BehavioralTemplate,
          BehavioralTemplateVersion,
          BehavioralSection,
          BehavioralQuestion,
          BehavioralChoiceOption,
          KpiGoalTemplate,
          KpiTemplateVersion,
          KpiIndicatorScale,
          KpiIndicator,
          KpiIndicatorMatrixColumn,
          KpiIndicatorMatrixRow,
        ],
        synchronize: true,
      }),
    }),

    // SECONDARY DATABASE (MSSQL / HRDotNet, read-only)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: "secondaryDB",
      // The required variables and the timeouts are checked in config/env.config.ts.
      useFactory: (config: ConfigService<Env, true>) => {
        const connectTimeout = config.get("DB_CONNECTION_TIMEOUT", { infer: true });
        const requestTimeout = config.get("DB_REQUEST_TIMEOUT", { infer: true });

        return {
          type: "mssql" as const,
          host: config.get("DB_HOST", { infer: true }),
          port: config.get("DB_PORT", { infer: true }),
          username: config.get("DB_USERNAME", { infer: true }),
          password: config.get("DB_PASSWORD", { infer: true }),
          database: config.get("DB_DATABASE", { infer: true }),
          options: {
            encrypt: config.get("DB_ENCRYPT", { infer: true }) === "true",
            trustServerCertificate: config.get("DB_TRUST_SERVER_CERTIFICATE", { infer: true }) === "true",
            connectTimeout,
            requestTimeout,
          },
          connectionTimeout: connectTimeout,
          requestTimeout,
          pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
          entities: [HREmployee, HREmploymentRecord, HRUser],
          synchronize: false,
        };
      },
    }),

    // LIST OF MODULES
    AuthModule,
    BehavioralAssessmentModule,
    EmployeeModule,
    KpiGoalsModule,

    ObserveModule.forRoot({ appKey: "YOUR_APP_KEY", appSecret: "YOUR_APP_SECRET", serviceId: "pms" }),
  ],
})
export class AppModule {}
