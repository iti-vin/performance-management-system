"use client";

import type { ReactNode } from "react";
import { SearchField } from "@/components/molecules/search-field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ListingToolbarProps {
  searchLabel: string;
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
  onClear?: () => void;
}

export function ListingToolbar({
  searchLabel,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filters,
  onClear,
}: ListingToolbarProps) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-end gap-2">
      <SearchField
        label={searchLabel}
        value={searchValue}
        placeholder={searchPlaceholder}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
      />
      {filters}
      {onClear && (
        <Button
          type="button"
          variant="ghost"
          className="min-h-pms-touch rounded-pms-control text-pms-label"
          onClick={onClear}
        >
          Clear
        </Button>
      )}
    </div>
  );
}

/** Search field and filter selects: label line above a touch-height control. */
export function ListingToolbarSkeleton({ filters = 2 }: { filters?: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex w-full min-w-0 flex-wrap items-end gap-2"
    >
      {Array.from({ length: filters + 1 }, (_, index) => (
        <div
          key={index}
          className={`grid min-w-0 gap-2 ${index === 0 ? "w-full sm:w-64" : "w-full sm:w-48"}`}
        >
          <Skeleton className="h-[1lh] w-20 text-pms-label" />
          <Skeleton className="h-pms-touch w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
