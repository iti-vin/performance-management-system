import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CredentialsForm } from "@/features/auth/components/credentials-form";
import { WorkspaceLayout } from "@/layouts/workspace-layout";

const { loadPage } = vi.hoisted(() => ({ loadPage: vi.fn() }));
vi.mock("@/utils/load-page", () => ({ loadPage }));
vi.mock("@/features/auth/services/submit-credentials", () => ({ submitCredentials: vi.fn() }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

describe("the login page after a signed-in page (CWE-524)", () => {
  beforeEach(() => loadPage.mockReset());

  // The order matters: the first case is a document that never showed the workspace.
  it("stays as it is in a fresh document", () => {
    render(<CredentialsForm />).unmount();

    expect(loadPage).not.toHaveBeenCalled();
  });

  it("loads again in full, so the pages of the last user leave the browser", () => {
    render(
      <WorkspaceLayout role="employee" departmentName="HR" accountName="Iging UserDotTech" firstName="Iging">
        <main>Workspace</main>
      </WorkspaceLayout>,
    ).unmount();

    render(<CredentialsForm />).unmount();

    expect(loadPage).toHaveBeenCalledWith("/login");
  });
});
