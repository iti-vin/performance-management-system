import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AccomplishmentPage from "@/app/(workspace)/goals/[accomplishment-id]/page";
import { RecordContent } from "@/app/(workspace)/goals/[accomplishment-id]/record-content";
import { accomplishmentDetail, ACCOMPLISHMENT_ID as ID, SPRINT } from "../utils/accomplishment";

const { push, notFound, getAccomplishment, saveAccomplishment, submitAccomplishment, decideAccomplishment } = vi.hoisted(() => ({
  push: vi.fn(),
  notFound: vi.fn(),
  getAccomplishment: vi.fn(),
  saveAccomplishment: vi.fn(),
  submitAccomplishment: vi.fn(),
  decideAccomplishment: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), notFound }));
vi.mock("@/features/position-goals/services/accomplishment-reader", () => ({ getAccomplishment }));
vi.mock("@/features/position-goals/services/accomplishment-response", () => ({
  saveAccomplishment: async (...args: unknown[]) => saveAccomplishment(...args),
  submitAccomplishment: async (...args: unknown[]) => submitAccomplishment(...args),
  decideAccomplishment: async (...args: unknown[]) => decideAccomplishment(...args),
}));

const params = Promise.resolve({ "accomplishment-id": ID });
const TAKEN = { message: null, fieldErrors: {} };

async function renderContent() {
  render(<>{await RecordContent({ params })}</>);
}

beforeEach(() => {
  for (const mock of [push, notFound, getAccomplishment, saveAccomplishment, submitAccomplishment, decideAccomplishment]) {
    mock.mockReset();
  }
  getAccomplishment.mockResolvedValue({ kind: "ok", data: accomplishmentDetail() });
  for (const mock of [saveAccomplishment, submitAccomplishment, decideAccomplishment]) mock.mockResolvedValue(TAKEN);
});

describe("RecordContent", () => {
  it("reads the record of the route and saves for it", async () => {
    await renderContent();
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Actual result for Sprint completion" }), "91");
    await user.click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(getAccomplishment).toHaveBeenCalledWith(ID);
    await waitFor(() =>
      expect(saveAccomplishment).toHaveBeenCalledWith(
        ID,
        expect.objectContaining({ actuals: expect.arrayContaining([{ indicatorId: SPRINT, actualValue: 91, remarks: "" }]) }),
      ),
    );
  });

  it("decides for the record of the route", async () => {
    getAccomplishment.mockResolvedValue({
      kind: "ok",
      data: accomplishmentDetail({ status: "submitted", canEdit: false, canSubmit: false, canDecide: true }),
    });
    await renderContent();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Verify Accomplishments" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(decideAccomplishment).toHaveBeenCalledWith(ID, { outcome: "verified", reason: "" }));
  });

  it("is the not-found page for a record that the caller may not see", async () => {
    getAccomplishment.mockResolvedValue({ kind: "not_found" });
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(RecordContent({ params })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each([
    ["signed_out", "Session ended"],
    ["unavailable", "Goals are unavailable"],
  ])("shows a notice when the read says %s", async (kind, title) => {
    getAccomplishment.mockResolvedValue({ kind });
    await renderContent();

    expect(screen.getByRole("alert")).toHaveTextContent(title);
    expect(screen.queryByRole("button", { name: "Back to Goals" })).toBeNull();
  });
});

describe("AccomplishmentPage", () => {
  it("names the page and says that it loads", () => {
    render(<AccomplishmentPage params={new Promise(() => {})} />);

    expect(screen.getByRole("heading", { level: 1, name: "Goals" })).toBeTruthy();
    expect(screen.getByRole("status")).toHaveTextContent("Loading the report.");
  });
});
