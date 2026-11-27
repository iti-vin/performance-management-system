import type { ReactNode } from "react";
import { ListingPaginationSkeleton } from "@/components/molecules/listing-pagination";
import { ListingToolbarSkeleton } from "@/components/molecules/listing-toolbar";
import {
  PageHeader,
  PageHeaderSkeleton,
} from "@/components/molecules/page-header";
import { DataTableSkeleton } from "@/components/organisms/data-table";

/** Shared with `ListingPageSkeleton` so the two never drift apart. */
const PAGE_CLASS = "grid w-full min-w-0 gap-4 px-3 py-6";
const CARD_CLASS =
  "grid min-w-0 gap-4 rounded-pms-card border border-border bg-card p-4 text-card-foreground";
const TOOLBAR_CLASS = "flex min-w-0 flex-wrap items-end gap-3";
const FOOTER_CLASS =
  "flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-border pt-4";

interface ListingPageTemplateProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function ListingPageTemplate({
  title,
  description,
  actions,
  toolbar,
  children,
  footer,
}: ListingPageTemplateProps) {
  return (
    <div className={PAGE_CLASS}>
      <PageHeader title={title} description={description} actions={actions} />
      <div className={CARD_CLASS}>
        {toolbar && (
          <div data-slot="listing-toolbar" className={TOOLBAR_CLASS}>
            {toolbar}
          </div>
        )}
        <div className="min-w-0">{children}</div>
        {footer && <footer className={FOOTER_CLASS}>{footer}</footer>}
      </div>
    </div>
  );
}

interface ListingPageSkeletonProps {
  description?: boolean;
  actions?: number;
  filters?: number;
  /** Real column headings when known, otherwise `columns` bars. */
  headings?: readonly string[];
  columns?: number;
  rows?: number;
  selectable?: boolean;
}

/** Loading state with the same header, card, toolbar, table, and footer as the page. */
export function ListingPageSkeleton({
  description = true,
  actions = 1,
  filters = 2,
  headings,
  columns = 5,
  rows = 8,
  selectable = false,
}: ListingPageSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className={PAGE_CLASS}>
      <span className="sr-only">Loading</span>
      <PageHeaderSkeleton description={description} actions={actions} />
      <div className={CARD_CLASS}>
        <div className={TOOLBAR_CLASS}>
          <ListingToolbarSkeleton filters={filters} />
        </div>
        <div className="min-w-0">
          <DataTableSkeleton
            headings={headings}
            columnCount={columns}
            rows={rows}
            selectable={selectable}
          />
        </div>
        <footer className={FOOTER_CLASS}>
          <ListingPaginationSkeleton />
        </footer>
      </div>
    </div>
  );
}
