import type { ReactNode } from "react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { WORKSPACE_CONFIG } from "@/constants/workspace-config";
import { WORKSPACE_ROLE_BY_CODE } from "@/constants/workspace-navigation";
import { getCurrentUser } from "@/features/auth/services/current-user";
import { signOut } from "@/features/auth/services/sign-out";
import { WorkspaceLayout } from "@/layouts/workspace-layout";
import WorkspaceLoading from "./loading";

async function AuthenticatedWorkspace({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="mx-auto grid max-w-pms-copy gap-4 px-pms-gutter py-pms-section">
        <h1 className="text-pms-page-title">Session ended</h1>
        <p className="text-pms-body">Log in again to access your workspace.</p>
        <form action={signOut}>
          <Button type="submit">Back to log in</Button>
        </form>
      </main>
    );
  }

  const firstName = user.firstName ?? user.username ?? "there";
  const accountName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.email ||
    "Account";

  return (
    <WorkspaceLayout
      role={WORKSPACE_ROLE_BY_CODE[user.role]}
      departmentName={WORKSPACE_CONFIG.departmentName}
      accountName={accountName}
      firstName={firstName}
      accountEmail={user.email}
    >
      {children}
    </WorkspaceLayout>
  );
}

export default function WorkspaceRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <AuthenticatedWorkspace>{children}</AuthenticatedWorkspace>
    </Suspense>
  );
}
