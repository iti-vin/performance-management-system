"use client";

import { FormSelect } from "@/components/molecules/form-select";
import { ListingToolbar } from "@/components/molecules/listing-toolbar";

/** Sentinel option value that means "no filter" for a filter. */
export const FILTER_ALL = "__all__";

export interface FilterConfig {
  id: string;
  label: string;
  /** `FILTER_ALL` when no option is chosen. */
  value: string;
  options: readonly { value: string; label: string }[];
  /** Label of the "no filter" option. Defaults to "All". */
  allLabel?: string;
  onChange: (value: string) => void;
}

interface FilterBarProps {
  searchLabel: string;
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  filters: readonly FilterConfig[];
}

/** Search plus select filters. Shows "Clear" only while one is active. */
export function FilterBar({
  searchLabel,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filters,
}: FilterBarProps) {
  const hasActiveFilter =
    searchValue.trim() !== "" ||
    filters.some((filter) => filter.value !== FILTER_ALL);

  return (
    <ListingToolbar
      searchLabel={searchLabel}
      searchValue={searchValue}
      searchPlaceholder={searchPlaceholder}
      onSearchChange={onSearchChange}
      filters={filters.map((filter) => (
        <div key={filter.id} className="w-full min-w-0 sm:w-48">
          <FormSelect
            label={filter.label}
            value={filter.value}
            options={[
              { value: FILTER_ALL, label: filter.allLabel ?? "All" },
              ...filter.options,
            ]}
            onChange={filter.onChange}
          />
        </div>
      ))}
      onClear={
        hasActiveFilter
          ? () => {
              onSearchChange("");
              for (const filter of filters) filter.onChange(FILTER_ALL);
            }
          : undefined
      }
    />
  );
}
