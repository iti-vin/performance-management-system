import { describe, expect, it } from "vitest";
import { validateEnv } from "./env.config.js";

// A fresh set per test: the one variable the app cannot start without.
const requiredEnv = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  JWT_ACCESS_SECRET: "test-only-signing-key",
  ...overrides,
});

describe("validateEnv", () => {
  it("keeps the defaults the code used before", () => {
    expect(validateEnv(requiredEnv())).toMatchObject({
      PORT: 3000,
      POSTGRES_HOST: "localhost",
      POSTGRES_PORT: 5433,
      POSTGRES_DB: "postgres",
      POSTGRES_USER: "postgres",
      POSTGRES_PASSWORD: "",
    });
  });

  it("starts without the old HRDotNet SQL Server variables", () => {
    const env = validateEnv(requiredEnv());
    for (const name of ["DB_HOST", "DB_PORT", "DB_DATABASE", "DB_USERNAME", "DB_PASSWORD", "DB_REQUEST_TIMEOUT"]) {
      expect(env).not.toHaveProperty(name);
    }
  });

  it("reads numbers from text and keeps variables it does not list", () => {
    const env = validateEnv(requiredEnv({ POSTGRES_PORT: "5500", SMTP_HOST: "mail.example.test" }));
    expect(env.POSTGRES_PORT).toBe(5500);
    expect(env).toMatchObject({ SMTP_HOST: "mail.example.test" });
  });

  it("stops the start when a port is not a number", () => {
    expect(() => validateEnv(requiredEnv({ POSTGRES_PORT: "soon" }))).toThrow("POSTGRES_PORT");
  });

  it.each([undefined, "", "   "])("rejects a missing or blank JWT secret (%j)", (secret) => {
    expect(() => validateEnv(requiredEnv({ JWT_ACCESS_SECRET: secret }))).toThrow("JWT_ACCESS_SECRET");
  });
});
