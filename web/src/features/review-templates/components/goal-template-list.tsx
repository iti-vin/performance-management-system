import Link from "next/link";
import type { GoalTemplateListResponseDto } from "@pms/shared-types";
import { StatusBadge } from "@/components/atoms/status-badge";
import { DataTable } from "@/components/organisms/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  TEMPLATE_VERSION_STATUS_LABELS,
  TEMPLATE_VERSION_STATUS_TONES,
} from "@/constants/domain-labels";
import { formatPosition } from "@/features/review-templates/services/goal-template-format";
import { formatWorkspaceDate } from "@/utils/workspace-date";
import { GOAL_TEMPLATE_PATH } from "@/constants/goal-template-path";

type GoalTemplateRow = GoalTemplateListResponseDto[number];

// Reserve space for the short metadata columns and let Position take the remainder.
const TABLE_LAYOUT =
  "@container min-w-0 [&_table]:min-w-2xl [&_table]:table-fixed " +
  "[&_th]:px-4 [&_th]:whitespace-normal [&_th]:text-pms-label [&_th]:text-muted-foreground " +
  "[&_td]:px-4 [&_td]:py-3 [&_td]:whitespace-normal " +
  "[&_th:nth-child(1)]:w-1/3 [&_th:nth-child(3)]:w-24 " +
  "[&_th:nth-child(4)]:w-24 [&_th:nth-child(5)]:w-32 " +
  "@4xl:[&_th:nth-child(3)]:w-1/8 @4xl:[&_th:nth-child(4)]:w-1/8 " +
  "@4xl:[&_th:nth-child(1)]:w-2/5 @4xl:[&_th:nth-child(5)]:w-1/6";

export function GoalTemplateList({
  templates,
  isLoading = false,
  isFiltered = false,
}: {
  templates: GoalTemplateListResponseDto;
  isLoading?: boolean;
  /** True while a tab, search, or status filter is on: an empty result is a miss, not "no templates". */
  isFiltered?: boolean;
}) {
  const emptyMessage = isFiltered
    ? "No records match these filters."
    : "No KPI goal templates yet";

  if (!isLoading && templates.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{emptyMessage}</EmptyTitle>
          <EmptyDescription>
            {isFiltered
              ? "Try a different search or change the status filter."
              : "When a template is available, open it here to review its indicators, targets, and weights."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className={TABLE_LAYOUT}>
      <DataTable<GoalTemplateRow>
        caption="KPI goal templates"
        rows={templates}
        isLoading={isLoading}
        getRowId={(row) => row.templateId}
        emptyMessage={emptyMessage}
        columns={[
          {
            // An older template has no name: the position title names it.
            id: "name",
            heading: "Template Name",
            renderCell: (row) => (
              <Link
                href={`${GOAL_TEMPLATE_PATH}/${row.templateId}`}
                className="group/link inline-grid min-h-pms-touch content-center gap-0.5 rounded-pms-control"
              >
                <span className="wrap-anywhere font-semibold text-primary group-hover/link:underline group-focus-visible/link:underline">
                  {row.name ?? formatPosition(row.position)}
                </span>
                <span className="text-pms-label text-muted-foreground">
                  Version {row.currentVersion}
                </span>
              </Link>
            ),
          },
          {
            id: "position",
            heading: "Applicable Position / Role",
            renderCell: (row) => (
              <span className="wrap-anywhere">
                {formatPosition(row.position)}
              </span>
            ),
          },
          {
            id: "indicators",
            heading: "Indicators",
            align: "end",
            renderCell: (row) => row.indicatorCount,
          },
          {
            id: "status",
            heading: "Status",
            renderCell: (row) => (
              <StatusBadge
                label={TEMPLATE_VERSION_STATUS_LABELS[row.status]}
                tone={TEMPLATE_VERSION_STATUS_TONES[row.status]}
              />
            ),
          },
          {
            id: "updated",
            heading: "Last Updated",
            align: "end",
            renderCell: (row) => (
              <span className="text-muted-foreground">
                {formatWorkspaceDate(row.updatedAt)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
