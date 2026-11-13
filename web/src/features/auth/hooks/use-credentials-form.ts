"use client";

import type { FocusEvent } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RegisterOptions } from "react-hook-form";
import { useForm } from "react-hook-form";

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/services/auth-credentials";
import type { AuthMode } from "@/features/auth/services/auth-credentials";
import { submitCredentials } from "@/features/auth/services/submit-credentials";

interface CredentialsFields {
  identifier: string;
  employeeCode: string;
  username: string;
  password: string;
  confirmPassword: string;
}

const REQUIRED_TEXT = (message: string) => ({
  required: message,
  validate: (value: string) => value.trim() !== "" || message,
});

export function useCredentialsForm(mode: AuthMode) {
  const router = useRouter();
  const isLogin = mode === "login";
  const isSignUp = mode === "sign-up";
  const [doneMessage, setDoneMessage] = useState("");
  const {
    register,
    getFieldState,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isSubmitted, isSubmitting },
  } = useForm<CredentialsFields>({
    mode: "onTouched",
    defaultValues: isLogin ? { identifier: "", password: "" } : undefined,
  });
  const hasInvalidCredentials = errors.password?.type === "invalidCredentials";
  const isIdentifierInvalid = Boolean(errors.identifier) || hasInvalidCredentials;

  useEffect(() => {
    if (!isLogin) return;

    function resetRestoredLogin(event: PageTransitionEvent) {
      if (event.persisted) reset();
    }

    window.addEventListener("pageshow", resetRestoredLogin);
    return () => window.removeEventListener("pageshow", resetRestoredLogin);
  }, [isLogin, reset]);

  function clearInvalidCredentials() {
    if (getFieldState("password").error?.type === "invalidCredentials") {
      clearErrors("password");
    }
  }

  function registerCredentialField(
    name: keyof CredentialsFields,
    options: RegisterOptions<CredentialsFields, keyof CredentialsFields>,
  ) {
    const field = register(name, options);
    return {
      ...field,
      onBlur(event: FocusEvent<HTMLInputElement>) {
        if (
          event.currentTarget.value !== "" ||
          getFieldState(name).isTouched ||
          isSubmitted
        ) {
          return field.onBlur(event);
        }
      },
    };
  }

  const submit = handleSubmit(async (fields) => {
    const account = {
      employeeCode: fields.employeeCode,
      password: fields.password,
      confirmPassword: fields.confirmPassword,
    };
    const result = await submitCredentials(
      mode,
      isLogin
        ? { identifier: fields.identifier, password: fields.password }
        : isSignUp
          ? { ...account, username: fields.username }
          : account,
    );
    if (result.isSuccess) {
      if (isLogin) {
        reset();
        router.replace("/");
        return;
      }
      setDoneMessage(result.message);
      return;
    }
    if (isLogin && result.kind === "invalidCredentials") {
      setError(
        "password",
        { type: result.kind, message: result.message },
        { shouldFocus: true },
      );
      return;
    }
    const visibleFields: (keyof CredentialsFields)[] = isLogin
      ? ["identifier", "password"]
      : ["employeeCode", "password", "confirmPassword"];
    if (isSignUp) visibleFields.push("username");
    const fieldMessages = new Map<keyof CredentialsFields, Set<string>>();
    const formMessages = new Set<string>();
    for (const { field, message } of result.details ?? []) {
      const input = visibleFields.find((name) => name === field);
      if (!input) {
        formMessages.add(message);
        continue;
      }
      const messages = fieldMessages.get(input) ?? new Set<string>();
      messages.add(message);
      fieldMessages.set(input, messages);
    }
    for (const [field, messages] of fieldMessages) {
      setError(field, {
        type: "server",
        message: [...messages].join(" "),
      });
    }
    if (formMessages.size || !fieldMessages.size) {
      setError("root", { message: [...formMessages].join(" ") || result.message });
    }
  });

  return {
    isLogin,
    isSignUp,
    isSubmitting,
    doneMessage,
    errors,
    hasInvalidCredentials,
    isIdentifierInvalid,
    submit,
    fields: {
      employeeCode: isLogin
        ? undefined
        : registerCredentialField("employeeCode", REQUIRED_TEXT("Enter your employee code.")),
      username: isSignUp
        ? registerCredentialField("username", REQUIRED_TEXT("Choose a username."))
        : undefined,
      identifier: isLogin
        ? registerCredentialField("identifier", {
            ...REQUIRED_TEXT("Enter your email or username."),
            onChange: clearInvalidCredentials,
          })
        : undefined,
      password: registerCredentialField("password", {
        required: "Enter your password.",
        minLength: {
          value: MIN_PASSWORD_LENGTH,
          message: `Enter at least ${MIN_PASSWORD_LENGTH} characters.`,
        },
        maxLength: {
          value: MAX_PASSWORD_LENGTH,
          message: `Enter no more than ${MAX_PASSWORD_LENGTH} characters.`,
        },
        onChange: () => {
          clearInvalidCredentials();
          if (
            !isLogin &&
            (getFieldState("confirmPassword").isTouched || isSubmitted)
          ) {
            void trigger("confirmPassword");
          }
        },
      }),
      confirmPassword: isLogin
        ? undefined
        : registerCredentialField("confirmPassword", {
            required: "Confirm your password.",
            validate: (value, values) =>
              value === values.password || "Passwords must match.",
          }),
    },
  };
}
