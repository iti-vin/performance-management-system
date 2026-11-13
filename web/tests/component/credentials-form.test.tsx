import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { CredentialsForm } from "@/features/auth/components/credentials-form";
import { submitCredentials } from "@/features/auth/services/submit-credentials";

vi.mock("@/features/auth/services/submit-credentials", () => ({
  submitCredentials: vi.fn(),
}));

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

it("clears both fields before navigating after a successful login", async () => {
  vi.mocked(submitCredentials).mockResolvedValueOnce({
    isSuccess: true,
    message: "Logged in.",
  });
  const user = userEvent.setup();
  render(<CredentialsForm mode="login" />);
  const identifier = screen.getByLabelText("Email or username");
  const password = screen.getByLabelText("Password");
  await user.type(identifier, "admin001");
  await user.type(password, "password123");
  await user.click(screen.getByRole("button", { name: "Log in" }));

  expect(identifier).toHaveValue("");
  expect(password).toHaveValue("");
  expect(replace).toHaveBeenCalledWith("/");
});

it("clears login credentials when restoring the page from browser history", async () => {
  const user = userEvent.setup();
  render(<CredentialsForm mode="login" />);
  const identifier = screen.getByLabelText("Email or username");
  const password = screen.getByLabelText("Password");
  await user.type(identifier, "admin001");
  await user.type(password, "password123");

  fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));

  expect(identifier).toHaveValue("");
  expect(password).toHaveValue("");
});

it("shows backend validation on the matching inputs and keeps unmapped messages visible", async () => {
  vi.mocked(submitCredentials).mockResolvedValueOnce({
    message: "The request contains invalid fields.",
    details: [
      { field: "identifier", code: "MAX_LENGTH", message: "Identifier is too long." },
      { field: "password", code: "MIN_LENGTH", message: "Password is too short." },
      { field: "employeeCode", code: "INVALID", message: "Employee code is invalid." },
    ],
  });
  const user = userEvent.setup();
  render(<CredentialsForm mode="login" />);
  const identifier = screen.getByLabelText("Email or username");
  const password = screen.getByLabelText("Password");
  await user.type(identifier, "admin001");
  await user.type(password, "password123");
  await user.click(screen.getByRole("button", { name: "Log in" }));

  expect(await screen.findByText("Identifier is too long.")).toBeVisible();
  expect(identifier).toHaveAccessibleDescription("Identifier is too long.");
  expect(password).toHaveAccessibleDescription("Password is too short.");
  expect(screen.getByText("Employee code is invalid.")).toBeVisible();
  expect(identifier).toHaveValue("admin001");
});

it("marks both login fields invalid and links them to one inline error", async () => {
  const message = "Email, username, or password is incorrect.";
  vi.mocked(submitCredentials).mockResolvedValueOnce({
    message,
    kind: "invalidCredentials",
  });
  const user = userEvent.setup();
  render(<CredentialsForm mode="login" />);
  const identifier = screen.getByLabelText("Email or username");
  const password = screen.getByLabelText("Password");

  expect(identifier).toHaveValue("");
  expect(password).toHaveValue("");
  expect(identifier).toHaveAttribute("autocomplete", "off");
  expect(password).toHaveAttribute("autocomplete", "off");
  await user.type(identifier, "admin001");
  await user.type(password, "wrong-password");
  await user.click(screen.getByRole("button", { name: "Log in" }));

  expect(await screen.findByText(message)).toHaveAttribute(
    "data-slot",
    "field-error",
  );
  expect(identifier).toHaveAttribute("aria-invalid", "true");
  expect(password).toHaveAttribute("aria-invalid", "true");
  expect(identifier).toHaveAccessibleDescription(message);
  expect(password).toHaveAccessibleDescription(message);

  await user.type(password, "1");
  expect(identifier).toHaveAttribute("aria-invalid", "false");
  expect(password).toHaveAttribute("aria-invalid", "false");
  expect(screen.queryByText(message)).not.toBeInTheDocument();
});
