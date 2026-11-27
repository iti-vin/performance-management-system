import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReviewCycleSavedNotice } from "@/features/review-cycles/components/review-cycle-saved-notice";

describe("ReviewCycleSavedNotice", () => {
  it("says the cycle was saved as a draft, and that it is not launched", () => {
    render(<ReviewCycleSavedNotice saved="draft" />);

    expect(screen.getByRole("status").textContent).toContain("Cycle saved as a draft");
    expect(screen.getByRole("status").textContent).toContain("not launched");
  });

  it("says the cycle was updated", () => {
    render(<ReviewCycleSavedNotice saved="updated" />);

    expect(screen.getByRole("status").textContent).toContain("Cycle updated");
  });

  it("says the cycle was launched, and that its assignments exist", () => {
    render(<ReviewCycleSavedNotice saved="launched" />);

    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain("Cycle launched");
    expect(notice.textContent).toContain("assignments");
  });

  it("says the cycle was cancelled", () => {
    render(<ReviewCycleSavedNotice saved="cancelled" />);

    expect(screen.getByRole("status").textContent).toContain("Cycle cancelled");
  });

  it.each([undefined, "", "published", "toString", "constructor", "__proto__", ["draft", "draft"]])("says nothing for the flag %j", (saved) => {
    render(<ReviewCycleSavedNotice saved={saved} />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
