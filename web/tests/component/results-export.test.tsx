import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ResultRowDto } from "@pms/shared-types";
import { ResultsTable } from "@/features/review-cycles/components/results-table";
import { resultsCsv } from "@/features/review-cycles/services/results-csv";

const row = (n: number, change: Partial<ResultRowDto> = {}): ResultRowDto => ({
  participantId: `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
  cycleId: "00000000-0000-0000-0000-000000000141",
  cycleName: "CY2026-Q4",
  employeeName: `Person ${n}`,
  position: "Engineer",
  department: n % 2 ? "IT" : "Sales",
  goalsScore: 4.1,
  behavioralScore: null,
  overallScore: 4.505,
  finalizedAt: "2026-11-26T02:00:00.000Z",
  releasedAt: null,
  ...change,
});
const ROWS = Array.from({ length: 14 }, (_, index) => row(index + 1));
const HEADINGS = '"Employee","Position","Department","Review Cycle","Goals","Behavioral","Overall Rating"';

describe("resultsCsv", () => {
  it("writes the headings and one line for each row, with the scores as the table reads them", () => {
    expect(resultsCsv([row(1, { position: null, department: null })]).split("\r\n")).toEqual([
      HEADINGS,
      '"Person 1","","","CY2026-Q4","4.10","Not rated","4.51"',
    ]);
  });

  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "\tx", "\rx"])("keeps a cell that starts like %j from running as a formula (CWE-1236)", (name) => {
    expect(resultsCsv([row(1, { employeeName: name })])).toContain(`"'${name}"`);
  });

  it("doubles a quote, so a name cannot break out of its cell", () => {
    expect(resultsCsv([row(1, { employeeName: 'Ana "A" Cruz, Jr.' })])).toContain('"Ana ""A"" Cruz, Jr."');
  });
});

describe("ResultsTable, list and export (PRD 9.9)", () => {
  async function exported(): Promise<string> {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => (blobs.push(blob), "blob:x"));
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await userEvent.setup().click(screen.getByRole("button", { name: "Export Results" }));

    expect(click).toHaveBeenCalledOnce();
    return (blobs[0] as Blob).text();
  }

  it("pages the rows, and exports every row that matches, not only the page", async () => {
    render(<ResultsTable caption="Results" rows={ROWS} context="cycle" emptyMessage="None." />);

    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect((await exported()).split("\r\n")).toHaveLength(15);
  });

  it("exports exactly the rows that the search lists", async () => {
    render(<ResultsTable caption="Results" rows={ROWS} context="department" emptyMessage="None." />);

    await userEvent.setup().type(screen.getByRole("searchbox"), "person 1");

    const names = (await exported()).split("\r\n").slice(1).map((line) => line.split(",")[0]);
    expect(names).toEqual(['"Person 1"', '"Person 10"', '"Person 11"', '"Person 12"', '"Person 13"', '"Person 14"']);
  });

  it("filters by department", async () => {
    const user = userEvent.setup();
    render(<ResultsTable caption="Results" rows={ROWS} context="department" emptyMessage="None." />);

    await user.click(screen.getByRole("combobox", { name: /department/i }));
    await user.click(await screen.findByRole("option", { name: "Sales" }));

    expect(screen.getAllByRole("row")).toHaveLength(8);
  });

  it("offers no export when nothing is listed", async () => {
    render(<ResultsTable caption="Results" rows={ROWS} context="cycle" emptyMessage="None." />);

    await userEvent.setup().type(screen.getByRole("searchbox"), "nobody");

    expect(screen.queryByRole("button", { name: "Export Results" })).toBeNull();
  });
});
