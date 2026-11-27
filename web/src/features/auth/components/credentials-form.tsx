"use client";

import { useEffect, useId } from "react";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgetListMemory } from "@/components/organisms/list-memory";
import { PasswordInput } from "@/features/auth/components/password-input";
import { useCredentialsForm } from "@/features/auth/hooks/use-credentials-form";
import { leaveSignedInDocument } from "@/utils/signed-in-document";

export function CredentialsForm() {
  const id = useId();
  const {
    isSubmitting,
    errors,
    hasInvalidCredentials,
    isIdentifierInvalid,
    submit,
    fields,
  } = useCredentialsForm();

  // Every way out of a session ends here: the next user starts with no list state of the last one.
  useEffect(() => {
    forgetListMemory();
    leaveSignedInDocument();
  }, []);

  return (
    <form
      method="post"
      autoComplete="off"
      noValidate
      onSubmit={submit}
      className="grid gap-6"
    >
      <FieldGroup className="gap-5">
        <Field data-invalid={isIdentifierInvalid}>
          <FieldLabel htmlFor={`${id}-identifier`}>Email or username</FieldLabel>
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
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
          <PasswordInput
            visibilityLabel="password"
            {...fields.password}
            id={`${id}-password`}
            autoComplete="off"
            required
            readOnly={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? `${id}-password-error` : undefined}
          />
          <FieldError id={`${id}-password-error`} errors={[errors.password]} />
        </Field>
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
        {isSubmitting ? "Please wait…" : "Log in"}
      </Button>
    </form>
  );
}
