import { z } from "zod";
import { roleCodeSchema } from "../domain/role-code.enum.js";

/**
 * Contracts of backend/src/modules/auth. Field names follow the backend DTO
 * classes. The backend uses a ValidationPipe with forbidNonWhitelisted, so a
 * request with any extra field is rejected: send exactly these fields.
 */

/** Password length limits for login, sign-up, and registration. */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 16;

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH)
  .max(MAX_PASSWORD_LENGTH);

/** POST auth/login. `identifier` is an email or a username. */
export const loginRequestSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: passwordSchema,
});
export type LoginRequestDto = z.infer<typeof loginRequestSchema>;

/** POST auth/sign-up. The employee must already exist in the employee table. */
export const signUpRequestSchema = z
  .object({
    employeeCode: z.string().trim().min(1),
    username: z.string().trim().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type SignUpRequestDto = z.infer<typeof signUpRequestSchema>;

/** POST auth/register. The backend assigns the employee role. */
export const registerRequestSchema = z
  .object({
    employeeCode: z.string().trim().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type RegisterRequestDto = z.infer<typeof registerRequestSchema>;

/** POST auth/refresh-token. Works only while the access token has not expired. */
export const refreshTokenRequestSchema = z.object({
  accessToken: z.string().min(1).max(4096),
});
export type RefreshTokenRequestDto = z.infer<typeof refreshTokenRequestSchema>;

/** Response of auth/login and auth/refresh-token. `expiresIn` is in seconds. */
export const authTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
});
export type AuthTokenResponseDto = z.infer<typeof authTokenResponseSchema>;

/** Response of auth/sign-up and auth/register. No token: the user logs in next. */
export const accountCreatedResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    code: z.string().nullable(),
    firstName: z.string(),
    lastName: z.string(),
    company: z.string().nullable(),
    department: z.string().nullable(),
    position: z.string().nullable(),
    status: z.string().nullable(),
  }),
});
export type AccountCreatedResponseDto = z.infer<
  typeof accountCreatedResponseSchema
>;

/**
 * GET auth/me. The account, its role, and the name of its employee record.
 * `employeeCode`, `firstName`, and `lastName` are null for an account with no
 * employee record.
 */
export const currentUserDtoSchema = z.object({
  userId: z.string(),
  email: z.string().nullable(),
  username: z.string().nullable(),
  role: roleCodeSchema,
  employeeCode: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});
export type CurrentUserDto = z.infer<typeof currentUserDtoSchema>;
