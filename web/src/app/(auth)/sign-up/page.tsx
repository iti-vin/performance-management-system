import type { Metadata } from "next";

import { BackToLoginLink } from "@/features/auth/components/auth-option-link";
import { CredentialsForm } from "@/features/auth/components/credentials-form";

export const metadata: Metadata = { title: "Sign up | HRDotNet Performance" };

export default function SignUpPage() {
  return (
    <>
      <div className="grid gap-1">
        <h1 className="text-pms-page-title">Create a PMS login</h1>
        <p className="text-pms-body text-muted-foreground">
          Use the employee code your administrator added to PMS.
        </p>
      </div>
      <CredentialsForm mode="sign-up" />
      <BackToLoginLink />
    </>
  );
}
