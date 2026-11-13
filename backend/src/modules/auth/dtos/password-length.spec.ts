import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { LoginDto } from "./login.dto.js";
import { RegisterDto } from "./register.dto.js";
import { SignUpDto } from "./sign-up.dto.js";

describe.each([
  { route: "login", dto: LoginDto, fields: { identifier: "janedoe" } },
  { route: "register", dto: RegisterDto, fields: { employeeCode: "E001" } },
  { route: "sign-up", dto: SignUpDto, fields: { employeeCode: "E001", username: "janedoe" } },
])("$route password length", ({ dto, fields }) => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });

  function validatePassword(length: number) {
    const password = "a".repeat(length);
    const body = dto === LoginDto ? { ...fields, password } : { ...fields, password, confirmPassword: password };
    return pipe.transform(body, { type: "body", metatype: dto });
  }

  it.each([8, 16])("accepts %i characters", async (length) => {
    await expect(validatePassword(length)).resolves.toMatchObject({ password: "a".repeat(length) });
  });

  it.each([7, 17])("rejects %i characters", async (length) => {
    await expect(validatePassword(length)).rejects.toThrow(BadRequestException);
  });

  const validBody = dto === LoginDto
    ? { ...fields, password: "password123" }
    : { ...fields, password: "password123", confirmPassword: "password123" };

  it.each(Object.keys(fields))("rejects an empty or whitespace-only %s", async (field) => {
    for (const value of ["", " \t\n "]) {
      await expect(
        pipe.transform({ ...validBody, [field]: value }, { type: "body", metatype: dto }),
      ).rejects.toThrow(BadRequestException);
    }
  });

  it("trims credential identifiers before passing them to the service", async () => {
    const paddedFields = Object.fromEntries(
      Object.entries(fields).map(([field, value]) => [field, `  ${value}  `]),
    );
    await expect(
      pipe.transform({ ...validBody, ...paddedFields }, { type: "body", metatype: dto }),
    ).resolves.toMatchObject(fields);
  });
});

describe("login identifier length", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  const metadata = { type: "body", metatype: LoginDto } as const;

  it("accepts 254 characters after trimming", async () => {
    const identifier = "a".repeat(254);
    await expect(
      pipe.transform({ identifier: ` ${identifier} `, password: "password123" }, metadata),
    ).resolves.toMatchObject({ identifier });
  });

  it("rejects more than 254 characters", async () => {
    await expect(
      pipe.transform({ identifier: "a".repeat(255), password: "password123" }, metadata),
    ).rejects.toThrow(BadRequestException);
  });
});
