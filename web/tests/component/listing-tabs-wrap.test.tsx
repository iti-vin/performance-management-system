import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListingTabs } from "@/components/molecules/listing-tabs";

describe("ListingTabs on a narrow screen", () => {
  it("gives each tab its own height, so a second row of tabs stays inside the list", () => {
    render(<ListingTabs label="Sections" tabs={[{ value: "a", label: "Overview" }, { value: "b", label: "History" }]} value="a" onChange={vi.fn()} />);

    // jsdom has no layout: a tab as tall as the whole list is what pushed the second row over the page.
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className.split(" ")).toContain("h-auto");
      expect(tab.className).not.toContain("h-[calc(100%-1px)]");
    }
  });
});
