"use client";

import { useId, useState } from "react";

import { ListingPagination } from "@/components/molecules/listing-pagination";
import { PersonCell } from "@/components/molecules/person-cell";
import { ListingToolbar } from "@/components/molecules/listing-toolbar";
import { DataTable } from "@/components/organisms/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";  
import type { ReviewCycleOptionsDto } from "@pms/shared-types";

const PAGE_SIZES = [10, 20, 50] as const;

type Participant = ReviewCycleOptionsDto["employees"][number];

interface ParticipantSelectionProps {
  /** The employees that the API offers: active, in the company, with a GUID. */
  employees: readonly Participant[];
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
}

export function ParticipantSelection({
  employees,
  selectedIds,
  onSelectionChange,
}: ParticipantSelectionProps) {
  const headingId = useId();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  const query = search.trim().toLowerCase();
  const filteredEmployees = employees.filter(
    (employee) =>
      (department === null || employee.department === department) &&
      (position === null || employee.position === position) &&
      [employee.name, employee.department, employee.position ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filteredEmployees.length / pageSize)),
  );
  const firstRow = (currentPage - 1) * pageSize;
  const selected = new Set(selectedIds);
  const hasFilters = search !== "" || department !== null || position !== null;

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-4">
      <div className="grid gap-2">
        <h2 id={headingId} className="text-pms-section-title">
          Select Employees
        </h2>
        <p className="max-w-pms-copy text-pms-body text-muted-foreground">
          Select existing HRDotNet employees. Selection persists across filters and pages.
        </p>
      </div>

      <ListingToolbar
        searchLabel="Search Employees"
        searchPlaceholder="Search employees..."
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filters={
          <>
            {(
              [
                {
                  field: "department",
                  label: "Department",
                  value: department,
                  setValue: setDepartment,
                },
                {
                  field: "position",
                  label: "Position",
                  value: position,
                  setValue: setPosition,
                },
              ] as const
            ).map(({ field, label, value, setValue }) => {
              const filterId = `${headingId}-${field}`;
              const options = [
                ...new Set(
                  employees.flatMap((employee) => employee[field] ?? []),
                ),
              ].sort();
              const allLabel =
                field === "department" ? "All departments" : "All positions";

              return (
                <Field key={field} className="w-auto min-w-0 max-w-full gap-2">
                  <FieldLabel htmlFor={filterId} className="text-pms-label">
                    {label}
                  </FieldLabel>
                  <Select
                    value={value ?? ""}
                    onValueChange={(nextValue) => {
                      setValue(nextValue || null);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger
                      id={filterId}
                      className="min-h-pms-touch max-w-full rounded-pms-control"
                    >
                      <SelectValue className="min-w-0">
                        {value ?? allLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value="">{allLabel}</SelectItem>
                      {options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              );
            })}
          </>
        }
        onClear={
          hasFilters
            ? () => {
                setSearch("");
                setDepartment(null);
                setPosition(null);
                setPage(1);
              }
            : undefined
        }
      />

      <p
        role="status"
        className="text-pms-label tabular-nums text-muted-foreground"
      >
        {selected.size} selected
      </p>

      <DataTable
        caption="Employees eligible for this review cycle"
        getRowId={(employee) => employee.employeeId}
        rows={filteredEmployees.slice(firstRow, firstRow + pageSize)}
        emptyMessage={
          employees.length === 0
            ? "No eligible employees available."
            : "No employees match your filters."
        }
        columns={[
          {
            id: "select",
            heading: "Select",
            renderCell: (employee) => (
              <div className="grid size-pms-touch place-items-center">
                <Checkbox
                  aria-label={`Select ${employee.name}`}
                  checked={selected.has(employee.employeeId)}
                  className="after:inset-auto after:size-pms-touch"
                  onCheckedChange={(checked) =>
                    onSelectionChange(
                      checked
                        ? [...selected, employee.employeeId]
                        : selectedIds.filter((id) => id !== employee.employeeId),
                    )
                  }
                />
              </div>
            ),
          },
          {
            id: "name",
            heading: "Employee",
            renderCell: (employee) => <PersonCell name={employee.name} subtitle={employee.position ?? undefined} />,
          },
          {
            id: "code",
            heading: "Employee ID",
            renderCell: (employee) => employee.employeeCode,
          },
          {
            id: "department",
            heading: "Department",
            renderCell: (employee) => employee.department,
          },
          {
            id: "position",
            heading: "Position",
            renderCell: (employee) => employee.position ?? "No position",
          },
          {
            id: "manager",
            heading: "Manager",
            renderCell: (employee) => employee.managerName ?? "Not set",
          },
        ]}
      />

      {filteredEmployees.length > 0 && (
        <ListingPagination
          page={currentPage}
          pageSize={pageSize}
          pageSizes={PAGE_SIZES}
          totalRows={filteredEmployees.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

    </section>
  );
}
