import type { Metadata } from "next";

import { BackToLoginLink } from "@/features/auth/components/auth-option-link";
import { CredentialsForm } from "@/features/auth/components/credentials-form";

export const metadata: Metadata = {
  title: "Connect HRDotNet | HRDotNet Performance",
};

export default function RegisterPage() {
  return (
    <>
      <div className="grid gap-1">
        <h1 className="text-pms-page-title">Connect HRDotNet account</h1>
        <p className="text-pms-body text-muted-foreground">
          Use your HRDotNet employee code to create your PMS login.
        </p>
      </div>
      <CredentialsForm mode="register" />
      <BackToLoginLink />
    </>
  );
}
