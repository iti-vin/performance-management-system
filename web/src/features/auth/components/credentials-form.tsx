"use client";

import { useId } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/features/auth/components/password-input";
import { useCredentialsForm } from "@/features/auth/hooks/use-credentials-form";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/services/auth-credentials";
import type { AuthMode } from "@/features/auth/services/auth-credentials";

export function CredentialsForm({ mode }: { mode: AuthMode }) {
  const id = useId();
  const {
    isLogin,
    isSignUp,
    isSubmitting,
    doneMessage,
    errors,
    hasInvalidCredentials,
    isIdentifierInvalid,
    submit,
    fields,
  } = useCredentialsForm(mode);

  if (doneMessage) {
    return (
      <Alert>
        <CircleCheck aria-hidden="true" />
        <AlertTitle>Account created</AlertTitle>
        <AlertDescription>{doneMessage}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      method="post"
      autoComplete={isLogin ? "off" : undefined}
      noValidate
      onSubmit={submit}
      className={isSignUp ? "grid gap-4" : "grid gap-6"}
    >
      <FieldGroup className={isSignUp ? "gap-3" : "gap-5"}>
        {!isLogin ? (
          <>
            <Field data-invalid={Boolean(errors.employeeCode)}>
              <FieldLabel htmlFor={`${id}-employee-code`}>
                Employee code
              </FieldLabel>
              <Input
                {...fields.employeeCode}
                id={`${id}-employee-code`}
                autoComplete="off"
                required
                readOnly={isSubmitting}
                aria-invalid={Boolean(errors.employeeCode)}
                aria-describedby={
                  errors.employeeCode ? `${id}-employee-code-error` : undefined
                }
                className="min-h-pms-touch"
              />
              <FieldError
                id={`${id}-employee-code-error`}
                errors={[errors.employeeCode]}
              />
            </Field>
            {isSignUp && (
              <Field data-invalid={Boolean(errors.username)}>
                <FieldLabel htmlFor={`${id}-username`}>Username</FieldLabel>
                <Input
                  {...fields.username}
                  id={`${id}-username`}
                  autoComplete="username"
                  required
                  readOnly={isSubmitting}
                  aria-invalid={Boolean(errors.username)}
                  aria-describedby={
                    errors.username ? `${id}-username-error` : undefined
                  }
                  className="min-h-pms-touch"
                />
                <FieldError
                  id={`${id}-username-error`}
                  errors={[errors.username]}
                />
              </Field>
            )}
          </>
        ) : (
          <Field data-invalid={isIdentifierInvalid}>
            <FieldLabel htmlFor={`${id}-identifier`}>
              Email or username
            </FieldLabel>
            <Input
              {...fields.identifier}
              id={`${id}-identifier`}
              autoComplete="off"
              required
              readOnly={isSubmitting}
              aria-invalid={isIdentifierInvalid}
              aria-describedby={
                errors.identifier
                  ? `${id}-identifier-error`
                  : hasInvalidCredentials
                    ? `${id}-password-error`
                    : undefined
              }
              className="min-h-pms-touch"
            />
            <FieldError
              id={`${id}-identifier-error`}
              errors={[errors.identifier]}
            />
          </Field>
        )}
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
          <PasswordInput
            visibilityLabel="password"
            {...fields.password}
            id={`${id}-password`}
            autoComplete={isLogin ? "off" : "new-password"}
            required
            readOnly={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password
                ? `${id}-password-error`
                : !isLogin
                  ? `${id}-password-hint`
                  : undefined
            }
          />
          {!isLogin && !errors.password && (
            <p
              id={`${id}-password-hint`}
              className="text-pms-label text-muted-foreground"
            >
              Use {MIN_PASSWORD_LENGTH} to {MAX_PASSWORD_LENGTH} characters.
            </p>
          )}
          <FieldError id={`${id}-password-error`} errors={[errors.password]} />
        </Field>
        {!isLogin && (
          <Field data-invalid={Boolean(errors.confirmPassword)}>
            <FieldLabel htmlFor={`${id}-confirm`}>Confirm password</FieldLabel>
            <PasswordInput
              visibilityLabel="confirmation password"
              {...fields.confirmPassword}
              id={`${id}-confirm`}
              autoComplete="new-password"
              required
              readOnly={isSubmitting}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={
                errors.confirmPassword ? `${id}-confirm-error` : undefined
              }
            />
            <FieldError
              id={`${id}-confirm-error`}
              errors={[errors.confirmPassword]}
            />
          </Field>
        )}
      </FieldGroup>
      {errors.root?.message && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="min-h-pms-touch w-full"
      >
        {isSubmitting && <Spinner aria-hidden="true" role="presentation" />}
        {isSubmitting
          ? "Please wait…"
          : isLogin
            ? "Log in"
            : isSignUp
              ? "Create account"
              : "Connect account"}
      </Button>
    </form>
  );
}
