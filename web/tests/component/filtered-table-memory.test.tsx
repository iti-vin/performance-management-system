import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FilteredTable } from "@/components/organisms/filtered-table";

const rows = Array.from({ length: 25 }, (_, index) => ({ id: String(index + 1), name: `Row ${index + 1}`, even: index % 2 === 1 }));
const table = (listKey?: string) => (
  <FilteredTable
    caption="Numbers"
    listKey={listKey}
    rows={rows}
    columns={[{ id: "name", heading: "Name", renderCell: (row: (typeof rows)[number]) => row.name }]}
    getRowId={(row) => row.id}
    searchPlaceholder="Search numbers"
    searchText={(row) => row.name}
    filters={[]}
    tabs={[
      { value: "all", label: "All" },
      { value: "even", label: "Even", matches: (row) => row.even },
    ]}
    emptyMessage="No rows."
    noMatchMessage="No match."
  />
);

describe("FilteredTable, on return (PRD 2.4)", () => {
  it("keeps the tab, the search, and the page when the list is shown again", async () => {
    const user = userEvent.setup();
    const first = render(table());
    await user.click(screen.getByRole("tab", { name: "Even" }));
    await user.type(screen.getByRole("searchbox"), "row");
    await user.click(screen.getByRole("button", { name: /next/i }));
    first.unmount();

    render(table());

    expect(screen.getByRole("tab", { name: "Even" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("searchbox")).toHaveValue("row");
    expect(screen.getByText("Row 22")).toBeTruthy();
    expect(screen.queryByText("Row 2")).toBeNull();
  });

  it("keeps each list apart by its key", async () => {
    const user = userEvent.setup();
    const first = render(table("cycle-a"));
    await user.type(screen.getByRole("searchbox"), "row 3");
    first.unmount();

    const other = render(table("cycle-b"));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    other.unmount();

    render(table("cycle-a"));
    expect(screen.getByRole("searchbox")).toHaveValue("row 3");
  });
});
