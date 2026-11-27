import { act, render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useListMemory } from "@/components/organisms/list-memory";
import { CredentialsForm } from "@/features/auth/components/credentials-form";

vi.mock("@/features/auth/services/submit-credentials", () => ({ submitCredentials: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

describe("the login page and the lists of the last user (CWE-200)", () => {
  const list = () => renderHook(() => useListMemory("Participants", { query: "" }));

  it("forgets what a list remembered, however the user reached the login page", () => {
    const before = list();
    act(() => before.result.current[1]({ query: "Iging" }));
    before.unmount();

    render(<CredentialsForm />).unmount();

    expect(list().result.current[0]).toEqual({ query: "" });
  });
});
