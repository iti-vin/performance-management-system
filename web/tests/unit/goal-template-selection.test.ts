import { describe, expect, it } from "vitest";
import {
  buildGoalTemplateHref,
  parseGoalTemplateParams,
  selectGoalTemplates,
  type GoalTemplateListParams,
} from "@/features/review-templates/services/goal-template-selection";

interface Item {
  id: string;
  status: "draft" | "published" | "archived";
  name: string | null;
  position: string | null;
}

const DEFAULTS: GoalTemplateListParams = {
  tab: "all",
  status: "all",
  q: "",
  page: 1,
  pageSize: 10,
};

function item(
  id: string,
  status: Item["status"],
  title: string | null,
  name: string | null = null,
): Item {
  return { id, status, name, position: title };
}

const ITEMS = [
  item("1", "published", "UI/UX Designer"),
  item("2", "draft", "Marketing Specialist"),
  item("3", "archived", "Software Engineer"),
  item("4", "published", "Software Engineer"),
  item("5", "draft", null),
];

function ids(params: Partial<GoalTemplateListParams>) {
  return selectGoalTemplates(ITEMS, { ...DEFAULTS, ...params }).rows.map((row) => row.id);
}

describe("parseGoalTemplateParams", () => {
  it("returns the defaults for no params", () => {
    expect(parseGoalTemplateParams({})).toEqual(DEFAULTS);
  });

  it("reads valid params and trims the search", () => {
    expect(
      parseGoalTemplateParams({
        tab: "draft",
        status: "archived",
        q: "  engineer ",
        page: "3",
        pageSize: "20",
      }),
    ).toEqual({ tab: "draft", status: "archived", q: "engineer", page: 3, pageSize: 20 });
  });

  it("falls back to the defaults for invalid values", () => {
    expect(
      parseGoalTemplateParams({ tab: "x", status: "y", page: "0", pageSize: "7" }),
    ).toEqual(DEFAULTS);
    expect(parseGoalTemplateParams({ page: "1.5" }).page).toBe(1);
    expect(parseGoalTemplateParams({ page: "abc" }).page).toBe(1);
  });

  it("takes the first value of a repeated param and caps the search length", () => {
    expect(parseGoalTemplateParams({ tab: ["published", "draft"] }).tab).toBe("published");
    expect(parseGoalTemplateParams({ q: "a".repeat(500) }).q).toHaveLength(100);
  });
});

describe("selectGoalTemplates", () => {
  it("shows every status, archived included, on the All tab", () => {
    expect(ids({})).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("filters the All tab by status", () => {
    expect(ids({ status: "archived" })).toEqual(["3"]);
  });

  it("ignores the status filter on the Draft and Published tabs", () => {
    expect(ids({ tab: "draft", status: "archived" })).toEqual(["2", "5"]);
    expect(ids({ tab: "published", status: "archived" })).toEqual(["1", "4"]);
  });

  it("searches the position title without regard to case", () => {
    expect(ids({ q: "SOFTWARE" })).toEqual(["3", "4"]);
  });

  it("searches the template name as well as the position title", () => {
    const named = [
      item("1", "draft", "Software Engineer", "Backend Performance Goals"),
      item("2", "draft", "Marketing Specialist", null),
    ];

    const byName = selectGoalTemplates(named, { ...DEFAULTS, q: "backend" });
    const byTitle = selectGoalTemplates(named, { ...DEFAULTS, q: "marketing" });

    expect(byName.rows.map((row) => row.id)).toEqual(["1"]);
    expect(byTitle.rows.map((row) => row.id)).toEqual(["2"]);
  });

  it("combines the tab and the search", () => {
    expect(ids({ tab: "published", q: "engineer" })).toEqual(["4"]);
  });

  it("pages the rows", () => {
    const many = Array.from({ length: 23 }, (_, index) =>
      item(String(index + 1), "draft", "Role"),
    );

    const second = selectGoalTemplates(many, { ...DEFAULTS, page: 2 });

    expect(second.rows).toHaveLength(10);
    expect(second).toMatchObject({ total: 23, page: 2 });
  });

  it("clamps a page past the end to the last page", () => {
    const many = Array.from({ length: 23 }, (_, index) =>
      item(String(index + 1), "draft", "Role"),
    );

    const result = selectGoalTemplates(many, { ...DEFAULTS, page: 99 });

    expect(result).toMatchObject({ page: 3, total: 23 });
    expect(result.rows).toHaveLength(3);
  });

  it("reports an empty result", () => {
    expect(selectGoalTemplates(ITEMS, { ...DEFAULTS, q: "nothing" })).toMatchObject({
      rows: [],
      total: 0,
      page: 1,
    });
  });
});

describe("buildGoalTemplateHref", () => {
  const PATH = "/reviews/templates/kpi-goal-template";

  it("leaves the defaults out of the URL", () => {
    expect(buildGoalTemplateHref(PATH, DEFAULTS)).toBe(PATH);
  });

  it("writes only the params that differ from the defaults", () => {
    expect(
      buildGoalTemplateHref(PATH, { ...DEFAULTS, tab: "draft", q: "eng ineer", page: 2 }),
    ).toBe(`${PATH}?tab=draft&q=eng+ineer&page=2`);
  });
});
