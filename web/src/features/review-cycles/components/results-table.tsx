"use client";

import type { ResultRowDto } from "@pms/shared-types";
import { DownloadIcon } from "lucide-react";
import Link from "next/link";

import { PersonCell } from "@/components/molecules/person-cell";
import { FilteredTable } from "@/components/organisms/filtered-table";
import { Button } from "@/components/ui/button";
import { formatScore } from "@/features/review-cycles/services/result-words";
import { resultsCsv } from "@/features/review-cycles/services/results-csv";

interface ResultsTableProps {
  caption: string;
  rows: readonly ResultRowDto[];
  emptyMessage: string;
  /** The second column: the department of one cycle, or the cycle of a list across cycles. */
  context: "department" | "cycle";
}

const optionsOf = (values: readonly string[]) => [...new Set(values)].sort().map((value) => ({ value, label: value }));

/** Saves the rows as a file in the browser. The rows are the ones the caller already reads. */
function download(rows: readonly ResultRowDto[]) {
  // The byte order mark tells a spreadsheet that the file is UTF-8.
  const url = URL.createObjectURL(new Blob([`\uFEFF${resultsCsv(rows)}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "results.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/** Finalized results with search, filters, pages, and an export, each with a way to its evidence. */
export function ResultsTable({ caption, rows, emptyMessage, context }: ResultsTableProps) {
  const isCycle = context === "cycle";
  const department = {
    id: "department",
    label: "Department",
    allLabel: "All departments",
    options: optionsOf(rows.flatMap((row) => row.department ?? [])),
    matches: (row: ResultRowDto, value: string) => row.department === value,
  };
  const cycle = {
    id: "cycle",
    label: "Review Cycle",
    allLabel: "All cycles",
    options: optionsOf(rows.map((row) => row.cycleName)),
    matches: (row: ResultRowDto, value: string) => row.cycleName === value,
  };

  return (
    <FilteredTable
      caption={caption}
      listKey={isCycle ? caption : `${caption}:${rows[0]?.cycleId ?? ""}`}
      rows={rows}
      getRowId={(row) => row.participantId}
      searchPlaceholder="Search by employee"
      searchText={(row) => row.employeeName}
      filters={isCycle ? [cycle, department] : [department]}
      emptyMessage={emptyMessage}
      noMatchMessage="No result matches your search."
      actions={(matching) => (
        <Button type="button" variant="outline" className="min-h-pms-touch w-fit rounded-pms-control" onClick={() => download(matching)}>
          <DownloadIcon aria-hidden="true" />
          Export Results
        </Button>
      )}
      columns={[
        {
          id: "employee",
          heading: "Employee",
          renderCell: (row) => <PersonCell name={row.employeeName} subtitle={row.position ?? undefined} />,
        },
        {
          id: context,
          heading: isCycle ? "Review Cycle" : "Department",
          renderCell: (row) => (isCycle ? row.cycleName : (row.department ?? "Not set")),
        },
        { id: "goals", heading: "Goals", renderCell: (row) => formatScore(row.goalsScore) },
        { id: "behavioral", heading: "Behavioral", renderCell: (row) => formatScore(row.behavioralScore) },
        { id: "overall", heading: "Overall Rating", renderCell: (row) => formatScore(row.overallScore) },
        {
          id: "action",
          heading: "Action",
          renderCell: (row) => (
            <Link
              href={`/reviews/results/${row.participantId}${isCycle ? "" : "?from=cycle"}`}
              className="inline-grid min-h-pms-touch content-center rounded-pms-control font-medium text-primary hover:underline focus-visible:underline"
            >
              View Results{" "}
              <span className="sr-only">of {row.employeeName}</span>
            </Link>
          ),
        },
      ]}
    />
  );
}
