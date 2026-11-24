import { z } from "zod";

/** Environment variables checked at startup by ConfigModule. */
const envSchema = z.looseObject({
  // App
  PORT: z.coerce.number().default(3000),

  // Main database (PostgreSQL)
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().default(5433),
  POSTGRES_DB: z.string().default("postgres"),
  POSTGRES_USER: z.string().default("postgres"),
  POSTGRES_PASSWORD: z.string().default(""),

  JWT_ACCESS_SECRET: z.string().refine((secret) => secret.trim().length > 0, "Must not be blank"),
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
