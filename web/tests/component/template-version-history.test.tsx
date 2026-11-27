import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BehavioralTemplatePage from "@/app/(workspace)/reviews/templates/behavioral-assessment-template/[template-id]/page";
import { TemplateVersionHistory, parseTemplateVersion } from "@/features/review-templates/components/template-version-history";
import { getBehavioralTemplate, getBehavioralTemplateVersions } from "@/features/review-templates/services/behavioral-template-reader";

vi.mock("@/features/review-templates/services/behavioral-template-reader", () => ({
  getBehavioralTemplate: vi.fn(),
  getBehavioralTemplateVersions: vi.fn(),
}));
vi.mock("@/features/review-templates/services/manage-behavioral-template", () => ({
  publishBehavioralTemplate: vi.fn(),
  archiveBehavioralTemplate: vi.fn(),
  saveBehavioralTemplateEdits: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), notFound: vi.fn() }));

const ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const versions = [
  { version: 2, publishedAt: "2026-11-26T02:00:00.000Z", publishedByName: "Lebron James", isCurrent: true },
  { version: 1, publishedAt: "2026-11-20T02:00:00.000Z", publishedByName: null, isCurrent: false },
];

describe("TemplateVersionHistory", () => {
  const links = () => within(screen.getByRole("region", { name: "Version history" })).getAllByRole("link");

  it("lists each version with its time and publisher, and links to it", () => {
    render(<TemplateVersionHistory versions={versions} href="/t/1" />);

    expect(links().map((link) => [link.textContent, link.getAttribute("href"), link.getAttribute("aria-current")])).toEqual([
      ["Version 2 (current)", "/t/1", "page"],
      ["Version 1", "/t/1?version=1", null],
    ]);
    expect(screen.getByText("Published Nov 26, 2026 by Lebron James")).toBeTruthy();
    expect(screen.getByText("Published Nov 20, 2026 by Not recorded")).toBeTruthy();
  });

  it("marks the version on the page, and shows nothing without versions", () => {
    const { unmount } = render(<TemplateVersionHistory versions={versions} href="/t/1" shownVersion={1} />);
    expect(links()[1]?.getAttribute("aria-current")).toBe("page");
    unmount();

    render(<TemplateVersionHistory versions={[]} href="/t/1" />);
    expect(screen.queryByRole("region", { name: "Version history" })).toBeNull();
  });

  it.each([
    ["2", 2],
    ["0", undefined],
    ["1.5", undefined],
    ["abc", undefined],
    [undefined, undefined],
  ])("reads the version %s of the address as %s", (raw, expected) => {
    expect(parseTemplateVersion(raw)).toBe(expected);
  });
});

describe("a template page with an older version", () => {
  const tree = {
    template: {
      templateId: ID, company: "Acme", name: "Quarterly", description: null, category: "general_performance", reviewType: "self",
      status: "published", currentVersion: 2, publishedBy: null, publishedAt: null, archivedAt: null,
      createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-05T00:00:00.000Z",
    },
    version: null, sections: [], questions: [], options: [],
  };

  beforeEach(() => {
    vi.mocked(getBehavioralTemplate).mockReset().mockResolvedValue({ kind: "ok", data: tree as never });
    vi.mocked(getBehavioralTemplateVersions).mockReset().mockResolvedValue({ kind: "ok", data: versions });
  });

  it("reads that version, names it, and offers no action", async () => {
    const page = BehavioralTemplatePage({ params: Promise.resolve({ "template-id": ID }), searchParams: Promise.resolve({ version: "1" }) });
    const record = page.props.children;
    render(<>{await record.type(record.props)}</>);

    expect(getBehavioralTemplate).toHaveBeenCalledWith(ID, 1);
    expect(screen.getByText("Version 1", { selector: "span" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Edit/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
    expect(screen.getByRole("region", { name: "Version history" })).toBeTruthy();
  });
});
