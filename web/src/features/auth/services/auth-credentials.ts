import {
  loginRequestSchema,
  registerRequestSchema,
  signUpRequestSchema,
} from "@pms/shared-types";

export { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@pms/shared-types";

export type AuthMode = "login" | "sign-up" | "register";

/** The exact body of POST auth/login, or null when the input is not valid. */
export function parseLogin(input: unknown) {
  const result = loginRequestSchema.safeParse(input);
  return result.success ? result.data : null;
}

/** The exact body of POST auth/sign-up, or null when the input is not valid. */
export function parseSignUp(input: unknown) {
  const result = signUpRequestSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function parseRegister(input: unknown) {
  const result = registerRequestSchema.safeParse(input);
  return result.success ? result.data : null;
}
