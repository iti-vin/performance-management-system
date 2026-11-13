import type { Metadata } from "next";

import { AuthOptionLink } from "@/features/auth/components/auth-option-link";
import { CredentialsForm } from "@/features/auth/components/credentials-form";

export const metadata: Metadata = { title: "Log in | HRDotNet Performance" };

export default function LoginPage() {
  return (
    <>
      <div className="grid gap-1">
        <h1 className="text-pms-page-title">Log in</h1>
        <p className="text-pms-body text-muted-foreground">
          Use your email or username to access your workspace.
        </p>
      </div>
      <CredentialsForm mode="login" />
      <section
        aria-labelledby="first-time-heading"
        className="grid gap-2 border-t border-border pt-5"
      >
        <h2 id="first-time-heading" className="text-pms-label font-semibold">
          Set up your account
        </h2>
        <AuthOptionLink
          href="/register"
          title="Connect HRDotNet account"
          description="Use an employee code from HRDotNet."
        />
        <AuthOptionLink
          href="/sign-up"
          title="Create a PMS login"
          description="For employees already added to PMS."
        />
      </section>
    </>
  );
}
