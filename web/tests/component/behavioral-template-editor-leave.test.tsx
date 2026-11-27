import { Activity, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BehavioralTemplateEditor } from "@/features/review-templates/components/behavioral-template-editor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const BACK = "/reviews/templates/behavioral-assessment-template";
const BACK_LINK = /back to behavioral assessment templates/i;

beforeEach(() => {
  push.mockReset();
});

function renderEditor() {
  return render(<BehavioralTemplateEditor backHref={BACK} onSave={vi.fn()} />);
}

describe("BehavioralTemplateEditor, leaving the page", () => {
  it("goes back without a prompt while nothing changed", async () => {
    renderEditor();

    await userEvent.setup().click(screen.getByRole("link", { name: BACK_LINK }));

    expect(screen.queryByText("Leave without saving?")).toBeNull();
  });

  it("asks before it leaves with unsaved changes, and goes back only on Leave", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(screen.getByLabelText(/template name/i), "Quarterly");
    await user.click(screen.getByRole("link", { name: BACK_LINK }));

    expect(await screen.findByText("Leave without saving?")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(push).toHaveBeenCalledWith(BACK);
  });

  it("keeps what the user typed when the user stays", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.type(screen.getByLabelText(/template name/i), "Quarterly");
    await user.click(screen.getByRole("link", { name: BACK_LINK }));

    await user.click(await screen.findByRole("button", { name: "Keep editing" }));

    expect(push).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/template name/i) as HTMLInputElement).value).toBe("Quarterly");
  });

  it("asks the browser to confirm a tab close only after an edit", async () => {
    const user = userEvent.setup();
    renderEditor();

    const untouched = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(untouched);
    expect(untouched.defaultPrevented).toBe(false);

    await user.type(screen.getByLabelText(/template name/i), "Quarterly");

    const edited = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(edited);
    expect(edited.defaultPrevented).toBe(true);
  });

  it("has no prompt on the details page, which has nothing to edit", async () => {
    render(<BehavioralTemplateEditor readOnly backHref={BACK} onSave={vi.fn()} />);

    await userEvent.setup().click(screen.getByRole("link", { name: BACK_LINK }));

    expect(screen.queryByText("Leave without saving?")).toBeNull();
  });

  it("starts over when Next keeps the page and hides it, so a return shows a blank builder", async () => {
    const user = userEvent.setup();
    function Host() {
      const [visible, setVisible] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setVisible((value) => !value)}>
            toggle
          </button>
          <Activity mode={visible ? "visible" : "hidden"}>
            <BehavioralTemplateEditor backHref={BACK} onSave={vi.fn()} />
          </Activity>
        </>
      );
    }
    render(<Host />);
    await user.type(screen.getByLabelText(/template name/i), "Quarterly");

    await user.click(screen.getByRole("button", { name: "toggle" }));
    await user.click(screen.getByRole("button", { name: "toggle" }));

    expect((screen.getByLabelText(/template name/i) as HTMLInputElement).value).toBe("");
    const stillDirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(stillDirty);
    expect(stillDirty.defaultPrevented).toBe(false);
  });

  it("returns an edited template to the one it opened with", async () => {
    const user = userEvent.setup();
    function Host() {
      const [visible, setVisible] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setVisible((value) => !value)}>
            toggle
          </button>
          <Activity mode={visible ? "visible" : "hidden"}>
            <BehavioralTemplateEditor
              backHref={BACK}
              onSave={vi.fn()}
              initialTemplate={{
                name: "Saved name",
                description: "",
                category: "general_performance",
                reviewType: "self",
                sections: [],
              }}
            />
          </Activity>
        </>
      );
    }
    render(<Host />);
    await user.type(screen.getByLabelText(/template name/i), " edited");

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));

    expect((screen.getByLabelText(/template name/i) as HTMLInputElement).value).toBe("Saved name");
  });
});
