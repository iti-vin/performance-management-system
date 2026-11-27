import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BehavioralTemplateList } from "@/features/review-templates/components/behavioral-template-list";

const PATH = "/reviews/templates/behavioral-assessment-template";
const ROW = {
  templateId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  company: "Mayon Consolidated Inc.",
  name: "Quarterly Performance Review",
  description: null,
  category: "general_performance" as const,
  reviewType: "self" as const,
  status: "published" as const,
  currentVersion: 2,
  publishedBy: null,
  publishedAt: null,
  archivedAt: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-05T00:00:00.000Z",
  questionCount: 6,
};

describe("BehavioralTemplateList", () => {
  it("keeps six readable columns on a phone: headings wrap, and the table scrolls before a column gets too narrow", () => {
    render(<BehavioralTemplateList templates={[ROW]} />);

    const layout = screen.getByRole("table").closest("[class*='table-fixed']")?.className;
    expect(layout).toContain("[&_table]:min-w-2xl");
    expect(layout).toContain("[&_th]:whitespace-normal");
  });


  it("links each template to its details, named by its name, with its version, category, review type, and status as words", () => {
    render(<BehavioralTemplateList templates={[ROW]} />);

    const row = within(screen.getAllByRole("row")[1]!);
    expect(row.getByRole("link", { name: /Quarterly Performance Review/ }).getAttribute("href")).toBe(
      `${PATH}/${ROW.templateId}`,
    );
    expect(row.getByText("Version 2 · General Performance")).toBeTruthy();
    expect(row.getByText("Self")).toBeTruthy();
    expect(row.getByText("Published")).toBeTruthy();
  });

  it("names a template made before the name column existed by a short id, and shows its missing details as not set", () => {
    render(
      <BehavioralTemplateList
        templates={[{ ...ROW, name: null, category: null, reviewType: null, status: "draft", currentVersion: 1 }]}
      />,
    );

    const row = within(screen.getAllByRole("row")[1]!);
    expect(row.getByRole("link", { name: /Template 3f2504e0/ })).toBeTruthy();
    expect(row.getByText("Draft")).toBeTruthy();
    expect(row.getAllByText("Not set").length).toBe(2);
  });

  it("shows Others for a template with the Others category and review type", () => {
    render(<BehavioralTemplateList templates={[{ ...ROW, category: "others", reviewType: "others" }]} />);

    const row = within(screen.getAllByRole("row")[1]!);
    expect(row.getByText("Version 2 · Others")).toBeTruthy();
    expect(row.getByText("Others")).toBeTruthy();
  });

  it("says there are no templates, and how to start, when the list is empty", () => {
    render(<BehavioralTemplateList templates={[]} />);

    expect(screen.getByText("No behavioral assessment templates yet")).toBeTruthy();
  });
});
