import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-pms-page-title text-balance wrap-break-word">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-pms-copy text-pms-body text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

interface PageHeaderSkeletonProps {
  description?: boolean;
  /** Number of action buttons to mimic. */
  actions?: number;
}

/**
 * Same box model as `PageHeader`. Each bar uses the text class of the line it
 * stands for and `1lh` height, so it tracks the fluid font size.
 */
export function PageHeaderSkeleton({
  description = true,
  actions = 0,
}: PageHeaderSkeletonProps) {
  return (
    <header
      aria-hidden="true"
      className="flex flex-wrap items-start justify-between gap-4"
    >
      <div className="min-w-0">
        <Skeleton className="h-[1lh] w-56 max-w-full text-pms-page-title" />
        {description && (
          <Skeleton className="mt-2 h-[1lh] w-72 max-w-full text-pms-body" />
        )}
      </div>
      {actions > 0 && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {Array.from({ length: actions }, (_, index) => (
            <Skeleton
              key={index}
              className="h-pms-touch w-28 rounded-pms-control"
            />
          ))}
        </div>
      )}
    </header>
  );
}
