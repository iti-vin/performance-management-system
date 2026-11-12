import { describe, expect, it } from "vitest";
import { validateEnv } from "./env.config.js";

// A fresh set per test: the four variables the SQL Server connection cannot start without.
const requiredEnv = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  DB_HOST: "sql.example.test",
  DB_DATABASE: "hr",
  DB_USERNAME: "reader",
  DB_PASSWORD: "example-password",
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
      DB_PORT: 1433,
      DB_CONNECTION_TIMEOUT: 30000,
      DB_REQUEST_TIMEOUT: 30000,
    });
  });

  it("reads numbers from text and keeps variables it does not list", () => {
    const env = validateEnv(requiredEnv({ DB_PORT: "1500", SMTP_HOST: "mail.example.test" }));
    expect(env.DB_PORT).toBe(1500);
    expect(env).toMatchObject({ SMTP_HOST: "mail.example.test" });
  });

  it.each(["DB_HOST", "DB_DATABASE", "DB_USERNAME", "DB_PASSWORD"])(
    "stops the start when %s is missing or empty",
    (name) => {
      expect(() => validateEnv(requiredEnv({ [name]: undefined }))).toThrow(name);
      expect(() => validateEnv(requiredEnv({ [name]: "" }))).toThrow(name);
    },
  );

  it("stops the start when a timeout is not a number", () => {
    expect(() => validateEnv(requiredEnv({ DB_REQUEST_TIMEOUT: "soon" }))).toThrow("DB_REQUEST_TIMEOUT");
  });

  it("leaves the JWT secret optional, as the auth module still has its own fallback", () => {
    expect(validateEnv(requiredEnv()).JWT_ACCESS_SECRET).toBeUndefined();
  });
});
