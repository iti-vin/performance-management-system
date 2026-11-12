import { z } from "zod";

/**
 * Every environment variable the API reads, checked once at startup by ConfigModule.
 * The defaults and the required variables are the ones the code already used: this file
 * moves them to one place and changes no behavior.
 */
const envSchema = z.looseObject({
  // App
  PORT: z.coerce.number().default(3000),

  // Main database (PostgreSQL)
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().default(5433),
  POSTGRES_DB: z.string().default("postgres"),
  POSTGRES_USER: z.string().default("postgres"),
  POSTGRES_PASSWORD: z.string().default(""),

  // Secondary database (SQL Server / HRDotNet, read-only)
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(1433),
  DB_DATABASE: z.string().min(1),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_ENCRYPT: z.string().optional(),
  DB_TRUST_SERVER_CERTIFICATE: z.string().optional(),
  DB_CONNECTION_TIMEOUT: z.coerce.number().default(30000),
  DB_REQUEST_TIMEOUT: z.coerce.number().default(30000),

  // JWT. Optional for now: the auth module still falls back to a development secret.
  JWT_ACCESS_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Passed to `ConfigModule.forRoot({ validate })`. Stops the start with the names of the bad variables. */
export function validateEnv(rawEnv: Record<string, unknown>): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment variables:\n  ${problems.join("\n  ")}`);
  }
  return result.data;
}
